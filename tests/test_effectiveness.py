"""
Tests for Tremor AI Medication-Effectiveness Module
"""

import pytest
import pandas as pd
from src.longitudinal_sim import generate_30_day_longitudinal_data
from src.effectiveness import analyze_medication_effectiveness, CLINICAL_DISCLAIMER


def test_effectiveness_analysis_produces_structured_verdict():
    timeline_df, doses = generate_30_day_longitudinal_data(
        patient_id="PD_01", base_severity=50.0, include_wearing_off=True, seed=42
    )

    result = analyze_medication_effectiveness(timeline_df, doses)

    assert "verdict" in result
    assert result["verdict"] in ["Likely Effective", "Inconclusive", "Reduced Effectiveness Detected"]
    assert 0 <= result["confidence"] <= 100
    assert result["doses_analyzed"] > 0
    assert "flare_days" in result
    assert len(result["flare_days"]) >= 1, "Expected at least one flare day detected in simulated timeline"
    assert "disclaimer" in result
    assert result["disclaimer"] == CLINICAL_DISCLAIMER


def test_empty_timeline_handled_gracefully():
    empty_df = pd.DataFrame()
    result = analyze_medication_effectiveness(empty_df, [])
    assert result["verdict"] == "Inconclusive"
    assert result["confidence"] == 0
    assert result["doses_analyzed"] == 0
