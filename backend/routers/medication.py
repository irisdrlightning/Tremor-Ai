from typing import Dict, Any
from fastapi import APIRouter

router = APIRouter(prefix="/api/medication", tags=["medication"])

MEDICATION_ANALYTICS_DATA: Dict[str, Any] = {
    "subject": {
        "name": "George Peter",
        "id": "TR-90241",
        "status": "NO SESSION",
        "updrsScore": 0,
        "updrsMax": 108,
        "confidenceText": "AWAITING SENSOR DATA",
        "meanRestTremor": "0.00 Hz",
        "meanRestDelta": "(—)",
        "onStateStability": "0.0%",
        "onStateLabel": "Time",
    },
    "titration": {
        "updatedTime": "NOT UPDATED",
        "spectralPower": {
            "tremorReduction": "0.0%",
            "reductionUnit": "%",
            "status": "Status: Awaiting session",
            "sparkline": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "dosageStatus": {
            "tag": "NO RX",
            "medication": "Not prescribed",
            "dosage": "—",
            "unit": "mg",
            "nextDose": "Next Dose: Not scheduled",
            "window": "Window: No regimen active",
        },
        "kineticBand": {
            "tag": "NO DATA",
            "label": "Drift Variance",
            "value": "0.000",
            "unit": "g RMS",
            "channels": [
                {"label": "CH1", "active": False, "level": 0},
                {"label": "CH2", "active": False, "level": 0},
                {"label": "CH3", "active": False, "level": 0},
                {"label": "CH4", "active": False, "level": 0},
                {"label": "CH5", "active": False, "level": 0},
            ],
        },
        "compliance": {
            "rate": "0%",
            "label": "Dose Adherence",
            "taken": 0,
            "total": 0,
            "skippedText": "No doses logged yet",
        },
    },
    "timeline": {
        "rangeLabel": "No data yet",
        "subtitle": "Daily peak tremor amplitude suppression",
        "legend": [
            {"label": "Controlled", "color": "#16362e"},
            {"label": "Flare Window", "color": "#00e599"},
        ],
        "days": [
            {"day": "01", "val": 0, "isFlare": False},
            {"day": "02", "val": 0, "isFlare": False},
            {"day": "03", "val": 0, "isFlare": False},
            {"day": "04", "val": 0, "isFlare": False},
            {"day": "05", "val": 0, "isFlare": False},
            {"day": "06", "val": 0, "isFlare": False},
            {"day": "07", "val": 0, "isFlare": False},
            {"day": "08", "val": 0, "isFlare": False},
            {"day": "09", "val": 0, "isFlare": False},
            {"day": "10", "val": 0, "isFlare": False},
            {"day": "11", "val": 0, "isFlare": False},
            {"day": "12", "val": 0, "isFlare": False},
            {"day": "13", "val": 0, "isFlare": False},
            {"day": "14", "val": 0, "isFlare": False},
            {"day": "15", "val": 0, "isFlare": False},
            {"day": "16", "val": 0, "isFlare": False},
            {"day": "17", "val": 0, "isFlare": False},
            {"day": "18", "val": 0, "isFlare": False},
            {"day": "19", "val": 0, "isFlare": False},
            {"day": "20", "val": 0, "isFlare": False},
            {"day": "21", "val": 0, "isFlare": False},
            {"day": "22", "val": 0, "isFlare": False},
            {"day": "23", "val": 0, "isFlare": False},
            {"day": "24", "val": 0, "isFlare": False},
            {"day": "25", "val": 0, "isFlare": False},
            {"day": "26", "val": 0, "isFlare": False},
            {"day": "27", "val": 0, "isFlare": False},
            {"day": "28", "val": 0, "isFlare": False},
            {"day": "29", "val": 0, "isFlare": False},
            {"day": "30", "val": 0, "isFlare": False},
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
            "subtitle": "Awaiting session data",
            "type": "sine",
            "icon": "activity",
        },
        {
            "id": "hardware-sync",
            "category": "MPU6050 100 HZ",
            "title": "Hardware Sync",
            "subtitle": "X 0.000g  Y 0.000g  Z 0.000g",
            "status": "WAITING",
            "badge": "No device",
            "icon": "radio",
        },
        {
            "id": "fft-spectrum",
            "category": "FFT SPECTRUM",
            "title": "Frequency Tracking",
            "subtitle": "Peak: 0.00 Hz (No session)",
            "metricLabel": "SPECTRAL Q",
            "metricVal": "0.00 ratio",
            "icon": "bar-chart",
        },
    ],
}

@router.get("/analytics")
def get_medication_analytics():
    return MEDICATION_ANALYTICS_DATA
