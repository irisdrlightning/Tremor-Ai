"""
Tests for Live Hardware Integration:
- Checkpoint saving, loading, clearing
- Live session DataFrame generation
- 30-day longitudinal timeline merging live hardware checkpoints
- Single-Session PDF report generation with live hardware metadata
- Monthly Doctor Report generation with live hardware checkpoints
"""

import os
import json
import tempfile
import numpy as np
import pandas as pd
import pytest

from src.checkpoint_manager import (
    load_live_checkpoints,
    save_live_checkpoint,
    clear_live_checkpoints,
    get_live_hardware_session_df
)
from src.longitudinal_sim import generate_30_day_longitudinal_data
from src.effectiveness import analyze_medication_effectiveness
from src.report import generate_single_session_pdf
from src.doctor_report import generate_monthly_doctor_pdf
from src.explain import generate_feature_explanation


def test_live_checkpoints_lifecycle(tmp_path, monkeypatch):
    """Test saving, loading, and clearing live hardware checkpoints."""
    test_json = tmp_path / "test_checkpoints.json"
    import src.checkpoint_manager as cm
    monkeypatch.setattr(cm, "CHECKPOINTS_FILE", str(test_json))

    # Initially empty
    assert cm.load_live_checkpoints() == []

    # Mock telemetry
    mock_telemetry = {
        "timestamp": 1700000000.0,
        "source": "serial_COM4",
        "prediction": {"predicted_label": "pd", "confidence": 0.94, "pd_probability": 0.88},
        "severity": {"severity_score": 64.5, "grade": "Moderate", "clinical_note": "Rhythmic 4.8 Hz tremor."},
        "features": {"dominant_frequency": 4.8, "tremor_band_power": 0.045, "signal_amplitude_rms": 0.12, "jerk_rms": 18.2}
    }

    rec = cm.save_live_checkpoint(mock_telemetry, note="Test Checkpoint 1", patient_id="LIVE_COM4", day=30)
    assert rec["severity_score"] == 64.5
    assert rec["predicted_label"] == "pd"

    loaded = cm.load_live_checkpoints()
    assert len(loaded) == 1
    assert loaded[0]["severity_score"] == 64.5

    cm.clear_live_checkpoints()
    assert cm.load_live_checkpoints() == []


def test_30_day_timeline_with_live_checkpoints():
    """Verify live checkpoints are merged into 30-day timeline with is_live_hardware flag."""
    live_ckpts = [
        {
            "checkpoint_id": "LIVE_CKPT_001",
            "iso_timestamp": "2026-09-05T01:30:00",
            "day": 30,
            "predicted_label": "healthy",
            "severity_score": 0.0,
            "dominant_frequency": 0.0,
            "tremor_band_power": 0.0001,
            "signal_amplitude_rms": 0.01,
            "clinical_note": "Resting baseline test"
        }
    ]

    df, doses = generate_30_day_longitudinal_data(
        patient_id="LIVE_COM4",
        base_severity=25.0,
        live_checkpoints=live_ckpts
    )

    assert "is_live_hardware" in df.columns
    live_records = df[df["is_live_hardware"] == True]
    assert len(live_records) == 1
    assert live_records.iloc[0]["severity_score"] == 0.0


def test_single_session_pdf_generation(tmp_path):
    """Verify single-session PDF renders cleanly with live hardware metadata."""
    pdf_out = str(tmp_path / "test_live_session.pdf")
    sess_meta = {
        "duration_sec": 6.0,
        "is_synthetic": False,
        "is_live_hardware": True,
        "device_name": "Physical ESP32 + MPU6050 (COM4)",
        "fs": 50.0,
        "accel_mag": np.random.normal(0, 0.02, 300),
        "freqs": np.linspace(0, 25, 100),
        "psd": np.ones(100) * 0.0001
    }
    feats = {
        "dominant_frequency": 0.0,
        "tremor_band_power": 0.00005,
        "tremor_power_ratio": 0.05,
        "signal_amplitude_rms": 0.01,
        "peak_to_peak_amplitude": 0.04,
        "jerk_rms": 0.8,
        "spectral_entropy": 0.6,
        "gyro_tremor_power": 0.01,
        "harmonic_ratio": 0.2
    }
    pred = {"predicted_label": "healthy", "confidence": 0.99, "pd_probability": 0.0}
    sev = {
        "severity_score": 0.0,
        "grade": "Minimal / Negligible",
        "clinical_note": "Stationary baseline.",
        "components": {"model_probability_contrib": 0.0, "tremor_power_contrib": 0.0, "amplitude_contrib": 0.0}
    }
    expl = generate_feature_explanation(feats, pred, sev)

    res = generate_single_session_pdf(pdf_out, "LIVE_COM4", sess_meta, feats, pred, sev, expl)
    assert os.path.exists(res)
    assert os.path.getsize(res) > 5000  # Non-trivial PDF size


def test_doctor_report_pdf_with_live_checkpoints(tmp_path):
    """Verify 30-day Doctor report renders with live hardware checkpoints table."""
    pdf_out = str(tmp_path / "test_monthly_live.pdf")
    live_ckpts = [
        {
            "checkpoint_id": "LIVE_CKPT_001",
            "iso_timestamp": "2026-09-05T01:30:00",
            "day": 30,
            "predicted_label": "healthy",
            "severity_score": 0.0,
            "dominant_frequency": 0.0,
            "tremor_band_power": 0.0001,
            "signal_amplitude_rms": 0.01,
            "clinical_note": "Resting baseline test"
        }
    ]

    df, doses = generate_30_day_longitudinal_data(
        patient_id="LIVE_COM4",
        base_severity=30.0,
        live_checkpoints=live_ckpts
    )
    eff = analyze_medication_effectiveness(df, doses)

    patient_meta = {
        "is_live_hardware": True,
        "device_name": "Physical ESP32 Wearable IMU (COM4)",
        "live_checkpoints": live_ckpts
    }

    res = generate_monthly_doctor_pdf(pdf_out, "LIVE_COM4", df, doses, eff, patient_meta=patient_meta)
    assert os.path.exists(res)
    assert os.path.getsize(res) > 8000
