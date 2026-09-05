from fastapi import APIRouter
from backend.models.schemas import AuthMeResponse, UserProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.get("/me", response_model=AuthMeResponse)
def get_current_user(role: str = "doctor"):
    """
    Stub authentication endpoint allowing role switching without real auth yet.
    Returns doctor profile by default, or patient profile if role='patient'.
    """
    if role == "doctor":
        return AuthMeResponse(
            role="doctor",
            user=UserProfile(name="Dr. Rita Sharma", initials="RS")
        )
    return AuthMeResponse(
        role="patient",
        user=UserProfile(name="George Peter", initials="GP")
    )
