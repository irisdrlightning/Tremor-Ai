"""
Tremor AI - Live Hardware Checkpoint & Session Manager
======================================================
Manages live physical sensor checkpoints, session recordings, and integrates
real-time MPU6050 telemetry into the 30-day longitudinal tracker and clinical PDF reports.
"""

import os
import json
import time
import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CHECKPOINTS_FILE = os.path.join(PROJECT_ROOT, "data", "live_checkpoints.json")
LIVE_TELEMETRY_FILE = os.path.join(PROJECT_ROOT, "data", "live_telemetry.json")


def load_live_checkpoints() -> List[Dict[str, Any]]:
    """Load persistent physical hardware checkpoints."""
    try:
        from backend.database import load_checkpoints_data
        return load_checkpoints_data()
    except Exception:
        if not os.path.exists(CHECKPOINTS_FILE):
            return []
        try:
            with open(CHECKPOINTS_FILE, "r") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception:
            return []


def save_live_checkpoint(
    telemetry_data: Dict[str, Any],
    note: str = "Live Physical Checkpoint",
    patient_id: str = "LIVE_COM4",
    day: int = 30
) -> Dict[str, Any]:
    """
    Append a verified physical hardware reading to the 30-day longitudinal history.
    """
    checkpoints = load_live_checkpoints()
    now_dt = datetime.datetime.now()
    
    pred = telemetry_data.get("prediction", {})
    sev = telemetry_data.get("severity", {})
    feats = telemetry_data.get("features", {})
    
    checkpoint_record = {
        "checkpoint_id": f"LIVE_CKPT_{len(checkpoints) + 1:03d}",
        "patient_id": patient_id,
        "timestamp_unix": telemetry_data.get("timestamp", time.time()),
        "iso_timestamp": now_dt.isoformat(),
        "time_str": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "day": int(day),  # Present day of 30-day monitoring window
        "time_label": now_dt.strftime("%H:%M"),
        "source": telemetry_data.get("source", "serial_COM4"),
        "predicted_label": pred.get("predicted_label", "healthy"),
        "confidence": round(float(pred.get("confidence", 0.99)), 4),
        "pd_probability": round(float(pred.get("pd_probability", 0.0)), 4),
        "severity_score": round(float(sev.get("severity_score", 0.0)), 1),
        "grade": sev.get("grade", "Minimal / Negligible"),
        "dominant_frequency": round(float(feats.get("dominant_frequency", 0.0)), 2),
        "tremor_band_power": round(float(feats.get("tremor_band_power", 0.0)), 6),
        "signal_amplitude_rms": round(float(feats.get("signal_amplitude_rms", 0.0)), 4),
        "jerk_rms": round(float(feats.get("jerk_rms", 0.0)), 2),
        "clinical_note": note,
        "is_physical_sensor": True
    }
    
    try:
        from backend.database import save_checkpoint_record
        save_checkpoint_record(checkpoint_record)
    except Exception:
        checkpoints.append(checkpoint_record)
        os.makedirs(os.path.dirname(CHECKPOINTS_FILE), exist_ok=True)
        with open(CHECKPOINTS_FILE, "w") as f:
            json.dump(checkpoints, f, indent=2)
        
    return checkpoint_record


def clear_live_checkpoints() -> None:
    """Clear saved physical checkpoints."""
    try:
        from backend.database import clear_all_checkpoints
        clear_all_checkpoints()
    except Exception:
        if os.path.exists(CHECKPOINTS_FILE):
            try:
                os.remove(CHECKPOINTS_FILE)
            except Exception:
                pass


def get_live_hardware_session_df(sample_count: int = 300) -> Optional[pd.DataFrame]:
    """
    Constructs a standardized pandas DataFrame from the active live physical hardware stream
    so it can be analyzed identically to any clinical dataset recording in View 1.
    """
    if not os.path.exists(LIVE_TELEMETRY_FILE):
        return None
        
    try:
        with open(LIVE_TELEMETRY_FILE, "r") as f:
            live_data = json.load(f)
    except Exception:
        return None
        
    recent = live_data.get("recent_accel", {})
    ax = recent.get("ax", [])
    ay = recent.get("ay", [])
    az = recent.get("az", [])
    
    if len(ax) < 20:
        return None
        
    n_pts = len(ax)
    fs = 100.0
    t = np.arange(n_pts) / fs
    
    recent_g = live_data.get("recent_gyro", {})
    gx = recent_g.get("gx", [])
    gy = recent_g.get("gy", [])
    gz = recent_g.get("gz", [])
    if len(gx) != n_pts:
        gx = np.zeros(n_pts)
        gy = np.zeros(n_pts)
        gz = np.zeros(n_pts)

    # Standard schema required by src/data_loader.py and src/preprocessing.py
    df_live = pd.DataFrame({
        "subject_id": "LIVE_HW_COM4",
        "label": live_data.get("prediction", {}).get("predicted_label", "healthy"),
        "timestamp": t,
        "accel_x": ax,
        "accel_y": ay,
        "accel_z": az,
        "gyro_x": gx,
        "gyro_y": gy,
        "gyro_z": gz,
        "is_synthetic": False,
        "is_live_hardware": True
    })
    
    return df_live
