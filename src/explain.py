"""
Tremor AI - Explainability & Clinical Interpretation Engine
============================================================
Translates extracted digital biomarkers, feature importances, and model
probabilities into transparent, clinically grounded, plain-language summaries.

Complies strictly with non-diagnostic screening guidelines: outputs are phrased
as observed motion patterns and biomechanical correlates.
"""

from typing import Dict, Any, List


def generate_feature_explanation(
    features: Dict[str, float],
    prediction: Dict[str, Any],
    severity: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate structured, plain-language biomechanical explanations
    for a single analyzed motion window.
    """
    dom_freq = features.get("dominant_frequency", 0.0)
    tremor_ratio = features.get("tremor_power_ratio", 0.0) * 100.0
    amp_rms = features.get("signal_amplitude_rms", 0.0)
    jerk_rms = features.get("jerk_rms", 0.0)
    entropy = features.get("spectral_entropy", 1.0)
    pred_label = prediction.get("predicted_label", "unknown")
    pd_prob = prediction.get("pd_probability", 0.0) * 100.0
    score = severity.get("severity_score", 0.0)

    narrative_points: List[str] = []

    # 1. Frequency Analysis
    if 4.0 <= dom_freq <= 6.0:
        narrative_points.append(
            f"Dominant frequency ({dom_freq:.1f} Hz) falls precisely within the 4.0 - 6.0 Hz "
            f"cardinal resting tremor band associated with Parkinsonian motor signs."
        )
    elif 7.0 <= dom_freq <= 11.0:
        narrative_points.append(
            f"Dominant frequency ({dom_freq:.1f} Hz) is elevated above the Parkinsonian resting band, "
            f"more characteristic of postural/action tremors (e.g., Essential Tremor) or physiological tremor."
        )
    else:
        narrative_points.append(
            f"Dominant spectral energy is at {dom_freq:.1f} Hz, reflecting low-frequency voluntary movement "
            f"or ambient baseline shifts rather than localized tremor."
        )

    # 2. Power Concentration
    if tremor_ratio >= 45.0:
        narrative_points.append(
            f"High spectral energy concentration ({tremor_ratio:.1f}%) in the 4-6 Hz band confirms a "
            f"focused periodic oscillatory pattern, distinguishing it from broadband voluntary limb motion."
        )
    elif tremor_ratio >= 20.0:
        narrative_points.append(
            f"Moderate tremor-band power ratio ({tremor_ratio:.1f}%) indicates intermittent or mild periodicity."
        )
    else:
        narrative_points.append(
            f"Tremor-band energy is minimal ({tremor_ratio:.1f}%), consistent with physiological resting state."
        )

    # 3. Kinematic Regularity & Entropy
    if entropy < 0.40:
        narrative_points.append(
            f"Low spectral entropy ({entropy:.2f}) indicates high wave regularity, reflecting rhythmic "
            f"involuntary motor firing."
        )
    else:
        narrative_points.append(
            f"Spectral entropy ({entropy:.2f}) reflects broad-spectrum kinetic noise or non-rhythmic movement."
        )

    # 4. Amplitude & Jerk Dynamics
    if amp_rms > 0.15:
        narrative_points.append(
            f"Dynamic amplitude RMS ({amp_rms:.3f} g) and jerk ({jerk_rms:.1f} g/s) signify substantial "
            f"biomechanical displacement and rapid oscillatory acceleration."
        )

    summary_paragraph = " ".join(narrative_points)

    return {
        "summary_paragraph": summary_paragraph,
        "key_findings": narrative_points,
        "dominant_biomarker": "4-6 Hz Band Resonance" if (4.0 <= dom_freq <= 6.0 and tremor_ratio > 30) else "Broadband Baseline",
        "clinical_decision_support_note": (
            f"Pattern correlation: Classifier estimates {pd_prob:.1f}% congruence with Parkinsonian resting "
            f"tremor profile, yielding a composite severity score of {score:.1f}/100. For clinical correlation only."
        )
    }
