"""
Tremor AI - Data Ingestion & Synthetic Fallback Generator
=========================================================
Provides a source-agnostic loader for wearable IMU motion datasets (e.g., PADS, UCI,
or custom recordings) and generates high-fidelity synthetic fallback datasets when
raw clinical recordings are not locally present.

Standardized Schema:
  - subject_id : string (e.g., "PD_01", "HC_03", "ET_02")
  - label      : string ("pd", "healthy", "other")
  - timestamp  : float (seconds from start of recording)
  - accel_x    : float (acceleration in g, X-axis)
  - accel_y    : float (acceleration in g, Y-axis)
  - accel_z    : float (acceleration in g, Z-axis)
  - gyro_x     : float (angular velocity in deg/s, X-axis)
  - gyro_y     : float (angular velocity in deg/s, Y-axis)
  - gyro_z     : float (angular velocity in deg/s, Z-axis)
  - is_synthetic: bool (True if generated synthetically)
"""

import os
import glob
import json
import logging
from typing import Tuple, Dict, Any, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger("TremorAI.DataLoader")

REQUIRED_COLUMNS = [
    "subject_id", "label", "timestamp",
    "accel_x", "accel_y", "accel_z",
    "gyro_x", "gyro_y", "gyro_z"
]

# Column mapping dictionary to normalize varied public dataset naming schemes
COLUMN_ALIASES = {
    "accel_x": ["accel_x", "acc_x", "ax", "accelerometer_x", "x_accel", "linear_accel_x"],
    "accel_y": ["accel_y", "acc_y", "ay", "accelerometer_y", "y_accel", "linear_accel_y"],
    "accel_z": ["accel_z", "acc_z", "az", "accelerometer_z", "z_accel", "linear_accel_z"],
    "gyro_x":  ["gyro_x", "gyr_x", "gx", "gyroscope_x", "x_gyro", "angular_vel_x"],
    "gyro_y":  ["gyro_y", "gyr_y", "gy", "gyroscope_y", "y_gyro", "angular_vel_y"],
    "gyro_z":  ["gyro_z", "gyr_z", "gz", "gyroscope_z", "z_gyro", "angular_vel_z"],
    "timestamp": ["timestamp", "time", "t", "timestamp_ms", "time_sec", "ts"],
    "subject_id": ["subject_id", "patient_id", "id", "subject", "user_id"],
    "label": ["label", "diagnosis", "class", "condition", "group"]
}


def normalize_columns(df: pd.DataFrame, default_subject: str = "Unknown", default_label: str = "unknown") -> pd.DataFrame:
    """Map arbitrary column names to the standardized Tremor AI schema."""
    df_clean = df.copy()
    col_mapping = {}
    lower_cols = {col.lower(): col for col in df_clean.columns}

    for target_col, aliases in COLUMN_ALIASES.items():
        found = False
        for alias in aliases:
            if alias in lower_cols:
                col_mapping[lower_cols[alias]] = target_col
                found = True
                break
        if not found:
            if target_col == "subject_id":
                df_clean["subject_id"] = default_subject
            elif target_col == "label":
                df_clean["label"] = default_label
            elif target_col == "timestamp":
                # Synthesize 100 Hz timestamps if missing
                df_clean["timestamp"] = np.arange(len(df_clean)) * 0.01

    df_clean = df_clean.rename(columns=col_mapping)

    # If timestamp was in milliseconds, convert to seconds
    if "timestamp" in df_clean.columns and df_clean["timestamp"].max() > 10000:
        t0 = df_clean["timestamp"].iloc[0]
        df_clean["timestamp"] = (df_clean["timestamp"] - t0) / 1000.0

    # Ensure all required columns exist with valid float types
    for col in ["accel_x", "accel_y", "accel_z", "gyro_x", "gyro_y", "gyro_z"]:
        if col not in df_clean.columns:
            df_clean[col] = 0.0
        df_clean[col] = pd.to_numeric(df_clean[col], errors="coerce").fillna(0.0)

    df_clean["timestamp"] = pd.to_numeric(df_clean["timestamp"], errors="coerce").fillna(0.0)
    df_clean["subject_id"] = df_clean["subject_id"].astype(str)
    df_clean["label"] = df_clean["label"].astype(str).str.lower()
    
    # Normalize label vocabulary
    df_clean["label"] = df_clean["label"].replace({
        "parkinson": "pd", "parkinsons": "pd", "parkinson's": "pd", "pd_patient": "pd",
        "control": "healthy", "hc": "healthy", "normal": "healthy",
        "essential_tremor": "other", "et": "other", "ataxia": "other", "dystonia": "other"
    })

    if "is_synthetic" not in df_clean.columns:
        df_clean["is_synthetic"] = False

    return df_clean[REQUIRED_COLUMNS + ["is_synthetic"]]


def generate_synthetic_session(
    subject_id: str,
    label: str,
    duration_sec: float = 60.0,
    sample_rate_hz: int = 100,
    tremor_intensity: float = 1.0,
    seed: Optional[int] = None
) -> pd.DataFrame:
    """
    Generate a single realistic IMU session for a subject.
    
    Pathology simulation details:
      - 'pd' (Parkinson's Disease): Resting tremor predominantly at 4.0 - 5.8 Hz,
        intermittent burstiness, amplitude modulation, and secondary harmonic (~8-11 Hz).
      - 'healthy': Low-frequency voluntary posture shifts (< 2.5 Hz) + low-power
        physiological tremor (~8-12 Hz) + Gaussian sensor noise.
      - 'other' (Essential Tremor): Higher frequency 7.0 - 10.5 Hz kinetic tremor,
        continuous oscillation.
    """
    if seed is not None:
        np.random.seed(seed)

    n_samples = int(duration_sec * sample_rate_hz)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)

    # Base gravity orientation (wrist resting on lap or armrest: gravity primarily along Z or Y)
    base_gravity = np.array([0.15, 0.20, 0.95])
    # Slow postural drift (< 0.5 Hz)
    posture_drift = 0.05 * np.sin(2 * np.pi * 0.1 * t)[:, None] * np.array([1, 0.5, -0.5])
    # Ambient sensor noise (MPU6050 white noise ~ 0.005 g RMS)
    sensor_noise_acc = np.random.normal(0, 0.015, size=(n_samples, 3))
    sensor_noise_gyro = np.random.normal(0, 0.8, size=(n_samples, 3))

    acc = np.repeat(base_gravity[None, :], n_samples, axis=0) + posture_drift + sensor_noise_acc
    gyro = np.zeros((n_samples, 3)) + sensor_noise_gyro

    if label == "pd":
        # Resting tremor frequency in clinical 4.0 - 5.8 Hz band
        f_tremor = np.random.uniform(4.3, 5.4)
        # Tremor waxing and waning (amplitude modulation envelope)
        mod_freq = np.random.uniform(0.15, 0.35)
        tremor_envelope = 0.5 * (1.0 + np.sin(2 * np.pi * mod_freq * t + np.random.uniform(0, 2*np.pi)))
        # Intermittent bursting (on-off resting tremor typical in PD)
        burst_gate = (np.sin(2 * np.pi * 0.05 * t) > -0.2).astype(float)
        active_envelope = tremor_envelope * burst_gate * tremor_intensity

        # Acceleration tremor vector (primarily along X/Y axes due to wrist pill-rolling motion)
        tremor_acc_x = 0.28 * np.sin(2 * np.pi * f_tremor * t) * active_envelope
        # Add 2nd harmonic (8-11 Hz)
        tremor_acc_x += 0.06 * np.sin(2 * np.pi * (2 * f_tremor) * t) * active_envelope
        tremor_acc_y = 0.20 * np.cos(2 * np.pi * f_tremor * t + 0.4) * active_envelope
        tremor_acc_z = 0.09 * np.sin(2 * np.pi * f_tremor * t + 0.9) * active_envelope

        acc[:, 0] += tremor_acc_x
        acc[:, 1] += tremor_acc_y
        acc[:, 2] += tremor_acc_z

        # Pronation-supination rotational tremor in gyroscope (deg/s)
        gyro[:, 0] += 25.0 * np.sin(2 * np.pi * f_tremor * t + 0.2) * active_envelope
        gyro[:, 1] += 18.0 * np.cos(2 * np.pi * f_tremor * t) * active_envelope
        gyro[:, 2] += 38.0 * np.sin(2 * np.pi * f_tremor * t + 1.2) * active_envelope

    elif label == "other":
        # Essential tremor: higher frequency (7.5 - 9.5 Hz)
        f_et = np.random.uniform(7.5, 9.2)
        et_envelope = 0.8 + 0.2 * np.sin(2 * np.pi * 0.2 * t)
        
        acc[:, 0] += 0.22 * np.sin(2 * np.pi * f_et * t) * et_envelope * tremor_intensity
        acc[:, 1] += 0.16 * np.cos(2 * np.pi * f_et * t) * et_envelope * tremor_intensity
        acc[:, 2] += 0.08 * np.sin(2 * np.pi * f_et * t) * et_envelope * tremor_intensity

        gyro[:, 0] += 30.0 * np.sin(2 * np.pi * f_et * t) * et_envelope * tremor_intensity
        gyro[:, 1] += 22.0 * np.cos(2 * np.pi * f_et * t) * et_envelope * tremor_intensity
        gyro[:, 2] += 15.0 * np.sin(2 * np.pi * f_et * t) * et_envelope * tremor_intensity

    elif label == "healthy":
        # Realistic healthy controls comprise three physiological motion patterns:
        # 1. Motionless resting baseline (stationary sensor on desk or still hand on lap)
        # 2. Voluntary hand movements (glove wearing, adjusting fingers, reaching, moving at 0.8 - 2.5 Hz)
        # 3. Subtle physiological tremor (9-12 Hz)
        rand_type = np.random.rand()
        if rand_type < 0.45:
            # Voluntary hand motion / wearing glove: Low-frequency broad motion (0.8 - 2.4 Hz)
            f_vol = np.random.uniform(0.9, 2.2)
            vol_envelope = 0.5 * (1.0 + np.sin(2 * np.pi * 0.2 * t))
            acc[:, 0] += 0.18 * np.sin(2 * np.pi * f_vol * t) * vol_envelope
            acc[:, 1] += 0.14 * np.cos(2 * np.pi * f_vol * t) * vol_envelope
            acc[:, 2] += 0.08 * np.sin(2 * np.pi * (1.5 * f_vol) * t) * vol_envelope
            gyro[:, 0] += 16.0 * np.sin(2 * np.pi * f_vol * t) * vol_envelope
            gyro[:, 1] += 12.0 * np.cos(2 * np.pi * f_vol * t) * vol_envelope
            gyro[:, 2] += 18.0 * np.sin(2 * np.pi * f_vol * t) * vol_envelope
        elif rand_type < 0.75:
            # Subtle voluntary posture adjustments with low-power physiological tremor (9-12 Hz)
            physio_freq = np.random.uniform(9.0, 11.5)
            acc[:, 0] += 0.015 * np.sin(2 * np.pi * physio_freq * t)
            acc[:, 1] += 0.012 * np.cos(2 * np.pi * physio_freq * t)
            gyro[:, 2] += 1.5 * np.sin(2 * np.pi * physio_freq * t)
        else:
            # Motionless resting baseline: pure stationary sensor noise
            pass

    df = pd.DataFrame({
        "subject_id": subject_id,
        "label": label,
        "timestamp": t,
        "accel_x": np.round(acc[:, 0], 5),
        "accel_y": np.round(acc[:, 1], 5),
        "accel_z": np.round(acc[:, 2], 5),
        "gyro_x": np.round(gyro[:, 0], 3),
        "gyro_y": np.round(gyro[:, 1], 3),
        "gyro_z": np.round(gyro[:, 2], 3),
        "is_synthetic": True
    })

    return df


def generate_synthetic_dataset(
    output_dir: str,
    num_pd: int = 6,
    num_healthy: int = 5,
    num_other: int = 3,
    duration_sec: float = 60.0,
    sample_rate_hz: int = 100
) -> Dict[str, str]:
    """Generate a full synthetic dataset saved to output_dir with individual patient CSVs."""
    os.makedirs(output_dir, exist_ok=True)
    generated_files = {}

    # 1. Generate Parkinson's patients with varying severity
    severities = [0.4, 0.7, 1.0, 1.3, 1.6, 0.85]
    for i in range(num_pd):
        sub_id = f"PD_{i+1:02d}"
        intensity = severities[i % len(severities)]
        df = generate_synthetic_session(
            subject_id=sub_id,
            label="pd",
            duration_sec=duration_sec,
            sample_rate_hz=sample_rate_hz,
            tremor_intensity=intensity,
            seed=100 + i
        )
        file_path = os.path.join(output_dir, f"{sub_id}_session.csv")
        df.to_csv(file_path, index=False)
        generated_files[sub_id] = file_path

    # 2. Generate Healthy Controls
    for i in range(num_healthy):
        sub_id = f"HC_{i+1:02d}"
        df = generate_synthetic_session(
            subject_id=sub_id,
            label="healthy",
            duration_sec=duration_sec,
            sample_rate_hz=sample_rate_hz,
            seed=200 + i
        )
        file_path = os.path.join(output_dir, f"{sub_id}_session.csv")
        df.to_csv(file_path, index=False)
        generated_files[sub_id] = file_path

    # 3. Generate Other Movement Disorders (e.g. Essential Tremor)
    for i in range(num_other):
        sub_id = f"ET_{i+1:02d}"
        df = generate_synthetic_session(
            subject_id=sub_id,
            label="other",
            duration_sec=duration_sec,
            sample_rate_hz=sample_rate_hz,
            tremor_intensity=1.1,
            seed=300 + i
        )
        file_path = os.path.join(output_dir, f"{sub_id}_session.csv")
        df.to_csv(file_path, index=False)
        generated_files[sub_id] = file_path

    manifest = {
        "dataset_name": "Tremor AI Synthetic Clinical Fallback Dataset",
        "description": "Simulated IMU recordings for Parkinsonian resting tremor (4-6 Hz), healthy controls, and essential tremor (7-11 Hz)",
        "sample_rate_hz": sample_rate_hz,
        "duration_per_session_sec": duration_sec,
        "total_subjects": num_pd + num_healthy + num_other,
        "counts": {"pd": num_pd, "healthy": num_healthy, "other": num_other},
        "is_synthetic": True
    }
    with open(os.path.join(output_dir, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    logger.info(f"Generated {len(generated_files)} synthetic patient sessions in {output_dir}")
    return generated_files


def load_dataset(raw_dir: str, fallback_to_synthetic: bool = True) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Source-agnostic dataset loader. Scans raw_dir for CSV or JSON files.
    If no valid dataset is present and fallback_to_synthetic is True,
    generates and loads the synthetic fallback dataset.
    """
    os.makedirs(raw_dir, exist_ok=True)
    csv_files = glob.glob(os.path.join(raw_dir, "*.csv"))

    # Check for manifest
    manifest_path = os.path.join(raw_dir, "manifest.json")
    metadata = {"source": "raw", "is_synthetic": False, "file_count": len(csv_files)}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r") as f:
                metadata = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to parse manifest.json: {e}")

    # Fallback to synthetic if directory is empty
    if not csv_files:
        if fallback_to_synthetic:
            logger.warning(f"No dataset files detected in {raw_dir}. Generating synthetic fallback dataset...")
            generate_synthetic_dataset(raw_dir)
            csv_files = glob.glob(os.path.join(raw_dir, "*.csv"))
            metadata["is_synthetic"] = True
            metadata["source"] = "synthetic_fallback"
        else:
            raise FileNotFoundError(f"No CSV recordings found in {raw_dir}")

    records = []
    for fpath in sorted(csv_files):
        try:
            df = pd.read_csv(fpath)
            basename = os.path.splitext(os.path.basename(fpath))[0]
            # Infer subject and label if not in columns
            default_subj = basename.split("_")[0] if "_" in basename else basename
            default_label = "pd" if "pd" in basename.lower() else ("healthy" if "hc" in basename.lower() or "control" in basename.lower() else "other")
            
            df_norm = normalize_columns(df, default_subject=default_subj, default_label=default_label)
            records.append(df_norm)
        except Exception as err:
            logger.error(f"Error loading {fpath}: {err}")

    if not records:
        raise ValueError(f"Could not load any valid IMU data from {raw_dir}")

    combined_df = pd.concat(records, ignore_index=True)
    metadata["total_records"] = len(combined_df)
    metadata["subjects"] = sorted(combined_df["subject_id"].unique().tolist())
    metadata["label_distribution"] = combined_df.groupby(["subject_id", "label"]).size().unstack(fill_value=0).to_dict()

    return combined_df, metadata
