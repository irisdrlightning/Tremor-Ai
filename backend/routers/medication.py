from typing import Dict, Any
from fastapi import APIRouter

router = APIRouter(prefix="/api/medication", tags=["medication"])

MEDICATION_ANALYTICS_DATA: Dict[str, Any] = {
    "subject": {
        "name": "Biromon Jr.",
        "id": "TR-90241",
        "status": "STABLE",
        "updrsScore": 38,
        "updrsMax": 108,
        "confidenceText": "MEDICATION EFFECTIVE (96% Confidence)",
        "meanRestTremor": "1.82 Hz",
        "meanRestDelta": "(-44%)",
        "onStateStability": "88.4%",
        "onStateLabel": "Time",
    },
    "titration": {
        "updatedTime": "4m AGO",
        "spectralPower": {
            "tremorReduction": "-42.8%",
            "reductionUnit": "%",
            "status": "Status: Active Regimen",
            "sparkline": [12, 14, 13, 16, 15, 18, 17, 21, 25, 23, 27, 30],
        },
        "dosageStatus": {
            "tag": "TI-01",
            "medication": "Levodopa / Carb",
            "dosage": "100/25",
            "unit": "mg",
            "nextDose": "Next Dose: 42 mins",
            "window": "Window: Controlled",
        },
        "kineticBand": {
            "tag": "BAND PASS",
            "label": "Drift Variance",
            "value": "0.084",
            "unit": "g RMS",
            "channels": [
                {"label": "CH1", "active": False, "level": 25},
                {"label": "CH2", "active": False, "level": 35},
                {"label": "CH3", "active": True, "level": 85},
                {"label": "CH4", "active": True, "level": 70},
                {"label": "CH5", "active": False, "level": 30},
            ],
        },
        "compliance": {
            "rate": "100%",
            "label": "Dose Adherence",
            "taken": 28,
            "total": 28,
            "skippedText": "0 Skipped in 7 days",
        },
    },
    "timeline": {
        "rangeLabel": "OCT 01 - OCT 30",
        "subtitle": "Daily peak tremor amplitude suppression",
        "legend": [
            {"label": "Controlled", "color": "#16362e"},
            {"label": "Flare Window", "color": "#00e599"},
        ],
        "days": [
            {"day": "01", "val": 45, "isFlare": False},
            {"day": "02", "val": 48, "isFlare": False},
            {"day": "03", "val": 52, "isFlare": False},
            {"day": "04", "val": 42, "isFlare": False},
            {"day": "05", "val": 68, "isFlare": True},
            {"day": "06", "val": 40, "isFlare": False},
            {"day": "07", "val": 38, "isFlare": False},
            {"day": "08", "val": 44, "isFlare": False},
            {"day": "09", "val": 36, "isFlare": False},
            {"day": "10", "val": 39, "isFlare": False},
            {"day": "11", "val": 42, "isFlare": False},
            {"day": "12", "val": 65, "isFlare": True},
            {"day": "13", "val": 35, "isFlare": False},
            {"day": "14", "val": 37, "isFlare": False},
            {"day": "15", "val": 34, "isFlare": False},
            {"day": "16", "val": 33, "isFlare": False},
            {"day": "17", "val": 32, "isFlare": False},
            {"day": "18", "val": 35, "isFlare": False},
            {"day": "19", "val": 30, "isFlare": False},
            {"day": "20", "val": 28, "isFlare": False},
            {"day": "21", "val": 31, "isFlare": False},
            {"day": "22", "val": 29, "isFlare": False},
            {"day": "23", "val": 58, "isFlare": True},
            {"day": "24", "val": 26, "isFlare": False},
            {"day": "25", "val": 25, "isFlare": False},
            {"day": "26", "val": 24, "isFlare": False},
            {"day": "27", "val": 22, "isFlare": False},
            {"day": "28", "val": 20, "isFlare": False},
            {"day": "29", "val": 24, "isFlare": False},
            {"day": "30", "val": 28, "isFlare": True},
        ],
        "footer": {
            "format": "Format: Clinician HL7 / FHIR",
            "hash": "SHA-256 Verified",
        },
    },
    "sensorChannels": [
        {
            "id": "diurnal",
            "category": "DIURNAL CURVE",
            "title": "Hourly Variance",
            "subtitle": "08:00 - 20:00 (12h)",
            "type": "sine",
            "icon": "activity",
        },
        {
            "id": "hardware-sync",
            "category": "MPU6050 100 HZ",
            "title": "Hardware Sync",
            "subtitle": "Zero Drift Calibration",
            "status": "ACTIVE",
            "badge": "0.02ms lag",
            "icon": "radio",
        },
        {
            "id": "fft-spectrum",
            "category": "FFT SPECTRUM",
            "title": "Frequency Tracking",
            "subtitle": "Peak: 4.88 Hz (Suppressed)",
            "metricLabel": "SPECTRAL Q",
            "metricVal": "0.82 ratio",
            "icon": "bar-chart",
        },
    ],
}

@router.get("/analytics")
def get_medication_analytics():
    return MEDICATION_ANALYTICS_DATA
