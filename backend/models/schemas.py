from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class UserProfile(BaseModel):
    name: str
    initials: str

class AuthMeResponse(BaseModel):
    role: str
    user: UserProfile

class LoginRequest(BaseModel):
    portal: str = "patient"  # "patient" or "doctor"
    identifier: str = "TR-90241"
    passcode: Optional[str] = None

class LoginResponse(BaseModel):
    status: str = "success"
    role: str
    user: UserProfile
    token: Optional[str] = "stub-jwt-token-tremor-ai"

class SubjectOverview(BaseModel):
    name: str
    id: str
    tremorRate: str
    sampling: str
    rms: str

class ConditionItem(BaseModel):
    id: str
    tag: str
    icon: str
    label: str
    value: str
    unit: Optional[str] = None
    footer: Optional[str] = None
    variant: str

class TeamMember(BaseModel):
    initials: str
    name: str
    role: str

class ScheduleData(BaseModel):
    nextCheckup: str
    weekLabel: str
    days: List[int]
    activeDay: int
    team: List[TeamMember]

class SensorNode(BaseModel):
    id: str
    code: str
    title: str
    subtitle: str
    status: Optional[str] = None
    meta: Optional[str] = None
    highlight: Optional[bool] = None

class FrequencyNode(BaseModel):
    id: str
    name: str
    freq: str
    amp: str
    state: str
    top: Optional[str] = None
    left: Optional[str] = None

class LiveGloveTelemetry(BaseModel):
    type: str = "telemetry_update"
    timestamp: float
    subjectId: str
    tremorRate: str
    rms: str
    nodes: List[FrequencyNode]
    waveform: List[float]
    rawImu: Optional[Dict[str, float]] = None

class DoseLogRequest(BaseModel):
    patientId: str
    levodopa: int
    carbidopa: int
    timing: str
    motorState: str
