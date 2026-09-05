from typing import List
from fastapi import APIRouter
from backend.models.schemas import SubjectOverview, ConditionItem, ScheduleData, SensorNode, DoseLogRequest

router = APIRouter(prefix="/api", tags=["kinematics"])

SUBJECT_DATA = SubjectOverview(
    name="George Peter",
    id="TR-90241",
    tremorRate="5.1",
    sampling="100 Hz UART",
    rms="0.142g"
)

CONDITIONS_DATA: List[ConditionItem] = [
    ConditionItem(
        id="spectral",
        tag="SPECTRAL",
        icon="droplet",
        label="Power Ratio",
        value="84",
        unit="%",
        variant="bars"
    ),
    ConditionItem(
        id="ai",
        tag="94.2%",
        icon="scan",
        label="AI Detection",
        value="Parkinson's",
        footer="CONFIRMED",
        variant="highlight"
    ),
    ConditionItem(
        id="updrs",
        tag="MODERATE",
        icon="chart",
        label="MDS-UPDRS",
        value="42",
        unit="/100",
        variant="steps"
    ),
    ConditionItem(
        id="noise",
        tag="ISOLATED",
        icon="funnel",
        label="Voluntary Noise",
        value="< 0.8",
        unit="Hz",
        variant="dots"
    )
]

SCHEDULE_DATA = ScheduleData(
    nextCheckup="Fri, 24 Oct",
    weekLabel="20-Oct — 26-Oct",
    days=[20, 21, 22, 23, 24],
    activeDay=24,
    team=[
        {"initials": "ER", "name": "Dr. Emily Rochers", "role": "Movement Disorder Specialist"},
        {"initials": "SA", "name": "Dr. Steve Alex", "role": "Clinical Neurophysiologist"},
        {"initials": "JF", "name": "Dr. Johan Fraz", "role": "Telemetry Biophysicist"}
    ]
)

SENSOR_NODES_DATA: List[SensorNode] = [
    SensorNode(
        id="esp-994",
        code="ESP-994",
        title="Wrist IMU Node",
        subtitle="Pitch +2.4° • Roll -1.1°",
        status="SYNCED",
        meta="100 Hz"
    ),
    SensorNode(
        id="primary",
        code="PRIMARY STREAM",
        title="Active Hand Twin",
        subtitle="Dual 6-DOF Sensor Array",
        highlight=True
    ),
    SensorNode(
        id="fft",
        code="FFT SPECTRUM",
        title="Sub-band Distribution",
        subtitle="Peak: 5.12 Hz (Power: 2.81)",
        status="WINDOW",
        meta="Hann 512"
    )
]

@router.get("/patient/overview", response_model=SubjectOverview)
def get_patient_overview():
    return SUBJECT_DATA

@router.get("/conditions", response_model=List[ConditionItem])
def get_conditions():
    return CONDITIONS_DATA

@router.get("/schedule", response_model=ScheduleData)
def get_schedule():
    return SCHEDULE_DATA

@router.get("/sensor-nodes", response_model=List[SensorNode])
def get_sensor_nodes():
    return SENSOR_NODES_DATA

@router.post("/dose/log")
def log_dose(dose: DoseLogRequest):
    return {"status": "success", "message": "Dose logged successfully", "data": dose}
