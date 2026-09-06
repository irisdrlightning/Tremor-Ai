import sys
import os

# Ensure project root is on sys.path so 'backend' and 'src' can be imported in any runtime (e.g. Vercel)
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, ".."))
for path in [current_dir, parent_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.routers import auth, kinematics, medication, telemetry_ws, reports
except ModuleNotFoundError:
    from routers import auth, kinematics, medication, telemetry_ws, reports

app = FastAPI(
    title="Tremor AI API",
    description="FastAPI Backend for Tremor AI Clinical Telemetry & Live Glove Monitoring",
    version="1.0.0",
)

# Enable CORS for frontend Vite dev server (and any local origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(kinematics.router)
app.include_router(medication.router)
app.include_router(telemetry_ws.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "Tremor AI API",
        "endpoints": [
            "/api/auth/me",
            "/api/patient/overview",
            "/api/conditions",
            "/api/schedule",
            "/api/sensor-nodes",
            "/api/medication/analytics",
            "/api/reports/doctor-pdf",
            "/api/reports/session-pdf",
            "/ws/live-telemetry",
        ],
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
