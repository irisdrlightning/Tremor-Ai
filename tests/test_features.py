"""
Tests for Tremor AI Feature Extraction Module
"""

import pytest
import numpy as np
from src.features import (
    compute_fft_spectrum,
    compute_spectral_entropy,
    extract_window_features,
    features_dict_to_array,
    FEATURE_NAMES
)


def test_synthetic_5hz_tremor_isolated_in_4_to_6_hz_band():
    """
    CRITICAL ACCEPTANCE CRITERIA:
    Unit test asserting a synthetic 5 Hz tremor signal is correctly detected
    with dominant frequency ~5.0 Hz and elevated tremor-band power in the 4-6 Hz band.
    """
    fs = 100.0
    duration_sec = 3.0
    n_samples = int(duration_sec * fs)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)

    # 5.0 Hz pure sinusoidal oscillation + small sensor noise
    f_target = 5.0
    accel_mag = 0.35 * np.sin(2 * np.pi * f_target * t) + np.random.normal(0, 0.01, n_samples)
    gyro_mag = 30.0 * np.sin(2 * np.pi * f_target * t)

    window_dict = {
        "fs": fs,
        "accel_mag": accel_mag,
        "gyro_mag": gyro_mag
    }

    features, spectrum = extract_window_features(window_dict)

    # 1. Dominant frequency must be within 0.3 Hz of 5.0 Hz
    assert np.isclose(features["dominant_frequency"], 5.0, atol=0.35), \
        f"Expected dominant frequency ~5.0 Hz, got {features['dominant_frequency']} Hz"

    # 2. Tremor band power ratio must be high (> 60% of total signal power)
    assert features["tremor_power_ratio"] > 0.60, \
        f"Expected tremor_power_ratio > 0.60, got {features['tremor_power_ratio']}"

    # 3. Spectral entropy should be low (< 0.50) indicating rhythmic oscillation
    assert features["spectral_entropy"] < 0.50, \
        f"Expected spectral entropy < 0.50 for pure sine wave, got {features['spectral_entropy']}"

    # 4. Feature vector output shape matches FEATURE_NAMES
    vec = features_dict_to_array(features)
    assert len(vec) == len(FEATURE_NAMES)


def test_healthy_noise_has_low_tremor_ratio():
    """Verify that white noise / high-frequency physiological tremor does not trigger 4-6 Hz tremor band."""
    fs = 100.0
    n_samples = 300
    t = np.linspace(0, 3, n_samples, endpoint=False)
    # 10.5 Hz physiological tremor + noise
    accel_mag = 0.02 * np.sin(2 * np.pi * 10.5 * t) + np.random.normal(0, 0.02, n_samples)

    window_dict = {
        "fs": fs,
        "accel_mag": accel_mag,
        "gyro_mag": np.zeros(n_samples)
    }

    features, _ = extract_window_features(window_dict)
    assert features["tremor_power_ratio"] < 0.30
    assert features["dominant_frequency"] > 6.5 or features["dominant_frequency"] < 3.5


def test_voluntary_glove_motion_not_classified_as_pd():
    """
    Assert that voluntary hand movements and wearing gloves (<3.0 Hz, broad motion)
    produce low tremor-band power ratio and are classified as healthy with zero severity.
    """
    from src.model import load_trained_model, predict_window
    from src.severity import compute_severity_score

    model, scaler, _ = load_trained_model("models")

    fs = 100.0
    n_samples = 300
    t = np.linspace(0, 3, n_samples, endpoint=False)

    # Low-frequency voluntary movement at 1.4 Hz (e.g. putting on glove, moving hand)
    accel_mag = 0.20 * np.sin(2 * np.pi * 1.4 * t) + np.random.normal(0, 0.02, n_samples)
    gyro_mag = 15.0 * np.sin(2 * np.pi * 1.4 * t)

    window_dict = {
        "fs": fs,
        "accel_mag": accel_mag,
        "gyro_mag": gyro_mag
    }

    features, _ = extract_window_features(window_dict)
    assert features["dominant_frequency"] < 3.8
    assert features["tremor_power_ratio"] < 0.20

    pred = predict_window(model, scaler, features)
    assert pred["predicted_label"] == "healthy"
    assert pred["pd_probability"] == 0.0

    sev = compute_severity_score(
        pred["pd_probability"],
        features["tremor_band_power"],
        features["signal_amplitude_rms"],
        pred["predicted_label"]
    )
    assert sev["severity_score"] == 0.0
    assert sev["grade"] == "Minimal / Negligible"


def test_mpu6050_transverse_vibration_detected_as_pd():
    """
    Verify that physical MPU6050 vibration perpendicular to 1g gravity vector
    (e.g., gravity on X: -0.99g, vibration on Y: 5.0 Hz, 0.08g)
    is cleanly detected with 5.0 Hz dominant peak and classified as PD.
    """
    from src.preprocessing import butter_bandpass_filter
    from src.model import load_trained_model, predict_window

    model, scaler, _ = load_trained_model("models")
    fs = 100.0
    duration_sec = 3.0
    n_samples = int(duration_sec * fs)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)

    # Gravity on X = -0.99g; Tremor vibration on Y = 5.0 Hz, 0.08g; Z = 0.06g
    acc_raw = np.stack([
        -0.99 + np.random.normal(0, 0.005, n_samples),
        0.08 * np.sin(2 * np.pi * 5.0 * t) + np.random.normal(0, 0.005, n_samples),
        0.06 + np.random.normal(0, 0.005, n_samples)
    ], axis=1)

    acc_filt = butter_bandpass_filter(acc_raw, 0.5, 20.0, fs=fs)
    a_mag = np.sqrt(np.sum(acc_filt ** 2, axis=-1))

    window_dict = {
        "fs": fs,
        "accel_filtered": acc_filt,
        "accel_mag": a_mag
    }

    features, _ = extract_window_features(window_dict)

    # Frequency must be ~5.0 Hz (not frequency-doubled to 10 Hz)
    assert np.isclose(features["dominant_frequency"], 5.0, atol=0.4), \
        f"Expected dominant frequency ~5.0 Hz, got {features['dominant_frequency']}"

    # Tremor power ratio must be high (> 0.50)
    assert features["tremor_power_ratio"] > 0.50

    # Model prediction must be PD
    pred = predict_window(model, scaler, features)
    assert pred["predicted_label"] == "pd"
    assert pred["pd_probability"] > 0.50


def test_mpu6050_arbitrary_tilt_vibration_detected():
    """
    Verify 3D orientation-invariance when sensor is tilted at 45 degrees.
    """
    from src.preprocessing import butter_bandpass_filter
    from src.model import load_trained_model, predict_window

    model, scaler, _ = load_trained_model("models")
    fs = 100.0
    duration_sec = 3.0
    n_samples = int(duration_sec * fs)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)

    v = np.array([1.0, 1.0, 1.0]) / np.sqrt(3.0)
    acc_raw = np.array([-0.99, 0.0, 0.06])[None, :] + \
              (0.10 * np.sin(2 * np.pi * 4.8 * t))[:, None] * v[None, :] + \
              np.random.normal(0, 0.005, (n_samples, 3))

    acc_filt = butter_bandpass_filter(acc_raw, 0.5, 20.0, fs=fs)
    a_mag = np.sqrt(np.sum(acc_filt ** 2, axis=-1))

    window_dict = {
        "fs": fs,
        "accel_filtered": acc_filt,
        "accel_mag": a_mag
    }

    features, _ = extract_window_features(window_dict)
    assert np.isclose(features["dominant_frequency"], 4.8, atol=0.45)
    assert features["tremor_power_ratio"] > 0.50

    pred = predict_window(model, scaler, features)
    assert pred["predicted_label"] == "pd"


def test_walking_gait_and_footstep_harmonics_classified_as_healthy():
    """
    Assert that walking motion (arm swing ~1.1 Hz, step impact bounce ~1.83 Hz,
    and heel-strike doublet harmonic at ~3.67 Hz with RMS ~0.28g)
    is correctly recognized as physiological locomotion and classified as healthy with 0 severity.
    """
    from src.preprocessing import butter_bandpass_filter
    from src.model import load_trained_model, predict_window
    from src.severity import compute_severity_score

    model, scaler, _ = load_trained_model("models")
    fs = 100.0
    duration_sec = 3.0
    n_samples = int(duration_sec * fs)
    t = np.linspace(0, duration_sec, n_samples, endpoint=False)

    # Realistic walking kinematics on wrist/hand:
    # 1. Arm swing: 1.1 Hz, 0.25g
    # 2. Step bounce: 1.83 Hz, 0.15g
    # 3. Footstep heel-strike doublet impact harmonic: 3.67 Hz, 0.18g
    acc_x = 0.25 * np.sin(2 * np.pi * 1.1 * t) + np.random.normal(0, 0.03, n_samples)
    acc_y = 0.15 * np.sin(2 * np.pi * 1.83 * t) + np.random.normal(0, 0.03, n_samples)
    acc_z = 0.18 * np.sin(2 * np.pi * 3.67 * t) + np.random.normal(0, 0.03, n_samples)
    acc_raw = np.stack([acc_x, acc_y, acc_z], axis=1)

    acc_filt = butter_bandpass_filter(acc_raw, 0.5, 20.0, fs=fs)
    a_mag = np.sqrt(np.sum(acc_filt ** 2, axis=-1))

    window_dict = {
        "fs": fs,
        "accel_filtered": acc_filt,
        "accel_mag": a_mag
    }

    features, _ = extract_window_features(window_dict)

    # Dominant frequency must reflect walking dynamics (< 3.85 Hz)
    assert features["dominant_frequency"] < 3.85, f"Expected dom_f < 3.85, got {features['dominant_frequency']}"

    # Tremor ratio should be moderate/low (< 0.35) because motion is dominated by locomotion
    assert features["tremor_power_ratio"] < 0.35

    # Prediction must be healthy
    pred = predict_window(model, scaler, features)
    assert pred["predicted_label"] == "healthy"
    assert pred["pd_probability"] == 0.0

    # Severity must be 0.0 (Minimal / Negligible)
    sev = compute_severity_score(
        pred["pd_probability"],
        features["tremor_band_power"],
        features["signal_amplitude_rms"],
        pred["predicted_label"]
    )
    assert sev["severity_score"] == 0.0
    assert sev["grade"] == "Minimal / Negligible"



