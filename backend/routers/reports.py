import os
import io
import time
import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from src.checkpoint_manager import (
    load_live_checkpoints,
    save_live_checkpoint,
    clear_live_checkpoints
)
from src.longitudinal_sim import generate_30_day_longitudinal_data
from src.effectiveness import analyze_medication_effectiveness
from src.doctor_report import generate_monthly_doctor_pdf
from src.report import generate_single_session_pdf, generate_session_plots
import numpy as np

router = APIRouter(prefix="/api/reports", tags=["reports"])

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REPORTS_DIR = os.path.join(PROJECT_ROOT, "reports")

class CheckpointRequest(BaseModel):
    patient_id: Optional[str] = "TR-90241"
    tremor_rate: float
    rms: float
    predicted_label: Optional[str] = "healthy"
    severity_score: Optional[float] = 0.0
    note: Optional[str] = "Live BLE Hardware Reading"
    day: Optional[int] = 30

PATIENTS_DIRECTORY = {
    "TR-90241": {
        "name": "George Peter",
        "age": 67,
        "diagnosis": "Parkinson's Disease (Stage II)",
        "device_name": "TremorAI-Ring-7842 (MPU6050 100Hz BLE)",
        "physician": "Dr. Emily Rochers, MD (Movement Disorders)"
    },
    "TR-90242": {
        "name": "Biromon Jr.",
        "age": 62,
        "diagnosis": "Parkinson's Disease (Stage II)",
        "device_name": "TremorAI-Ring-7842 (MPU6050 100Hz BLE)",
        "physician": "Dr. Emily Rochers, MD (Movement Disorders)"
    },
    "TR-90243": {
        "name": "Eleanor Vance",
        "age": 71,
        "diagnosis": "Parkinson's Disease (Stage III)",
        "device_name": "TremorAI-Ring-7842 (MPU6050 100Hz BLE)",
        "physician": "Dr. Emily Rochers, MD (Movement Disorders)"
    }
}

@router.get("/doctor-pdf")
def get_doctor_pdf_report(
    patient_id: str = Query("TR-90241"),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None)
):
    """
    Generate and stream the Neurologist Clinical Summary PDF Report for a specified
    date-range period incorporating live hardware checkpoints and medication response trends.
    """
    try:
        os.makedirs(REPORTS_DIR, exist_ok=True)
        timestamp_suffix = int(time.time())
        output_pdf_path = os.path.join(
            REPORTS_DIR, f"TremorAI_Neurologist_Report_{patient_id}_{timestamp_suffix}.pdf"
        )

        # 1. Synthesize baseline longitudinal timeline
        timeline_df, doses_list = generate_30_day_longitudinal_data(patient_id=patient_id)

        # 2. Merge persistent hardware checkpoints if available
        live_ckpts = load_live_checkpoints()
        if live_ckpts:
            import pandas as pd
            for ckpt in live_ckpts:
                new_row = {
                    "patient_id": patient_id,
                    "day": ckpt.get("day", 30),
                    "timestamp": datetime.datetime.fromtimestamp(ckpt.get("timestamp_unix", time.time())),
                    "time_label": ckpt.get("time_label", "12:00"),
                    "dose_phase": "post_dose",
                    "is_flare_day": False,
                    "severity_score": ckpt.get("severity_score", 0.0),
                    "pd_probability": ckpt.get("pd_probability", 0.02),
                    "dominant_frequency": ckpt.get("dominant_frequency", 0.0),
                    "tremor_band_power": ckpt.get("tremor_band_power", 0.0001),
                    "signal_amplitude_rms": ckpt.get("signal_amplitude_rms", 0.01),
                    "jerk_rms": ckpt.get("jerk_rms", 0.5),
                    "is_simulated_longitudinal": False,
                    "is_live_hardware": True
                }
                timeline_df = pd.concat([timeline_df, pd.DataFrame([new_row])], ignore_index=True)

        # 3. Analyze Medication Effectiveness & Flare intervals
        effectiveness_result = analyze_medication_effectiveness(timeline_df, doses_list)

        # 4. Patient Metadata with Date-Range Period
        patient_meta = PATIENTS_DIRECTORY.get(patient_id, {
            "name": f"Patient ({patient_id})",
            "age": 65,
            "diagnosis": "Parkinson's Disease",
            "device_name": "TremorAI Smart Ring (MPU6050 100Hz BLE)",
            "physician": "Dr. Emily Rochers, MD (Movement Disorders)"
        }).copy()
        
        if from_date and to_date:
            patient_meta["report_period"] = f"{from_date} to {to_date}"
        else:
            patient_meta["report_period"] = "Last 30 Days (Continuous Kinematics)"
        
        generate_monthly_doctor_pdf(
            output_pdf_path=output_pdf_path,
            patient_id=patient_id,
            timeline_df=timeline_df,
            doses_list=doses_list,
            effectiveness_result=effectiveness_result,
            patient_meta=patient_meta
        )

        return FileResponse(
            output_pdf_path,
            media_type="application/pdf",
            filename=f"TremorAI_Neurologist_Report_{patient_id}.pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF report generation failed: {str(e)}")

@router.get("/session-pdf")
def get_single_session_pdf(patient_id: str = Query("TR-90241")):
    """
    Generate and stream a single-session patient PDF report with raw waveforms and FFT spectrum.
    """
    try:
        os.makedirs(REPORTS_DIR, exist_ok=True)
        timestamp_suffix = int(time.time())
        output_pdf_path = os.path.join(
            REPORTS_DIR, f"TremorAI_Session_Report_{patient_id}_{timestamp_suffix}.pdf"
        )

        # Synthesize representative live IMU session
        fs = 100.0
        n_samples = 400
        t = np.linspace(0, n_samples / fs, n_samples)
        dom_freq = 5.1
        accel_mag = 0.28 + 0.12 * np.sin(2 * np.pi * dom_freq * t) + 0.02 * np.random.randn(n_samples)
        
        fft_vals = np.abs(np.fft.rfft(accel_mag - np.mean(accel_mag)))
        freqs = np.fft.rfftfreq(n_samples, d=1.0 / fs)
        psd = (fft_vals ** 2) / (n_samples * fs)

        session_data = {
            "session_id": f"SESS_{timestamp_suffix}",
            "device_id": "TremorAI-Glove-01",
            "sampling_rate": fs,
            "duration_s": n_samples / fs,
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "time_series": accel_mag,
            "freqs": freqs,
            "psd": psd
        }

        features = {
            "dominant_frequency": dom_freq,
            "tremor_band_power": 0.042,
            "signal_amplitude_rms": float(np.sqrt(np.mean((accel_mag - np.mean(accel_mag))**2))),
            "frequency_entropy": 0.85
        }

        prediction = {
            "predicted_label": "pd",
            "confidence": 0.942,
            "pd_probability": 0.942
        }

        severity = {
            "severity_score": 42.0,
            "grade": "Moderate",
            "clinical_note": "Rhythmic resting tremor in characteristic 4-6 Hz Parkinsonian band."
        }

        explanation = {
            "top_drivers": [
                {"feature": "Dominant Peak (5.1 Hz)", "impact": "High (in PD frequency envelope)"},
                {"feature": "Tremor Band Ratio (84%)", "impact": "Elevated spectral concentration"}
            ]
        }

        generate_single_session_pdf(
            output_pdf_path=output_pdf_path,
            patient_id=patient_id,
            session_data=session_data,
            features=features,
            prediction=prediction,
            severity=severity,
            explanation=explanation
        )

        return FileResponse(
            output_pdf_path,
            media_type="application/pdf",
            filename=f"TremorAI_Session_Report_{patient_id}.pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Session report generation failed: {str(e)}")

@router.post("/checkpoint")
def record_hardware_checkpoint(req: CheckpointRequest):
    """
    Save a real-time hardware telemetry checkpoint from the connected ESP32 glove.
    """
    telemetry_data = {
        "timestamp": time.time(),
        "source": "ble_hardware",
        "prediction": {
            "predicted_label": req.predicted_label,
            "confidence": 0.94 if req.predicted_label == "pd" else 0.98,
            "pd_probability": 0.90 if req.predicted_label == "pd" else 0.02
        },
        "severity": {
            "severity_score": req.severity_score,
            "grade": "Moderate" if req.severity_score > 35 else "Minimal",
            "clinical_note": req.note
        },
        "features": {
            "dominant_frequency": req.tremor_rate,
            "tremor_band_power": 0.035 if req.predicted_label == "pd" else 0.0001,
            "signal_amplitude_rms": req.rms,
            "jerk_rms": 12.0 if req.predicted_label == "pd" else 0.5
        }
    }
    ckpt = save_live_checkpoint(
        telemetry_data=telemetry_data,
        note=req.note or "Live BLE Hardware Reading",
        patient_id=req.patient_id or "TR-90241",
        day=req.day or 30
    )
    return {"status": "success", "message": "Hardware checkpoint saved", "checkpoint": ckpt}

@router.delete("/checkpoints")
def clear_all_checkpoints():
    """Clear saved physical hardware checkpoints."""
    clear_live_checkpoints()
    return {"status": "success", "message": "All hardware checkpoints cleared"}
