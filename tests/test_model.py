"""
Tests for Tremor AI Model Training and Inference Pipeline
"""

import os
import pytest
import numpy as np
import pandas as pd

from src.data_loader import generate_synthetic_dataset, load_dataset
from src.model import train_and_evaluate_models, load_trained_model, predict_window
from src.features import extract_window_features


@pytest.fixture(scope="module")
def sample_dataset(tmp_path_factory):
    data_dir = str(tmp_path_factory.mktemp("test_raw_data"))
    generate_synthetic_dataset(data_dir, num_pd=3, num_healthy=3, num_other=2, duration_sec=15.0)
    df, meta = load_dataset(data_dir)
    return df, data_dir


def test_model_training_and_metrics_integrity(sample_dataset, tmp_path):
    df, _ = sample_dataset
    models_dir = str(tmp_path / "models")

    # Run model training
    report = train_and_evaluate_models(df, models_dir=models_dir, random_state=42)

    # 1. Report structure
    assert "random_forest" in report
    assert "svm" in report
    rf_res = report["random_forest"]

    # 2. Check live metrics exist and are within valid bounds
    assert 0.0 <= rf_res["test_accuracy"] <= 1.0
    assert 0.0 <= rf_res["test_f1_score"] <= 1.0
    assert "confusion_matrix" in rf_res
    assert "feature_importances" in rf_res

    # 3. Artifact files created
    assert os.path.exists(os.path.join(models_dir, "tremor_ai_rf_model.joblib"))
    assert os.path.exists(os.path.join(models_dir, "scaler.joblib"))
    assert os.path.exists(os.path.join(models_dir, "model_metrics.json"))

    # 4. Load persisted model and run inference
    model, scaler, loaded_metrics = load_trained_model(models_dir)
    mock_features = {
        "dominant_frequency": 4.9,
        "tremor_band_power": 0.08,
        "tremor_power_ratio": 0.65,
        "signal_amplitude_rms": 0.22,
        "peak_to_peak_amplitude": 0.55,
        "jerk_rms": 5.2,
        "spectral_entropy": 0.32,
        "gyro_tremor_power": 18.0,
        "harmonic_ratio": 0.15
    }
    pred = predict_window(model, scaler, mock_features)
    assert "predicted_label" in pred
    assert pred["predicted_label"] in ["pd", "healthy", "other"]
    assert 0.0 <= pred["confidence"] <= 1.0
    assert 0.0 <= pred["pd_probability"] <= 1.0

    # 5. Idle / Stationary sensor gate validation
    idle_features = {
        "dominant_frequency": 0.0,
        "tremor_band_power": 0.00002,
        "tremor_power_ratio": 0.05,
        "signal_amplitude_rms": 0.012,
        "peak_to_peak_amplitude": 0.035,
        "jerk_rms": 0.65,
        "spectral_entropy": 0.88,
        "gyro_tremor_power": 0.001,
        "harmonic_ratio": 0.1
    }
    pred_idle = predict_window(model, scaler, idle_features)
    assert pred_idle["predicted_label"] == "healthy"
    assert pred_idle["pd_probability"] == 0.0
