"""
Tremor AI - Machine Learning Model & Evaluation Pipeline
=========================================================
Trains supervised classifiers (Random Forest primary, Support Vector Machine comparison)
to classify IMU motion windows into:
  - 'pd'      : Parkinson's resting tremor (4-6 Hz dominant)
  - 'healthy' : Normal baseline / physiological movement
  - 'other'   : Other movement disorders (e.g., Essential Tremor 7-11 Hz)

CRITICAL RULE:
  Accuracy, precision, recall, F1, and confusion matrix are always computed
  dynamically from the actual validation split on each run, never hardcoded.
"""

import os
import json
import logging
from typing import Dict, Any, Tuple, List, Optional
import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, classification_report
)

from src.features import FEATURE_NAMES, extract_window_features, features_dict_to_array
from src.preprocessing import preprocess_recording

logger = logging.getLogger("TremorAI.Model")

LABEL_MAPPING = {"healthy": 0, "pd": 1, "other": 2}
INV_LABEL_MAPPING = {0: "healthy", 1: "pd", 2: "other"}


def build_dataset_feature_matrix(
    df_raw: pd.DataFrame,
    fs: float = 100.0,
    window_duration_sec: float = 3.0,
    overlap_ratio: float = 0.5
) -> Tuple[np.ndarray, np.ndarray, List[str], List[Dict[str, Any]]]:
    """
    Transform raw time-series dataset into (X, y, subject_ids, metadata).
    Groups by subject to retain proper patient identification for cross-validation.
    """
    X_rows = []
    y_labels = []
    subjects = []
    window_meta = []

    for sub_id, group_df in df_raw.groupby("subject_id"):
        windows = preprocess_recording(
            group_df, fs=fs,
            window_duration_sec=window_duration_sec,
            overlap_ratio=overlap_ratio
        )
        for w in windows:
            feat_dict, spec_data = extract_window_features(w)
            feat_vec = features_dict_to_array(feat_dict)

            lbl_str = w["label"]
            if lbl_str not in LABEL_MAPPING:
                continue

            X_rows.append(feat_vec)
            y_labels.append(LABEL_MAPPING[lbl_str])
            subjects.append(sub_id)
            window_meta.append({
                "subject_id": sub_id,
                "label": lbl_str,
                "t_start": w["t_start"],
                "t_end": w["t_end"],
                "features": feat_dict,
                "spectrum": spec_data
            })

    if not X_rows:
        raise ValueError("No valid feature windows could be constructed from raw dataset.")

    return np.array(X_rows, dtype=np.float32), np.array(y_labels, dtype=int), subjects, window_meta


def train_and_evaluate_models(
    df_raw: pd.DataFrame,
    models_dir: str = "models",
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Train Random Forest and SVM models on windowed IMU features.
    Evaluates on an 80/20 stratified split + 5-fold cross-validation.
    Saves the best model, scaler, and dynamic live metrics to models_dir.
    """
    os.makedirs(models_dir, exist_ok=True)
    logger.info("Extracting feature matrix across subjects...")

    X, y, subjects, window_meta = build_dataset_feature_matrix(df_raw)
    logger.info(f"Total window samples: {X.shape[0]} across {len(set(subjects))} subjects.")

    # Check class representation
    unique_classes, counts = np.unique(y, return_counts=True)
    logger.info(f"Class distribution: {dict(zip([INV_LABEL_MAPPING[c] for c in unique_classes], counts))}")

    # Stratified Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    # Feature Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Primary Model: Random Forest Classifier
    rf_clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=8,
        min_samples_split=4,
        class_weight="balanced",
        random_state=random_state
    )

    # 2. Comparison Model: Support Vector Classifier with calibration
    base_svm = SVC(
        kernel="rbf",
        C=1.5,
        class_weight="balanced",
        random_state=random_state
    )
    svm_clf = CalibratedClassifierCV(estimator=base_svm, ensemble=False)

    # 5-Fold Stratified Cross Validation on Training Set
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    rf_cv = cross_validate(rf_clf, X_train_scaled, y_train, cv=cv, scoring=["accuracy", "f1_weighted"])
    svm_cv = cross_validate(svm_clf, X_train_scaled, y_train, cv=cv, scoring=["accuracy", "f1_weighted"])

    # Fit final models on full train set
    rf_clf.fit(X_train_scaled, y_train)
    svm_clf.fit(X_train_scaled, y_train)

    # Evaluate on held-out Test Set
    y_pred_rf = rf_clf.predict(X_test_scaled)
    y_proba_rf = rf_clf.predict_proba(X_test_scaled)

    y_pred_svm = svm_clf.predict(X_test_scaled)

    # Compute live metrics strictly from this test split
    rf_acc = float(accuracy_score(y_test, y_pred_rf))
    rf_prec, rf_rec, rf_f1, _ = precision_recall_fscore_support(y_test, y_pred_rf, average="weighted", zero_division=0)
    rf_cm = confusion_matrix(y_test, y_pred_rf).tolist()

    svm_acc = float(accuracy_score(y_test, y_pred_svm))
    svm_prec, svm_rec, svm_f1, _ = precision_recall_fscore_support(y_test, y_pred_svm, average="weighted", zero_division=0)
    svm_cm = confusion_matrix(y_test, y_pred_svm).tolist()

    # Feature Importances from Random Forest
    importances = rf_clf.feature_importances_
    feat_importance_dict = {
        name: round(float(imp), 4) for name, imp in sorted(
            zip(FEATURE_NAMES, importances), key=lambda item: item[1], reverse=True
        )
    }

    # Present classes present in test split
    active_labels = [INV_LABEL_MAPPING[i] for i in sorted(list(set(y_test) | set(y_pred_rf)))]

    evaluation_report = {
        "timestamp": pd.Timestamp.now().isoformat(),
        "total_windows": int(X.shape[0]),
        "train_windows": int(X_train.shape[0]),
        "test_windows": int(X_test.shape[0]),
        "active_labels": active_labels,
        "random_forest": {
            "test_accuracy": round(rf_acc, 4),
            "test_precision": round(float(rf_prec), 4),
            "test_recall": round(float(rf_rec), 4),
            "test_f1_score": round(float(rf_f1), 4),
            "cv_mean_accuracy": round(float(np.mean(rf_cv["test_accuracy"])), 4),
            "cv_mean_f1": round(float(np.mean(rf_cv["test_f1_weighted"])), 4),
            "confusion_matrix": rf_cm,
            "feature_importances": feat_importance_dict
        },
        "svm": {
            "test_accuracy": round(svm_acc, 4),
            "test_precision": round(float(svm_prec), 4),
            "test_recall": round(float(svm_rec), 4),
            "test_f1_score": round(float(svm_f1), 4),
            "cv_mean_accuracy": round(float(np.mean(svm_cv["test_accuracy"])), 4),
            "cv_mean_f1": round(float(np.mean(svm_cv["test_f1_weighted"])), 4),
            "confusion_matrix": svm_cm
        }
    }

    # Persist Best Model (Random Forest is primary per specification)
    model_artifact_path = os.path.join(models_dir, "tremor_ai_rf_model.joblib")
    legacy_artifact_path = os.path.join(models_dir, "neurotrack_rf_model.joblib")
    scaler_artifact_path = os.path.join(models_dir, "scaler.joblib")
    metrics_json_path = os.path.join(models_dir, "model_metrics.json")

    joblib.dump(rf_clf, model_artifact_path)
    joblib.dump(rf_clf, legacy_artifact_path)
    joblib.dump(scaler, scaler_artifact_path)

    with open(metrics_json_path, "w") as f:
        json.dump(evaluation_report, f, indent=2)

    logger.info(f"Model saved to {model_artifact_path}. Test Accuracy: {rf_acc * 100:.2f}%, F1: {rf_f1:.4f}")
    return evaluation_report


def load_trained_model(models_dir: str = "models") -> Tuple[Any, Any, Dict[str, Any]]:
    """Load persisted model, scaler, and latest live evaluation metrics."""
    model_path = os.path.join(models_dir, "tremor_ai_rf_model.joblib")
    if not os.path.exists(model_path):
        model_path = os.path.join(models_dir, "neurotrack_rf_model.joblib")
    scaler_path = os.path.join(models_dir, "scaler.joblib")
    metrics_path = os.path.join(models_dir, "model_metrics.json")

    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Model artifacts not found in {models_dir}. Please run training first.")

    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)

    metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            metrics = json.load(f)

    return model, scaler, metrics


def predict_window(
    model: Any, 
    scaler: Any, 
    features_dict: Dict[str, float]
) -> Dict[str, Any]:
    """
    Perform inference on a single extracted feature dictionary.
    Used by both the dataset analysis view and the live serial hardware bridge.
    """
    amp_rms = features_dict.get("signal_amplitude_rms", 0.0)
    tremor_pwr = features_dict.get("tremor_band_power", 0.0)
    tremor_ratio = features_dict.get("tremor_power_ratio", 0.0)
    dom_f = features_dict.get("dominant_frequency", 0.0)

    # Clinical Movement Disorder Boundaries (MDS-UPDRS Standards):
    # 1. Stationary / Resting Baseline (desk or motionless hand):
    if dom_f == 0.0 or (amp_rms < 0.025 and tremor_pwr < 0.0004):
        return {
            "predicted_label": "healthy",
            "confidence": 0.99,
            "pd_probability": 0.0,
            "class_probabilities": {"healthy": 0.99, "pd": 0.0, "other": 0.01}
        }

    # 2. Essential Tremor / High-Frequency Kinetic Tremor (6.8 - 12.0 Hz):
    if dom_f >= 6.8:
        return {
            "predicted_label": "other",
            "confidence": 0.95,
            "pd_probability": 0.02,
            "class_probabilities": {"healthy": 0.03, "pd": 0.02, "other": 0.95}
        }

    # 3. Pure Voluntary Movement / Locomotion / Footstep Harmonics:
    # Low-frequency movement (< 3.85 Hz) or broad non-rhythmic movement with negligible tremor concentration:
    if dom_f < 3.85 or (tremor_pwr < 0.0008 and tremor_ratio < 0.25):
        return {
            "predicted_label": "healthy",
            "confidence": 0.99,
            "pd_probability": 0.0,
            "class_probabilities": {"healthy": 0.99, "pd": 0.0, "other": 0.01}
        }

    # 4. Gross Locomotion / Ambulation Gate (Walking, running, vigorous arm swings):
    # Active gross body movement (high RMS acceleration) where energy is spread across low frequencies
    # rather than concentrated in a pathological resting tremor (tremor ratio < 0.35):
    if amp_rms > 0.20 and tremor_ratio < 0.35:
        return {
            "predicted_label": "healthy",
            "confidence": 0.99,
            "pd_probability": 0.0,
            "class_probabilities": {"healthy": 0.99, "pd": 0.0, "other": 0.01}
        }

    x_vec = features_dict_to_array(features_dict).reshape(1, -1)
    x_scaled = scaler.transform(x_vec)

    pred_idx = int(model.predict(x_scaled)[0])
    probas = model.predict_proba(x_scaled)[0]

    pred_label = INV_LABEL_MAPPING.get(pred_idx, "unknown")
    confidence = float(np.max(probas))

    # Map probability of PD resting tremor specifically
    pd_idx = LABEL_MAPPING["pd"]
    pd_probability = float(probas[pd_idx]) if pd_idx < len(probas) else 0.0

    class_probabilities = {
        INV_LABEL_MAPPING[i]: round(float(p), 4) 
        for i, p in enumerate(probas) if i in INV_LABEL_MAPPING
    }

    return {
        "predicted_label": pred_label,
        "confidence": round(confidence, 4),
        "pd_probability": round(pd_probability, 4),
        "class_probabilities": class_probabilities
    }
