"""
Tremor AI - Transparent Severity Scoring Engine
=================================================
Calculates an explainable 0 - 100 Parkinsonian Tremor Severity Index from
extracted digital biomarkers and classifier probability.

Mathematical Formulation:
  The severity index synthesizes three physiological components:
  1. AI Model Parkinsonian Probability (40% weight):
     P_pd in [0, 1] representing resting tremor pattern match.
  2. Normalized Log Tremor-Band Power (35% weight):
     Log-transformed integrated power in the 4.0 - 6.0 Hz band.
     P_norm = clip(log10(1 + 100 * P_tremor) / log10(1 + 100 * 0.15), 0, 1)
  3. Dynamic Motion Amplitude RMS (25% weight):
     A_norm = clip(RMS_amplitude / 0.35 g, 0, 1)

  Composite Formula:
    Raw_Severity = 100 * (0.40 * P_pd + 0.35 * P_norm + 0.25 * A_norm)
    
  Specific Damping:
    If P_pd < 0.25, a confidence damping penalty is applied to prevent
    high-amplitude voluntary movements in healthy controls from triggering false severity.

Clinical Stratification (MDS-UPDRS Resting Tremor Correspondence):
  - 0  to 19 : Minimal / Negligible Tremor
  - 20 to 39 : Mild Tremor
  - 40 to 69 : Moderate Tremor
  - 70 to 100: Marked / Severe Tremor
"""

from typing import Dict, Any, Tuple
import numpy as np


def compute_severity_score(
    pd_probability: float,
    tremor_band_power: float,
    signal_amplitude_rms: float,
    predicted_label: str = "pd"
) -> Dict[str, Any]:
    """
    Compute transparent 0-100 severity index with documented component breakdown.
    
    Args:
      pd_probability: Probability of PD resting tremor from classifier [0, 1]
      tremor_band_power: Integrated power in 4-6 Hz band (g^2 / Hz)
      signal_amplitude_rms: RMS of bandpass-filtered dynamic acceleration (g)
      predicted_label: 'pd', 'healthy', or 'other'
      
    Returns:
      Dictionary containing score, grade, formula breakdown, and clinical note.
    """
    p_pd = float(np.clip(pd_probability, 0.0, 1.0))

    # 1. Normalized Tremor Band Power (Logarithmic scaling across clinical range 0 - 0.15 g^2/Hz)
    max_ref_power = 0.15
    power_scaled = np.log10(1.0 + 100.0 * max(0.0, tremor_band_power)) / np.log10(1.0 + 100.0 * max_ref_power)
    norm_power = float(np.clip(power_scaled, 0.0, 1.0))

    # 2. Normalized Amplitude (Linear scaling across clinical range 0 - 0.35 g RMS)
    max_ref_amp = 0.35
    norm_amp = float(np.clip(signal_amplitude_rms / max_ref_amp, 0.0, 1.0))

    # 3. Composite score
    w_model = 0.40
    w_power = 0.35
    w_amp = 0.25

    raw_score = 100.0 * (w_model * p_pd + w_power * norm_power + w_amp * norm_amp)

    # 4. Specificity damping: If model classifies healthy/other with high confidence,
    # or if the motion is voluntary movement / resting baseline, eliminate false severity
    if tremor_band_power < 0.0008 or (signal_amplitude_rms < 0.040 and p_pd < 0.25) or p_pd <= 0.05 or predicted_label == "healthy":
        final_score = 0.0
    elif p_pd < 0.25:
        damping = float(np.clip(p_pd / 0.25, 0.0, 1.0))
        final_score = raw_score * damping
    else:
        final_score = raw_score

    final_score = float(np.clip(round(final_score, 1), 0.0, 100.0))

    # 5. Clinical Severity Stratification
    if final_score < 20.0:
        grade = "Minimal / Negligible"
        if final_score == 0.0:
            clinical_note = "Physiological baseline or voluntary movement. No rhythmic 4-6 Hz tremor detected."
        else:
            clinical_note = "Motion signals within physiological resting boundaries. No sustained 4-6 Hz oscillation."
    elif final_score < 40.0:
        grade = "Mild"
        clinical_note = "Low-amplitude periodic oscillation detected in 4-6 Hz band with intermittent damping."
    elif final_score < 70.0:
        grade = "Moderate"
        clinical_note = "Noticeable continuous 4-6 Hz resting tremor with prominent spectral peak."
    else:
        grade = "Marked / Severe"
        clinical_note = "High-amplitude sustained resting tremor with strong rotational and kinematic harmonic components."

    return {
        "severity_score": final_score,
        "grade": grade,
        "clinical_note": clinical_note,
        "components": {
            "model_probability_contrib": 0.0 if final_score == 0.0 else round(100.0 * w_model * p_pd, 1),
            "tremor_power_contrib": 0.0 if final_score == 0.0 else round(100.0 * w_power * norm_power, 1),
            "amplitude_contrib": 0.0 if final_score == 0.0 else round(100.0 * w_amp * norm_amp, 1)
        },
        "normalized_inputs": {
            "pd_probability": round(p_pd, 3),
            "norm_power": round(norm_power, 3),
            "norm_amp": round(norm_amp, 3)
        }
    }
