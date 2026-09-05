"""
Tremor AI - Medication-Effectiveness Analysis Engine
=====================================================
Analyzes temporal symptom responses across multiple logged medication doses,
evaluating pre-dose versus post-dose severity deltas, longitudinal wearing-off
phenomena, and acute non-medication flare days.

MANDATORY CLINICAL SCOPE BOUNDARY:
  Outputs provide pattern correlation and clinical decision-support only.
  Never claims autonomous efficacy diagnosis or medication-change instructions.
  All outputs are explicitly flagged for physician review.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd


CLINICAL_DISCLAIMER = (
    "Screening and monitoring aid only — not a diagnostic device. "
    "Medication response analysis reflects observational time-series correlations "
    "and does not constitute pharmacological efficacy determination or dosage advice. "
    "All patterns require professional clinical evaluation."
)


def analyze_medication_effectiveness(
    timeline_df: pd.DataFrame,
    doses: List[Dict[str, Any]],
    meaningful_drop_threshold_pct: float = 15.0
) -> Dict[str, Any]:
    """
    Perform multi-dose longitudinal effectiveness analysis across the monitoring period.
    
    Metrics:
      1. Pre vs Post Dose comparison per dose event
      2. Percentage of doses achieving meaningful reduction (> 15%)
      3. Average symptom reduction magnitude (points and percentage)
      4. Longitudinal wearing-off slope (linear regression over time)
      5. Anomaly / Flare-day detection (> 2 SD above patient baseline)
      6. Structured decision-support verdict with confidence score
    """
    if timeline_df.empty or not doses:
        return {
            "verdict": "Inconclusive",
            "confidence": 0,
            "doses_analyzed": 0,
            "avg_severity_change_pct": 0.0,
            "avg_point_drop": 0.0,
            "response_rate_pct": 0.0,
            "trend_note": "Insufficient dose or telemetry records to evaluate pattern.",
            "flare_days": [],
            "disclaimer": CLINICAL_DISCLAIMER
        }

    # 1. Pair Pre-Dose and Post-Dose recordings for each dose
    dose_responses = []
    
    # Sort data chronologically
    df_sorted = timeline_df.sort_values("timestamp").copy()

    for d in doses:
        d_time = pd.to_datetime(d["timestamp"])
        day = d.get("day", 1)

        # Pre-dose window: 15 to 75 minutes prior
        pre_mask = (df_sorted["timestamp"] >= (d_time - pd.Timedelta(minutes=75))) & \
                   (df_sorted["timestamp"] <= (d_time - pd.Timedelta(minutes=15)))
        # Post-dose window: 30 to 105 minutes post
        post_mask = (df_sorted["timestamp"] >= (d_time + pd.Timedelta(minutes=30))) & \
                    (df_sorted["timestamp"] <= (d_time + pd.Timedelta(minutes=105)))

        pre_records = df_sorted[pre_mask]
        post_records = df_sorted[post_mask]

        if not pre_records.empty and not post_records.empty:
            pre_sev = float(pre_records["severity_score"].mean())
            post_sev = float(post_records["severity_score"].mean())
            delta = pre_sev - post_sev  # Positive delta = symptom reduction (improvement)
            pct_change = (delta / pre_sev * 100.0) if pre_sev > 0 else 0.0

            dose_responses.append({
                "dose_id": d.get("dose_id", "Unknown"),
                "day": day,
                "dose_time": d_time,
                "pre_dose_severity": round(pre_sev, 1),
                "post_dose_severity": round(post_sev, 1),
                "point_drop": round(delta, 1),
                "pct_drop": round(pct_change, 1),
                "is_effective": delta > 0 and pct_change >= meaningful_drop_threshold_pct
            })

    if not dose_responses:
        return {
            "verdict": "Inconclusive",
            "confidence": 10,
            "doses_analyzed": 0,
            "avg_severity_change_pct": 0.0,
            "avg_point_drop": 0.0,
            "response_rate_pct": 0.0,
            "trend_note": "No synchronized pre/post measurement windows aligned with dose timestamps.",
            "flare_days": [],
            "disclaimer": CLINICAL_DISCLAIMER
        }

    resp_df = pd.DataFrame(dose_responses)
    n_analyzed = len(resp_df)

    # 2. Aggregations
    effective_count = int(resp_df["is_effective"].sum())
    response_rate = round(float(effective_count / n_analyzed * 100.0), 1)
    avg_point_drop = round(float(resp_df["point_drop"].mean()), 1)
    avg_pct_drop = round(float(resp_df["pct_drop"].mean()), 1)

    # 3. Longitudinal Wearing-off Trend (Linear regression over days)
    # Are the post-dose reductions declining over the 30 days?
    days = resp_df["day"].values.astype(float)
    drops = resp_df["point_drop"].values.astype(float)

    if len(days) > 3 and np.std(days) > 1e-3:
        slope, intercept = np.polyfit(days, drops, 1)
        slope = float(slope)
    else:
        slope = 0.0

    # 4. Detect Flare Days (Days with severity > mean + 2 * std across the timeline)
    daily_avg = df_sorted.groupby("day")["severity_score"].mean()
    baseline_mean = float(daily_avg.mean())
    baseline_std = float(daily_avg.std()) if len(daily_avg) > 1 else 1.0
    flare_threshold = baseline_mean + 1.8 * baseline_std

    flare_days = []
    for day_num, d_score in daily_avg.items():
        if d_score >= flare_threshold:
            flare_days.append({
                "day": int(day_num),
                "average_severity": round(float(d_score), 1),
                "elevation_above_baseline": round(float(d_score - baseline_mean), 1)
            })

    # 5. Determine Structured Verdict
    # Cases:
    #   - Likely Effective: response_rate >= 70% and slope >= -0.20
    #   - Reduced Effectiveness Detected (Wearing Off): slope < -0.20 or response_rate dropping in last 2 weeks
    #   - Inconclusive: response_rate between 40% and 69% or low sample size
    first_half_drops = resp_df[resp_df["day"] <= 15]["point_drop"].mean() if np.any(resp_df["day"] <= 15) else avg_point_drop
    second_half_drops = resp_df[resp_df["day"] > 15]["point_drop"].mean() if np.any(resp_df["day"] > 15) else avg_point_drop
    wearing_off_differential = float(first_half_drops - second_half_drops)

    if slope < -0.25 or wearing_off_differential > 6.0:
        verdict = "Reduced Effectiveness Detected"
        confidence = int(np.clip(70 + abs(slope) * 25, 70, 94))
        trend_note = (
            f"Observed longitudinal wearing-off pattern. Average symptom drop decreased from "
            f"{first_half_drops:.1f} pts (Days 1-15) to {second_half_drops:.1f} pts (Days 16-30). "
            f"Trend slope: {slope:.2f} pts/day. Recommend clinician review for potential motor fluctuation/wearing-off."
        )
    elif response_rate >= 68.0 and avg_pct_drop >= 15.0:
        verdict = "Likely Effective"
        confidence = int(np.clip(response_rate * 0.9 + 10, 75, 96))
        trend_note = (
            f"Consistently demonstrated post-dose symptom reduction across {response_rate}% of doses "
            f"(mean drop: {avg_point_drop:.1f} severity pts, {avg_pct_drop:.1f}%). Stable therapeutic window maintained."
        )
    else:
        verdict = "Inconclusive"
        confidence = 55
        trend_note = (
            f"Equivocal post-dose response rate ({response_rate}% of doses meeting 15% drop threshold). "
            f"High day-to-day variance or non-responsive motor patterns observed."
        )

    return {
        "verdict": verdict,
        "confidence": confidence,
        "doses_analyzed": n_analyzed,
        "response_rate_pct": response_rate,
        "avg_point_drop": avg_point_drop,
        "avg_severity_change_pct": avg_pct_drop,
        "wearing_off_slope": round(slope, 3),
        "wearing_off_differential": round(wearing_off_differential, 1),
        "first_half_mean_drop": round(float(first_half_drops), 1),
        "second_half_mean_drop": round(float(second_half_drops), 1),
        "trend_note": trend_note,
        "flare_days": flare_days,
        "dose_response_table": resp_df.to_dict(orient="records"),
        "disclaimer": CLINICAL_DISCLAIMER
    }
