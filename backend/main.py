"""
Tremor Ai — Backend FastAPI REST Service
=========================================
Exposes authenticated endpoints for the Patient App and Doctor Dashboard.
Integrates SQLite user authentication, patient profile mapping, medication dose logs,
and connects directly to the core signal processing and ML pipeline in src/.
"""

import os
import sys
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

try:
    from fastapi import FastAPI, HTTPException, Header, Depends, status, Response
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

from backend.auth_service import (
    signup_user,
    login_user,
    logout_user,
    get_user_from_token,
    pair_ring_to_patient,
    save_patient_profile,
    get_patient_profile,
    log_patient_dose,
    get_patient_recent_doses,
    record_doctor_lookup,
    get_doctor_recent_patients
)
from src.longitudinal_sim import generate_30_day_longitudinal_data
from src.effectiveness import analyze_medication_effectiveness
from src.preprocessing import butter_bandpass_filter, compute_magnitudes
from src.features import extract_window_features
from src.model import load_trained_model, predict_window
from src.severity import compute_severity_score
import time
import json
import numpy as np

if FASTAPI_AVAILABLE:
    app = FastAPI(
        title="Tremor Ai Clinical API",
        version="1.0.0",
        description="REST backend service for Patient App & Doctor Dashboard with role-based auth."
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -------------------------------------------------------------------------
    # Pydantic Request Schemas
    # -------------------------------------------------------------------------
    class SignupRequest(BaseModel):
        email: str
        password: str
        role: str
        full_name: Optional[str] = None
        clinic_name: Optional[str] = None

    class LoginRequest(BaseModel):
        email: str
        password: str
        role: Optional[str] = None

    class PairRingRequest(BaseModel):
        ring_id: str

    class ProfileRequest(BaseModel):
        full_name: str
        age: int
        medication_name: str
        medication_schedule: str
        doses_per_day: int = 3

    class DoseLogRequest(BaseModel):
        medication_name: str
        dose_amount: Optional[str] = "Standard dose"
        notes: Optional[str] = "Logged from Patient App"

    class TelemetryBatchRequest(BaseModel):
        ring_id: str
        patient_id: Optional[str] = None
        samples: List[List[float]]  # [[timestamp_ms, ax, ay, az, gx, gy, gz], ...]

    # -------------------------------------------------------------------------
    # Authentication Dependency
    # -------------------------------------------------------------------------
    def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
        """Extract and validate Bearer session token."""
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required. Please provide a valid Bearer token."
            )
        token = authorization.replace("Bearer ", "").strip()
        user = get_user_from_token(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session invalid or expired. Please log in again."
            )
        return user

    # -------------------------------------------------------------------------
    # Auth Endpoints
    # -------------------------------------------------------------------------
    @app.post("/auth/signup")
    def api_signup(req: SignupRequest):
        success, msg, user_data = signup_user(
            email=req.email,
            password=req.password,
            role=req.role,
            full_name=req.full_name,
            clinic_name=req.clinic_name
        )
        if not success:
            raise HTTPException(status_code=400, detail=msg)
        return {"status": "success", "message": msg, "user": user_data}

    @app.post("/auth/login")
    def api_login(req: LoginRequest):
        success, msg, user_data = login_user(
            email=req.email,
            password=req.password,
            required_role=req.role
        )
        if not success:
            raise HTTPException(status_code=401, detail=msg)
        return {"status": "success", "message": msg, "token": user_data["token"], "user": user_data}

    @app.post("/auth/logout")
    def api_logout(current_user: Dict[str, Any] = Depends(get_current_user)):
        logout_user(current_user["token"])
        return {"status": "success", "message": "Successfully logged out."}

    # -------------------------------------------------------------------------
    # Patient Data & Profile Endpoints
    # -------------------------------------------------------------------------
    @app.get("/patients/{patient_id}")
    def api_get_patient(patient_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
        """
        Access control rule:
        - Patient role can only access their own linked patient_id
        - Doctor role can look up any patient by ID/Ring ID
        """
        if current_user["role"] == "patient" and current_user["linked_id"] != patient_id:
            raise HTTPException(status_code=403, detail="Access denied. Patients may only view their own profile.")

        profile = get_patient_profile(patient_id)
        if not profile:
            raise HTTPException(status_code=404, detail=f"Patient record '{patient_id}' not found.")

        # If doctor accessed, record lookup
        if current_user["role"] == "doctor":
            record_doctor_lookup(current_user["user_id"], profile["patient_id"])

        return {"status": "success", "patient": profile}

    @app.post("/patients/{patient_id}/profile")
    def api_update_profile(patient_id: str, req: ProfileRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
        if current_user["role"] == "patient" and current_user["linked_id"] != patient_id:
            raise HTTPException(status_code=403, detail="Access denied.")

        success, msg = save_patient_profile(
            patient_id=patient_id,
            full_name=req.full_name,
            age=req.age,
            medication_name=req.medication_name,
            medication_schedule=req.medication_schedule,
            doses_per_day=req.doses_per_day
        )
        return {"status": "success", "message": msg}

    @app.post("/patients/{patient_id}/pair-ring")
    def api_pair_ring(patient_id: str, req: PairRingRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
        if current_user["role"] == "patient" and current_user["linked_id"] != patient_id:
            raise HTTPException(status_code=403, detail="Access denied.")

        success, msg = pair_ring_to_patient(patient_id, req.ring_id)
        return {"status": "success", "message": msg}

    @app.post("/patients/{patient_id}/doses")
    @app.post("/api/patients/{patient_id}/doses")
    def api_log_dose(patient_id: str, req: DoseLogRequest, authorization: Optional[str] = Header(None)):
        if authorization:
            token = authorization.replace("Bearer ", "").strip()
            user = get_user_from_token(token)
            if user and user["role"] == "patient" and user["linked_id"] != patient_id:
                raise HTTPException(status_code=403, detail="Access denied.")

        success, msg, dose_info = log_patient_dose(
            patient_id=patient_id,
            medication_name=req.medication_name,
            dose_amount=req.dose_amount or "Standard dose",
            notes=req.notes or "Logged from Web App"
        )
        return {"status": "success", "message": msg, "dose": dose_info}

    @app.get("/api/patients")
    def api_get_patients():
        from backend.database import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT patient_id, full_name, age, ring_id, medication_name, medication_schedule, doses_per_day 
            FROM patient_profiles
        """)
        rows = c.fetchall()
        conn.close()
        patients = []
        for r in rows:
            patients.append({
                "patient_id": r["patient_id"],
                "full_name": r["full_name"],
                "age": r["age"],
                "medication_name": r["medication_name"],
                "medication_schedule": r["medication_schedule"],
                "doses_per_day": r["doses_per_day"],
                "ring_id": r["ring_id"] or "RING-7842",
                "ring_status": "active"
            })
        return {"status": "success", "patients": patients}

    @app.get("/patients/{patient_id}/overview")
    @app.get("/api/patients/{patient_id}/overview")
    def api_patient_overview(patient_id: str):
        """Doctor and Patient overview analytics with full longitudinal motor fluctuation data."""
        profile = get_patient_profile(patient_id)
        if not profile:
            profile = {
                "patient_id": patient_id,
                "full_name": "Eleanor Vance" if patient_id == "PD_01" else f"Patient {patient_id}",
                "age": 68,
                "medication_name": "Carbidopa/Levodopa 25/100 mg",
                "medication_schedule": "8:00 AM, 1:00 PM, 6:00 PM",
                "doses_per_day": 3,
                "ring_id": "RING-7842"
            }

        # Compute longitudinal data
        df_sim, doses = generate_30_day_longitudinal_data(patient_id=profile["patient_id"], base_severity=45.0)
        eff = analyze_medication_effectiveness(df_sim, doses)

        # Simplify timeline points for frontend chart rendering
        timeline_records = []
        for _, row in df_sim.iterrows():
            timeline_records.append({
                "day": int(row["day"]),
                "hour": float(row.get("hour", 12.0)),
                "time_label": str(row.get("time_label", "")),
                "dose_phase": str(row.get("dose_phase", "pre_dose")),
                "severity_score": round(float(row.get("severity_score", 0.0)), 1),
                "dominant_freq": round(float(row.get("dominant_frequency", 5.0)), 2),
                "is_flare_day": bool(row.get("is_flare_day", False))
            })

        return {
            "status": "success",
            "patient": profile,
            "effectiveness": eff,
            "timeline": timeline_records,
            "doses": doses,
            "recent_readings_count": len(df_sim),
            "disclaimer": "Decision-support tool — not a diagnosis. Clinical judgment required."
        }

    @app.get("/api/reports/{patient_id}/pdf")
    def api_export_patient_pdf(patient_id: str):
        from src.doctor_report import generate_monthly_doctor_pdf
        profile = get_patient_profile(patient_id)
        if not profile:
            profile = {
                "patient_id": patient_id,
                "full_name": "Eleanor Vance" if patient_id == "PD_01" else f"Patient {patient_id}",
                "age": 68,
                "ring_id": "RING-7842"
            }
        df_sim, doses = generate_30_day_longitudinal_data(patient_id=patient_id, base_severity=45.0)
        eff = analyze_medication_effectiveness(df_sim, doses)
        reports_dir = os.path.join(PROJECT_ROOT, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        pdf_path = os.path.join(reports_dir, f"TremorAI_{patient_id}_Report.pdf")
        generate_monthly_doctor_pdf(
            output_pdf_path=pdf_path,
            patient_id=patient_id,
            timeline_df=df_sim,
            doses_list=doses,
            effectiveness_result=eff,
            patient_meta=profile
        )
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=TremorAI_Report_{patient_id}.pdf"}
        )

    @app.get("/api/telemetry/live")
    def api_get_live_telemetry():
        telemetry_file = os.path.join(PROJECT_ROOT, "data", "live_telemetry.json")
        if os.path.exists(telemetry_file):
            try:
                with open(telemetry_file, "r") as f:
                    data = json.load(f)
                if not data.get("ring_id"):
                    data["ring_id"] = "RING-7842"
                return {"status": "success", "data": data}
            except Exception:
                pass
        return {
            "status": "baseline",
            "data": {
                "timestamp": time.time(),
                "ring_id": "RING-7842",
                "source": "resting_baseline",
                "prediction": {
                    "predicted_label": "healthy",
                    "confidence": 0.99,
                    "pd_probability": 0.01,
                    "class_probabilities": {"PD": 0.01, "ET": 0.01, "Physiological": 0.98}
                },
                "severity": {
                    "severity_score": 0.0,
                    "grade": "Minimal / None (0–10)",
                    "clinical_note": "Normal physiological resting baseline. No pathological 4-6 Hz tremor oscillation detected."
                },
                "features": {
                    "dominant_frequency": 0.0,
                    "tremor_band_power": 0.0,
                    "tremor_power_ratio": 0.0,
                    "signal_amplitude_rms": 0.012,
                    "jerk_rms": 0.04
                },
                "spectrum": {
                    "dominant_frequency": 0.0,
                    "freqs": [round(f, 2) for f in np.linspace(0.5, 20.0, 50).tolist()],
                    "psd": [0.001 for _ in range(50)]
                },
                "raw_latest": {
                    "ax": -0.012,
                    "ay": -0.008,
                    "az": 0.998,
                    "gx": 0.0,
                    "gy": 0.0,
                    "gz": 0.0,
                    "mag_dynamic": 0.001
                }
            }
        }

    # -------------------------------------------------------------------------
    # Web Bluetooth Telemetry Ingestion Endpoint
    # -------------------------------------------------------------------------
    _TELEMETRY_BUFFERS: Dict[str, Dict[str, Any]] = {}
    _ML_MODEL_CACHE = {"model": None, "scaler": None, "metrics": {}}

    def _get_ml_artifacts():
        if _ML_MODEL_CACHE["model"] is None:
            models_dir = os.path.join(PROJECT_ROOT, "models")
            try:
                m, s, met = load_trained_model(models_dir)
                _ML_MODEL_CACHE["model"] = m
                _ML_MODEL_CACHE["scaler"] = s
                _ML_MODEL_CACHE["metrics"] = met
            except Exception:
                _ML_MODEL_CACHE["model"] = None
        return _ML_MODEL_CACHE["model"], _ML_MODEL_CACHE["scaler"], _ML_MODEL_CACHE["metrics"]

    @app.post("/api/telemetry/ingest")
    def api_ingest_telemetry(req: TelemetryBatchRequest):
        """
        Receives 100 Hz MPU6050 telemetry batches directly from the web browser via Web Bluetooth.
        Runs Butterworth 0.5-20 Hz bandpass filter, 3D PSD feature extraction, ML classification,
        and updates data/live_telemetry.json in real time.
        """
        ring_id = req.ring_id.strip().upper()
        if not ring_id:
            raise HTTPException(status_code=400, detail="Missing ring_id")
        if not req.samples:
            return {"status": "empty", "message": "No samples in batch"}

        if ring_id not in _TELEMETRY_BUFFERS:
            _TELEMETRY_BUFFERS[ring_id] = {
                "accel": [],
                "gyro": [],
                "timestamps": []
            }

        buf = _TELEMETRY_BUFFERS[ring_id]
        for s in req.samples:
            if len(s) >= 7:
                ts = float(s[0]) / 1000.0
                ax, ay, az = float(s[1]), float(s[2]), float(s[3])
                gx, gy, gz = float(s[4]), float(s[5]), float(s[6])
                buf["accel"].append([ax, ay, az])
                buf["gyro"].append([gx, gy, gz])
                buf["timestamps"].append(ts)

        # Maintain buffer to max 500 samples
        if len(buf["accel"]) > 500:
            buf["accel"] = buf["accel"][-500:]
            buf["gyro"] = buf["gyro"][-500:]
            buf["timestamps"] = buf["timestamps"][-500:]

        window_samples = 300
        n_samples = len(buf["accel"])
        prediction = {"predicted_label": "healthy", "confidence": 0.99, "pd_probability": 0.0, "class_probabilities": {"healthy": 0.99, "pd": 0.0, "other": 0.01}}
        severity = {"severity_score": 0.0, "grade": "Minimal / Negligible", "clinical_note": "Awaiting full signal window"}
        features = {}

        if n_samples >= 100:
            accel_arr = np.array(buf["accel"][-window_samples:], dtype=np.float32)
            gyro_arr = np.array(buf["gyro"][-window_samples:], dtype=np.float32)

            if len(accel_arr) < window_samples:
                pad_len = window_samples - len(accel_arr)
                accel_arr = np.pad(accel_arr, ((pad_len, 0), (0, 0)), mode="edge")
                gyro_arr = np.pad(gyro_arr, ((pad_len, 0), (0, 0)), mode="edge")

            # 1. Preprocessing (0.5 to 20 Hz Butterworth)
            accel_filt = butter_bandpass_filter(accel_arr, lowcut=0.5, highcut=20.0, fs=100.0, order=4)
            gyro_filt = butter_bandpass_filter(gyro_arr, lowcut=0.5, highcut=20.0, fs=100.0, order=4)
            a_mag, g_mag = compute_magnitudes(accel_filt, gyro_filt)

            # 2. Features via window_dict
            window_dict = {
                "fs": 100.0,
                "accel_filtered": accel_filt,
                "gyro_filtered": gyro_filt,
                "accel_mag": a_mag,
                "gyro_mag": g_mag
            }
            features, spectrum_data = extract_window_features(window_dict)

            # 3. Model
            model, scaler, _ = _get_ml_artifacts()
            if model and scaler:
                prediction = predict_window(model, scaler, features)

            # 4. Severity
            severity = compute_severity_score(
                pd_probability=prediction["pd_probability"],
                tremor_band_power=features["tremor_band_power"],
                signal_amplitude_rms=features["signal_amplitude_rms"],
                predicted_label=prediction["predicted_label"]
            )

            # 5. Write to live_telemetry.json
            telemetry_out = os.path.join(PROJECT_ROOT, "data", "live_telemetry.json")
            os.makedirs(os.path.dirname(telemetry_out), exist_ok=True)
            payload = {
                "timestamp": time.time(),
                "ring_id": ring_id,
                "source": "web_bluetooth",
                "sample_count": n_samples,
                "features": features,
                "prediction": prediction,
                "severity": severity,
                "spectrum": {
                    "freqs": spectrum_data["freqs"][:80],
                    "psd": spectrum_data["psd"][:80],
                    "dominant_frequency": spectrum_data["dominant_frequency"]
                },
                "recent_accel": {
                    "ax": accel_arr[:, 0].tolist(),
                    "ay": accel_arr[:, 1].tolist(),
                    "az": accel_arr[:, 2].tolist(),
                    "mag": a_mag.tolist()
                },
                "recent_gyro": {
                    "gx": gyro_arr[:, 0].tolist() if len(gyro_arr) > 0 else [],
                    "gy": gyro_arr[:, 1].tolist() if len(gyro_arr) > 0 else [],
                    "gz": gyro_arr[:, 2].tolist() if len(gyro_arr) > 0 else [],
                    "mag": g_mag.tolist() if len(g_mag) > 0 else []
                },
                "raw_latest": {
                    "ax": round(float(accel_arr[-1, 0]), 4) if len(accel_arr) > 0 else 0.0,
                    "ay": round(float(accel_arr[-1, 1]), 4) if len(accel_arr) > 0 else 0.0,
                    "az": round(float(accel_arr[-1, 2]), 4) if len(accel_arr) > 0 else 0.0,
                    "gx": round(float(gyro_arr[-1, 0]), 2) if len(gyro_arr) > 0 else 0.0,
                    "gy": round(float(gyro_arr[-1, 1]), 2) if len(gyro_arr) > 0 else 0.0,
                    "gz": round(float(gyro_arr[-1, 2]), 2) if len(gyro_arr) > 0 else 0.0,
                    "mag_dynamic": round(float(a_mag[-1]), 5) if len(a_mag) > 0 else 0.0
                }
            }
            tmp = telemetry_out + ".tmp"
            with open(tmp, "w") as f:
                json.dump(payload, f)
            for _ in range(5):
                try:
                    os.replace(tmp, telemetry_out)
                    break
                except (PermissionError, OSError):
                    time.sleep(0.01)

        # If patient_id specified, pair or confirm pairing
        if req.patient_id:
            pair_ring_to_patient(req.patient_id, ring_id)

        return {
            "status": "success",
            "ring_id": ring_id,
            "received_samples": len(req.samples),
            "buffer_total": n_samples,
            "prediction": prediction,
            "severity": severity,
            "features": features,
            "spectrum": {
                "dominant_frequency": float(features.get("dominant_frequency", 0.0)),
                "tremor_band_power": float(features.get("tremor_band_power", 0.0)),
                "tremor_power_ratio": float(features.get("tremor_power_ratio", 0.0))
            } if features else {}
        }



    # -------------------------------------------------------------------------
    # Flutter App Bulk Record Upload
    # -------------------------------------------------------------------------
    class CompactRecord(BaseModel):
        session_id:   str
        timestamp_ms: int
        rms_x:        float
        rms_y:        float
        rms_z:        float
        peak_hz:      float
        severity:     float

    class SyncRecordsRequest(BaseModel):
        ring_id:    str
        session_id: str
        patient_id: Optional[str] = None
        records:    List[CompactRecord]

    @app.post("/tremor/sync-records")
    def api_sync_records(
        req: SyncRecordsRequest,
        current_user: Dict[str, Any] = Depends(get_current_user)
    ):
        """
        Receives bulk compact feature records uploaded by the Flutter patient app
        after a BLE sync from the ESP32 ring.

        Each record contains: timestamp_ms, rms_x/y/z, peak_hz, severity
        These are the pre-extracted features stored in ring flash.
        """
        if not req.records:
            return {"status": "ok", "uploaded": 0, "session_id": req.session_id}

        # Auto-pair ring if not already paired
        patient_id = req.patient_id or current_user.get("linked_id")
        if patient_id and req.ring_id:
            pair_ring_to_patient(patient_id, req.ring_id)

        # Persist records using the database module
        from backend.database import get_db_connection
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            # Ensure table exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS compact_tremor_records (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id       TEXT    NOT NULL,
                    patient_id    TEXT,
                    ring_id       TEXT    NOT NULL,
                    session_id    TEXT    NOT NULL,
                    timestamp_ms  INTEGER NOT NULL,
                    rms_x         REAL    NOT NULL,
                    rms_y         REAL    NOT NULL,
                    rms_z         REAL    NOT NULL,
                    peak_hz       REAL    NOT NULL,
                    severity      REAL    NOT NULL,
                    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
                )
            """)

            for r in req.records:
                cursor.execute("""
                    INSERT INTO compact_tremor_records
                        (user_id, patient_id, ring_id, session_id,
                         timestamp_ms, rms_x, rms_y, rms_z, peak_hz, severity)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    current_user["user_id"], patient_id, req.ring_id,
                    req.session_id, r.timestamp_ms,
                    r.rms_x, r.rms_y, r.rms_z, r.peak_hz, r.severity
                ))

            conn.commit()
            conn.close()
            uploaded = len(req.records)

            # Compute session summary
            severities = [r.severity for r in req.records]
            avg_sev = sum(severities) / len(severities) if severities else 0
            max_sev = max(severities) if severities else 0

            return {
                "status":         "success",
                "session_id":     req.session_id,
                "uploaded":       uploaded,
                "avg_severity":   round(avg_sev, 3),
                "max_severity":   round(max_sev, 3),
                "ring_id":        req.ring_id,
            }

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to store records: {str(e)}"
            )

    @app.get("/tremor/analysis/{patient_id}")
    def api_tremor_analysis(
        patient_id: str,
        current_user: Dict[str, Any] = Depends(get_current_user)
    ):
        """Returns summary analysis of compact records for a patient."""
        from backend.auth_service import get_db_connection
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    COUNT(*)                     as total_records,
                    AVG(severity)                as avg_severity,
                    MAX(severity)                as max_severity,
                    AVG(peak_hz)                 as avg_peak_hz,
                    MAX(timestamp_ms) / 1000     as last_ts
                FROM compact_tremor_records
                WHERE patient_id = ?
                  AND timestamp_ms > ?
            """, (patient_id,
                  int((time.time() - 7 * 86400) * 1000)))
            row = cursor.fetchone()
            conn.close()

            if not row or row[0] == 0:
                return {"status": "no_data", "records_7d": 0}

            return {
                "status":          "success",
                "records_7d":      row[0],
                "avg_severity_7d": round(float(row[1] or 0), 3),
                "max_severity_7d": round(float(row[2] or 0), 3),
                "avg_peak_hz_7d":  round(float(row[3] or 0), 2),
                "last_sync_ts":    row[4],
            }
        except Exception as e:
            return {"status": "error", "detail": str(e)}

    # -------------------------------------------------------------------------
    # Health Check
    # -------------------------------------------------------------------------
    @app.get("/health")
    def api_health():
        return {"status": "ok", "service": "Tremor AI Backend", "version": "1.0.0"}


if __name__ == "__main__":

    if FASTAPI_AVAILABLE:
        print("Starting Tremor Ai Backend REST API on port 8000...")
        uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=False)
    else:
        print("FastAPI / uvicorn not installed. Backend running embedded in Streamlit.")
