"""
Tremor AI - Medication Dose Tracking & Timeline Overlay
========================================================
Manages patient dose logs (e.g., Levodopa / Carbidopa) and coordinates
temporal overlays against measured tremor severity scores.

Critical Rule:
  This module only visualizes temporal correlation between user-logged dose
  timestamps and measured tremor severity. It never claims to predict drug
  efficacy or recommend medication changes.
"""

from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np


class MedicationManager:
    """Manages dose logs and temporal phase mapping."""

    def __init__(self, default_medication: str = "Carbidopa/Levodopa 25/100 mg"):
        self.default_medication = default_medication
        self.doses: List[Dict[str, Any]] = []

    def log_dose(
        self, 
        timestamp: pd.Timestamp, 
        medication_name: Optional[str] = None, 
        dose_mg: float = 100.0,
        notes: str = ""
    ) -> Dict[str, Any]:
        """Record a single medication ingestion event."""
        med_name = medication_name or self.default_medication
        dose_record = {
            "dose_id": f"DOSE_{len(self.doses) + 1:03d}",
            "timestamp": pd.to_datetime(timestamp),
            "medication": med_name,
            "dose_mg": float(dose_mg),
            "notes": notes
        }
        self.doses.append(dose_record)
        return dose_record

    def get_doses_dataframe(self) -> pd.DataFrame:
        """Return dose history as a sorted DataFrame."""
        if not self.doses:
            return pd.DataFrame(columns=["dose_id", "timestamp", "medication", "dose_mg", "notes"])
        df = pd.DataFrame(self.doses).sort_values("timestamp").reset_index(drop=True)
        return df

    def associate_windows_with_doses(
        self,
        timeline_df: pd.DataFrame,
        pre_dose_window_min: Tuple[float, float] = (30.0, 60.0),
        post_dose_window_min: Tuple[float, float] = (30.0, 90.0)
    ) -> pd.DataFrame:
        """
        Label each severity recording window with its temporal relationship to doses:
          - 'pre_dose'  : 30 to 60 minutes before dose
          - 'post_dose' : 30 to 90 minutes after dose (typical levodopa plasma peak)
          - 'wearing_off': > 180 minutes after dose
          - 'baseline'  : unassociated / neutral
        """
        df = timeline_df.copy()
        if "timestamp" not in df.columns or not self.doses:
            df["dose_phase"] = "unmonitored"
            df["nearest_dose_id"] = None
            df["minutes_to_nearest_dose"] = np.nan
            return df

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        dose_times = [d["timestamp"] for d in self.doses]
        dose_ids = [d["dose_id"] for d in self.doses]

        phases = []
        nearest_ids = []
        time_diffs = []

        for _, row in df.iterrows():
            t = row["timestamp"]
            # Differences in minutes (positive = t is after dose, negative = t is before dose)
            diffs_min = np.array([(t - dt).total_seconds() / 60.0 for dt in dose_times])
            abs_diffs = np.abs(diffs_min)
            nearest_idx = int(np.argmin(abs_diffs))
            min_delta = diffs_min[nearest_idx]

            # Categorize phase
            if -pre_dose_window_min[1] <= min_delta <= -pre_dose_window_min[0]:
                phase = "pre_dose"
            elif post_dose_window_min[0] <= min_delta <= post_dose_window_min[1]:
                phase = "post_dose"
            elif 180.0 <= min_delta <= 360.0:
                phase = "wearing_off"
            else:
                phase = "baseline"

            phases.append(phase)
            nearest_ids.append(dose_ids[nearest_idx])
            time_diffs.append(round(min_delta, 1))

        df["dose_phase"] = phases
        df["nearest_dose_id"] = nearest_ids
        df["minutes_from_dose"] = time_diffs

        return df
