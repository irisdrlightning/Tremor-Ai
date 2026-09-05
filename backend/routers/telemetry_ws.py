import asyncio
import json
import math
import time
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.models.schemas import LiveGloveTelemetry, FrequencyNode

router = APIRouter(tags=["telemetry"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

def generate_telemetry_frame(t: float) -> LiveGloveTelemetry:
    """
    Synthesize realistic live glove kinematic data at ~10-20 Hz updates.
    Simulates ~5.1 Hz resting Parkinsonian tremor variations across anatomical nodes.
    """
    # Base tremor fluctuations
    freq_drift = 0.15 * math.sin(2 * math.pi * 0.2 * t)
    base_freq = 5.1 + freq_drift
    tremor_rate_str = f"{base_freq:.1f}"

    amp_mod = 0.85 + 0.15 * math.sin(2 * math.pi * 0.1 * t)
    rms_val = 0.142 * amp_mod
    rms_str = f"{rms_val:.3f}g"

    # Anatomical nodes matching LiveKinematics
    nodes = [
        FrequencyNode(
            id="node-d1",
            name="Thumb (D1)",
            freq=f"{base_freq - 0.3:.1f} Hz",
            amp=f"±{2.9 * amp_mod:.1f} mm",
            state="normal",
            top="54%",
            left="24%",
        ),
        FrequencyNode(
            id="node-d2",
            name="Index Tip (D2)",
            freq=f"{base_freq:.1f} Hz",
            amp=f"±{3.8 * amp_mod:.1f} mm",
            state="peak",
            top="16%",
            left="34%",
        ),
        FrequencyNode(
            id="node-d3",
            name="Middle Tip (D3)",
            freq=f"{base_freq + 0.1:.1f} Hz",
            amp=f"±{4.1 * amp_mod:.1f} mm",
            state="peak",
            top="12%",
            left="49%",
        ),
        FrequencyNode(
            id="node-d4",
            name="Ring Tip (D4)",
            freq=f"{base_freq - 0.1:.1f} Hz",
            amp=f"±{3.4 * amp_mod:.1f} mm",
            state="peak",
            top="18%",
            left="64%",
        ),
        FrequencyNode(
            id="node-d5",
            name="Pinky Tip (D5)",
            freq=f"{base_freq - 0.4:.1f} Hz",
            amp=f"±{2.2 * amp_mod:.1f} mm",
            state="normal",
            top="32%",
            left="78%",
        ),
        FrequencyNode(
            id="node-mcp",
            name="Metacarpal (MCP)",
            freq=f"{base_freq:.1f} Hz",
            amp=f"±{1.6 * amp_mod:.1f} mm",
            state="normal",
            top="48%",
            left="48%",
        ),
        FrequencyNode(
            id="node-wrist",
            name="Carpal / Wrist",
            freq="0.4 Hz",
            amp="±0.3 mm",
            state="baseline",
            top="84%",
            left="50%",
        ),
    ]

    # Synthesize small window of waveform points (e.g. 10 points for smooth svg wave render)
    waveform = [
        math.sin(2 * math.pi * base_freq * (t + i * 0.01)) for i in range(12)
    ]

    # Simulated IMU acceleration and angular velocity
    raw_imu = {
        "ax": round(0.28 * math.sin(2 * math.pi * base_freq * t), 4),
        "ay": round(0.22 * math.cos(2 * math.pi * base_freq * t), 4),
        "az": round(0.98 + 0.05 * math.sin(2 * math.pi * base_freq * t), 4),
        "gx": round(15.2 * math.sin(2 * math.pi * base_freq * t), 2),
        "gy": round(12.4 * math.cos(2 * math.pi * base_freq * t), 2),
        "gz": round(3.1 * math.sin(2 * math.pi * base_freq * t), 2),
    }

    return LiveGloveTelemetry(
        type="telemetry_update",
        timestamp=time.time(),
        subjectId="TR-90241",
        tremorRate=tremor_rate_str,
        rms=rms_str,
        nodes=nodes,
        waveform=waveform,
        rawImu=raw_imu,
    )

@router.websocket("/ws/live-telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        start_time = time.time()
        while True:
            t = time.time() - start_time
            payload = generate_telemetry_frame(t)
            await websocket.send_text(payload.model_dump_json())
            # Stream telemetry at 10 Hz (every 100ms) for smooth real-time updates
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
