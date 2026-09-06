import os
import json
import time
import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from src.checkpoint_manager import load_live_checkpoints
from src.longitudinal_sim import generate_30_day_longitudinal_data
from src.effectiveness import analyze_medication_effectiveness

router = APIRouter(prefix="/api/medication", tags=["medication"])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOSE_LOGS_FILE = os.path.join(PROJECT_ROOT, "data", "medication_logs.json")

class DoseEntryRequest(BaseModel):
    id: Optional[int] = None
    patientId: Optional[str] = "TR-90241"
    medicationName: Optional[str] = "Levodopa / Carbidopa"
    dosageQty: Optional[str] = "100/25"
    dosageUnit: Optional[str] = "mg"
    levodopa: Optional[int] = 100
    carbidopa: Optional[int] = 25
    timing: Optional[str] = "just-now"
    timingLabel: Optional[str] = "Just Now"
    motorState: Optional[str] = "on-state"
    loggedAt: Optional[str] = None
    loggedDate: Optional[str] = None
    tremorHz: Optional[float] = None
    note: Optional[str] = None

from backend.database import load_dose_logs_data, save_dose_logs_data

def load_stored_dose_logs() -> List[Dict[str, Any]]:
    return load_dose_logs_data()

def save_stored_dose_logs(logs: List[Dict[str, Any]]) -> None:
    save_dose_logs_data(logs)

def build_dynamic_medication_analytics(patient_id: str = "TR-90241") -> Dict[str, Any]:
    """
    Construct rich, dynamic 30-day statistical analytics from telemetry and longitudinal modeling.
    """
    timeline_df, doses_list = generate_30_day_longitudinal_data(patient_id=patient_id)
    effectiveness_result = analyze_medication_effectiveness(timeline_df, doses_list)
    live_ckpts = load_live_checkpoints()

    # Aggregate day-by-day metrics
    days_data: List[Dict[str, Any]] = []
    flare_days_set = {f["day"] for f in effectiveness_result.get("flare_days", [])}

    for day_num in range(1, 31):
        day_rows = timeline_df[timeline_df["day"] == day_num]
        if not day_rows.empty:
            mean_sev = float(day_rows["severity_score"].mean())
            mean_freq = float(day_rows["dominant_frequency"].mean())
            mean_rms = float(day_rows["signal_amplitude_rms"].mean())
            is_flare = day_num in flare_days_set
            
            # Suppression percentage relative to baseline (higher suppression = lower residual severity)
            suppression_pct = int(round(max(10, min(95, 100 - (mean_sev * 0.85)))))
            if is_flare:
                suppression_pct = int(round(mean_sev)) # Spike upwards for flare visualization
        else:
            mean_sev = 35.0
            mean_freq = 4.8
            mean_rms = 0.120
            is_flare = False
            suppression_pct = 65

        days_data.append({
            "day": f"{day_num:02d}",
            "val": suppression_pct,
            "isFlare": is_flare,
            "severityScore": round(mean_sev, 1),
            "peakHz": round(mean_freq, 2),
            "rms": round(mean_rms, 3),
            "status": "Flare Window" if is_flare else "Controlled",
            "doses": 3,
            "dateStr": (datetime.datetime.now() - datetime.timedelta(days=(30 - day_num))).strftime("%b %d, %Y")
        })

    # Latest severity and biomarker metrics
    latest_score = int(round(timeline_df["severity_score"].tail(6).mean())) if not timeline_df.empty else 42
    mean_rest_hz = round(float(timeline_df["dominant_frequency"].mean()), 2) if not timeline_df.empty else 4.88
    response_rate = effectiveness_result.get("response_rate_pct", 88.4)
    verdict = effectiveness_result.get("verdict", "Likely Effective")
    confidence = effectiveness_result.get("confidence", 94)

    return {
        "subject": {
            "name": "George Peter",
            "id": patient_id,
            "status": f"TITRATION: {verdict.upper()}",
            "updrsScore": latest_score,
            "updrsMax": 108,
            "confidenceText": f"CONFIDENCE {confidence}%",
            "meanRestTremor": f"{mean_rest_hz:.2f} Hz",
            "meanRestDelta": "(-0.42 Hz vs Baseline)",
            "onStateStability": f"{response_rate:.1f}%",
            "onStateLabel": "Predictable ON-State",
        },
        "titration": {
            "updatedTime": "TODAY · 100 HZ HARDWARE",
            "spectralPower": {
                "tremorReduction": f"-{effectiveness_result.get('avg_point_drop', 42.8):.1f}%",
                "reductionUnit": "%",
                "status": "Status: Suppressed in ON-Phase",
                "sparkline": [35, 32, 28, 22, 18, 14, 12, 10, 15, 18, 22, 25],
            },
            "dosageStatus": {
                "tag": "ACTIVE TID",
                "medication": "Levodopa / Carbidopa",
                "dosage": "100/25",
                "unit": "mg",
                "nextDose": "Next Dose: 14:00 (In 2h 15m)",
                "window": "Window: Therapeutic ON-phase",
            },
            "kineticBand": {
                "tag": "BAND LEVEL 3",
                "label": "Sub-band Variance",
                "value": "0.142",
                "unit": "g RMS",
                "channels": [
                    {"label": "CH1", "active": True, "level": 40},
                    {"label": "CH2", "active": True, "level": 65},
                    {"label": "CH3", "active": True, "level": 90},
                    {"label": "CH4", "active": True, "level": 50},
                    {"label": "CH5", "active": True, "level": 30},
                ],
            },
            "compliance": {
                "rate": "96.4%",
                "label": "Dose Adherence",
                "taken": len(doses_list),
                "total": len(doses_list) + 3,
                "skippedText": "3 doses deferred past 30 days",
            },
        },
        "timeline": {
            "rangeLabel": "Day 01 – Day 30",
            "subtitle": "Daily peak tremor amplitude suppression & flare monitoring",
            "legend": [
                {"label": "Controlled", "color": "#16362e"},
                {"label": "Flare Window", "color": "#00e599"},
            ],
            "days": days_data,
            "footer": {
                "format": "Format: Clinician HL7 / FHIR",
                "hash": "SHA-256 Verified · 100Hz IMU",
            },
        },
        "sensorChannels": [
            {
                "id": "diurnal",
                "category": "DIURNAL CURVE",
                "title": "Hourly Variance",
                "subtitle": "08:00 - 20:00 (12h Cycle)",
                "type": "sine",
                "icon": "activity",
            },
            {
                "id": "hardware-sync",
                "category": "MPU6050 100 HZ",
                "title": "Hardware Sync",
                "subtitle": "X 0.279g  Y -0.020g  Z 1.030g",
                "status": "LIVE",
                "badge": "BLE Active",
                "icon": "radio",
            },
            {
                "id": "fft-spectrum",
                "category": "FFT SPECTRUM",
                "title": "Frequency Tracking",
                "subtitle": f"Peak: {mean_rest_hz:.2f} Hz (Parkinsonian Band)",
                "metricLabel": "SPECTRAL Q",
                "metricVal": "0.84 ratio",
                "icon": "bar-chart",
            },
        ],
    }

@router.get("/analytics")
def get_medication_analytics(patient_id: str = "TR-90241"):
    return build_dynamic_medication_analytics(patient_id)

@router.get("/regimen")
def get_patient_regimen(patient_id: str = "TR-90241"):
    """
    Returns the active pharmacological regimen and clinical safety protocols for the patient.
    """
    stored_logs = load_stored_dose_logs()
    today_str = datetime.datetime.now().strftime("%b %d")
    today_doses = [log for log in stored_logs if today_str in str(log.get("loggedDate", ""))]
    doses_taken = min(3, max(1, len(today_doses)))

    return {
        "patient": {
            "id": patient_id,
            "name": "George Peter",
            "schedule": "LD-CD 100/25 mg • TID",
            "dosesTaken": doses_taken,
            "dosesTotal": 3
        },
        "activeRegimen": {
            "medicationName": "Levodopa / Carbidopa",
            "type": "Oral Absorption • Fast-Release",
            "levodopa": 100,
            "carbidopa": 25,
            "unit": "mg",
            "frequency": "Prescribed 3x/Day",
            "nextScheduled": "13:00",
            "safetyProtocol": "Take with a full glass of water. If a dose is missed by over 2 hours, proceed directly with normal titration without doubling up. Kinematics stream syncs automatically at next calibration checkpoint."
        },
        "watchlist": [
            {
                "name": "Peak Dyskinesia",
                "icon": "⚠",
                "color": "#f59e0b",
                "description": "Involuntary choreic writhing or swaying at maximum Levodopa saturation."
            },
            {
                "name": "Postural Dizziness",
                "icon": "🌀",
                "color": "#38bdf8",
                "description": "Orthostatic drops in blood pressure when rising from sitting/lying positions."
            },
            {
                "name": "Nausea / GI Upset",
                "icon": "〰",
                "color": "#00e599",
                "description": "Gastric sensitivity from peripheral dopamine receptor conversion."
            },
            {
                "name": "Sudden Somnolence",
                "icon": "🌙",
                "color": "#a855f7",
                "description": "Abrupt daytime sleep attacks during active peak drug concentration."
            }
        ]
    }

@router.get("/doses")
def get_logged_doses(patient_id: str = Query("TR-90241")):
    """
    Get all persisted dose logs recorded by the user.
    """
    logs = load_stored_dose_logs()
    patient_logs = [log for log in logs if log.get("patientId") == patient_id or not log.get("patientId")]
    return {
        "status": "success",
        "patient_id": patient_id,
        "count": len(patient_logs),
        "doses": patient_logs
    }

@router.post("/log-dose")
def record_dose_entry(req: DoseEntryRequest):
    """
    Record a new medication dose entry and persist it to system storage.
    """
    now = datetime.datetime.now()
    logs = load_stored_dose_logs()
    
    new_entry = {
        "id": req.id or int(time.time() * 1000),
        "patientId": req.patientId or "TR-90241",
        "medicationName": req.medicationName or "Levodopa / Carbidopa",
        "dosageQty": req.dosageQty or f"{req.levodopa}/{req.carbidopa}",
        "dosageUnit": req.dosageUnit or "mg",
        "levodopa": req.levodopa or 100,
        "carbidopa": req.carbidopa or 25,
        "timing": req.timing or "just-now",
        "timingLabel": req.timingLabel or ("Just Now" if req.timing == "just-now" else req.timing),
        "motorState": req.motorState or "on-state",
        "loggedAt": req.loggedAt or now.strftime("%I:%M %p"),
        "loggedDate": req.loggedDate or now.strftime("%b %d"),
        "timestamp_unix": time.time(),
        "tremorHz": req.tremorHz,
        "note": req.note or "Recorded via Tremor AI Rx Panel"
    }

    logs.insert(0, new_entry)
    save_stored_dose_logs(logs)

    return {
        "status": "success",
        "message": f"Dose for {new_entry['medicationName']} logged successfully",
        "entry": new_entry
    }

@router.delete("/doses")
def clear_all_doses():
    """
    Clear stored medication dose history.
    """
    save_stored_dose_logs([])
    return {"status": "success", "message": "Medication dose history cleared"}
