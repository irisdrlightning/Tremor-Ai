from typing import List
from fastapi import APIRouter
from backend.models.schemas import SubjectOverview, ConditionItem, ScheduleData, SensorNode, DoseLogRequest

router = APIRouter(prefix="/api", tags=["kinematics"])

SUBJECT_DATA = SubjectOverview(
    name="George Peter",
    id="TR-90241",
    tremorRate="0.0",        # Hz — updated from live BLE session
    sampling="100 Hz BLE",
    rms="0.000g"             # g RMS — updated from live BLE session
)

CONDITIONS_DATA: List[ConditionItem] = [
    ConditionItem(
        id="spectral",
        tag="PENDING",
        icon="droplet",
        label="Power Ratio",
        value="0",
        unit="%",
        variant="bars"
    ),
    ConditionItem(
        id="ai",
        tag="—",
        icon="scan",
        label="AI Detection",
        value="Awaiting data",
        footer="NO SESSION",
        variant="highlight"
    ),
    ConditionItem(
        id="updrs",
        tag="NOT SCORED",
        icon="chart",
        label="MDS-UPDRS",
        value="0",
        unit="/100",
        variant="steps"
    ),
    ConditionItem(
        id="noise",
        tag="BASELINE",
        icon="funnel",
        label="Voluntary Noise",
        value="0.0",
        unit="Hz",
        variant="dots"
    )
]

SCHEDULE_DATA = ScheduleData(
    nextCheckup="Not scheduled",
    weekLabel="No session active",
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
        subtitle="X 0.000g  Y 0.000g  Z 0.000g",  # overwritten by live BLE data
        status="WAITING",
        meta="100 Hz"
    ),
    SensorNode(
        id="primary",
        code="PRIMARY STREAM",
        title="Active Hand Twin",
        subtitle="Awaiting device connection",
        highlight=True
    ),
    SensorNode(
        id="fft",
        code="FFT SPECTRUM",
        title="Sub-band Distribution",
        subtitle="Peak: 0.00 Hz (No session)",     # overwritten by session peak
        status="IDLE",
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
