"""
Tests for Tremor AI Severity Module
"""

import pytest
from src.severity import compute_severity_score


def test_severity_bounds_and_components():
    # 1. High tremor PD window
    sev_high = compute_severity_score(
        pd_probability=0.95,
        tremor_band_power=0.12,
        signal_amplitude_rms=0.28,
        predicted_label="pd"
    )
    assert 0.0 <= sev_high["severity_score"] <= 100.0
    assert sev_high["severity_score"] >= 65.0
    assert sev_high["grade"] in ["Moderate", "Marked / Severe"]

    # 2. Healthy baseline window
    sev_low = compute_severity_score(
        pd_probability=0.04,
        tremor_band_power=0.0002,
        signal_amplitude_rms=0.015,
        predicted_label="healthy"
    )
    assert 0.0 <= sev_low["severity_score"] <= 100.0
    assert sev_low["severity_score"] < 20.0
    assert sev_low["grade"] == "Minimal / Negligible"

    # 3. Monotonicity: Higher tremor power with identical probability yields higher severity
    sev_mid = compute_severity_score(
        pd_probability=0.80,
        tremor_band_power=0.04,
        signal_amplitude_rms=0.12,
        predicted_label="pd"
    )
    assert sev_mid["severity_score"] < sev_high["severity_score"]
    assert sev_mid["severity_score"] > sev_low["severity_score"]
