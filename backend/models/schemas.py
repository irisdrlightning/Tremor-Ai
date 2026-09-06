from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class UserProfile(BaseModel):
    name: str
    initials: str
    id: Optional[str] = "TR-90241"
    email: Optional[str] = None
    role: Optional[str] = None
    age: Optional[int] = 67
    gender: Optional[str] = "Male"
    diagnosis: Optional[str] = "Parkinson's Disease (Stage II)"
    phone: Optional[str] = "+1 (555) 019-2834"
    attendingPhysician: Optional[str] = "Dr. Rita Sharma, MD"
    notes: Optional[str] = "Resting tremor predominant, right arm onset."

class AuthMeResponse(BaseModel):
    role: str
    user: UserProfile
    isAuthenticated: bool = True

class LoginRequest(BaseModel):
    portal: str = "patient"  # "patient" or "doctor"
    identifier: str = "TR-90241"
    passcode: Optional[str] = None

class LoginResponse(BaseModel):
    status: str = "success"
    role: str
    user: UserProfile
    token: Optional[str] = "stub-jwt-token-tremor-ai"
    message: Optional[str] = "Authentication successful"

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
    conditions: Optional[List[ConditionItem]] = None

class DoseLogRequest(BaseModel):
    patientId: str
    levodopa: int
    carbidopa: int
    timing: str
    motorState: str
