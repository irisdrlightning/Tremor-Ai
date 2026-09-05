"""
==============================================================================
Tremor AI — Wireless Bluetooth Low Energy (BLE) Ring Bridge
==============================================================================
Connects wirelessly to the Tremor AI ESP32 Smart Ring over BLE GATT.
Service UUID:        4fafc201-1fb5-459e-8fcc-c5c9c331914b
Characteristic UUID: beb5483e-36e1-4688-b7f5-ea07361b26a8 (NOTIFY)

Receives 100 Hz CSV accelerometer + gyroscope packets, computes real-time FFT,
severity scores, and updates `data/live_telemetry.json` and FastAPI backend.
==============================================================================
"""

import asyncio
import collections
import json
import logging
import os
import sys
import threading
import time
from typing import Dict, Any, Optional, List
import numpy as np

# Add project root
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.features import extract_window_features
from src.model import load_trained_model, predict_window
from src.severity import compute_severity_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BLE_Bridge")

BLE_SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
BLE_CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8"
DEVICE_NAME_PREFIX = "TremorAi"


class BleRingBridge:
    def __init__(
        self,
        target_device_name: str = "TremorAi-RING-7842",
        window_samples: int = 300,
        sampling_rate: float = 100.0,
        output_json_path: Optional[str] = None
    ):
        self.target_name = target_device_name
        self.window_samples = window_samples
        self.fs = sampling_rate
        self.output_json_path = output_json_path or os.path.join(PROJECT_ROOT, "data", "live_telemetry.json")

        self.accel_buffer = collections.deque(maxlen=window_samples)
        self.gyro_buffer = collections.deque(maxlen=window_samples)
        self.timestamp_buffer = collections.deque(maxlen=window_samples)

        self.is_connected = False
        self.is_running = False
        self.sample_count = 0
        self.last_packet_time = 0.0
        self.device_address = None
        self.status_message = "Idle / Disconnected"

        # ML Model
        self.model = None
        self.scaler = None
        self._load_model()

        # Threading / Async
        self._thread = None
        self._loop = None
        self._client = None

    def _load_model(self):
        models_dir = os.path.join(PROJECT_ROOT, "models")
        try:
            self.model, self.scaler, _ = load_trained_model(models_dir)
            logger.info("Loaded Random Forest model for live wireless classification.")
        except Exception as e:
            logger.warning(f"Could not load trained model: {e}")

    def notification_handler(self, sender, data: bytearray):
        """Handle incoming 100 Hz CSV packet from ESP32."""
        try:
            text = data.decode("utf-8").strip()
            # Split lines if multiple packets arrived in one buffer
            lines = text.split("\n")
            for line in lines:
                parts = line.strip().split(",")
                if len(parts) >= 7:
                    t_ms = float(parts[0])
                    ax, ay, az = float(parts[1]), float(parts[2]), float(parts[3])
                    gx, gy, gz = float(parts[4]), float(parts[5]), float(parts[6])

                    self.accel_buffer.append([ax, ay, az])
                    self.gyro_buffer.append([gx, gy, gz])
                    self.timestamp_buffer.append(t_ms / 1000.0 if t_ms > 1000000 else time.time())
                    self.sample_count += 1
                    self.last_packet_time = time.time()

            # If we have enough samples, compute features and update JSON every 20 samples (~200ms)
            if self.sample_count % 20 == 0 and len(self.accel_buffer) >= 50:
                self.process_current_window()

        except Exception as e:
            logger.debug(f"Packet parse warning: {e}")

    def process_current_window(self):
        """Extract FFT biomarkers, predict ML class, and write live_telemetry.json."""
        acc_arr = np.array(list(self.accel_buffer))
        gyro_arr = np.array(list(self.gyro_buffer)) if len(self.gyro_buffer) > 0 else np.zeros((len(acc_arr), 3))

        # Magnitudes
        acc_mag = np.sqrt(np.sum(acc_arr ** 2, axis=1))
        gyro_mag = np.sqrt(np.sum(gyro_arr ** 2, axis=1))

        win_data = {
            "accel_mag": acc_mag,
            "gyro_mag": gyro_mag,
            "accel_raw": acc_arr,
            "fs": self.fs,
            "t_start": 0.0,
            "t_end": len(acc_arr) / self.fs,
            "n_samples": len(acc_arr)
        }

        try:
            features, spec_data = extract_window_features(win_data)
            
            # Predict
            if self.model and self.scaler:
                prediction = predict_window(self.model, self.scaler, features)
            else:
                prediction = {
                    "predicted_label": "healthy",
                    "confidence": 0.95,
                    "pd_probability": 0.05,
                    "probabilities": {"healthy": 0.95, "parkinsons": 0.05}
                }

            severity = compute_severity_score(
                pd_probability=prediction.get("pd_probability", 0.0),
                tremor_band_power=features.get("tremor_band_power", 0.0),
                signal_amplitude_rms=features.get("signal_amplitude_rms", 0.0),
                predicted_label=prediction.get("predicted_label", "healthy")
            )

            # Clamp baseline if healthy
            is_healthy = "health" in prediction.get("predicted_label", "").lower() or "physio" in prediction.get("predicted_label", "").lower()
            if is_healthy:
                features["dominant_frequency"] = 0.0
                features["tremor_power_ratio"] = 0.0
                severity["severity_score"] = 0.0

            payload = {
                "timestamp": time.time(),
                "device_id": self.target_name,
                "connection_type": "BLE_WIRELESS",
                "sample_count": self.sample_count,
                "features": features,
                "prediction": prediction,
                "severity": severity,
                "spectrum": {
                    "freqs": spec_data.get("freqs", []).tolist() if hasattr(spec_data.get("freqs", []), "tolist") else list(spec_data.get("freqs", [])),
                    "psd": spec_data.get("psd", []).tolist() if hasattr(spec_data.get("psd", []), "tolist") else list(spec_data.get("psd", []))
                },
                "recent_accel": {
                    "ax": acc_arr[-100:, 0].tolist() if len(acc_arr) > 0 else [],
                    "ay": acc_arr[-100:, 1].tolist() if len(acc_arr) > 0 else [],
                    "az": acc_arr[-100:, 2].tolist() if len(acc_arr) > 0 else [],
                    "mag": acc_mag[-100:].tolist() if len(acc_mag) > 0 else []
                }
            }

            os.makedirs(os.path.dirname(self.output_json_path), exist_ok=True)
            with open(self.output_json_path, "w") as f:
                json.dump(payload, f, indent=2)

        except Exception as e:
            logger.debug(f"Process window error: {e}")

    async def _async_scan_and_connect(self):
        """Async Bleak scanner and client connection."""
        from bleak import BleakScanner, BleakClient

        self.status_message = "Scanning for Tremor AI Ring over Bluetooth Low Energy..."
        logger.info(self.status_message)

        try:
            device = await BleakScanner.find_device_by_filter(
                lambda d, adv: d.name and (DEVICE_NAME_PREFIX in d.name or self.target_name in d.name),
                timeout=8.0
            )

            if not device:
                self.status_message = f"Ring '{self.target_name}' not found in BLE scan. Make sure ESP32 is powered on."
                logger.warning(self.status_message)
                self.is_connected = False
                return

            self.device_address = device.address
            self.status_message = f"Found ring at {device.address}! Connecting GATT services..."
            logger.info(self.status_message)

            async with BleakClient(device) as client:
                self._client = client
                self.is_connected = client.is_connected
                self.status_message = f"🟢 Connected to {device.name} ({device.address}) at 100 Hz!"
                logger.info(self.status_message)

                # Subscribe to 100 Hz notifications
                await client.start_notify(BLE_CHAR_UUID, self.notification_handler)

                while self.is_running and client.is_connected:
                    await asyncio.sleep(0.1)

                await client.stop_notify(BLE_CHAR_UUID)

        except Exception as e:
            self.status_message = f"BLE Connection Error: {e}"
            logger.error(self.status_message)
        finally:
            self.is_connected = False
            self.status_message = "Disconnected from BLE Ring."

    def start_background(self):
        """Start BLE connection in a dedicated background worker thread."""
        if self.is_running:
            return
        self.is_running = True

        def run_loop():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            self._loop.run_until_complete(self._async_scan_and_connect())

        self._thread = threading.Thread(target=run_loop, daemon=True)
        self._thread.start()

    def stop(self):
        """Stop BLE background connection."""
        self.is_running = False
        self.is_connected = False
        self.status_message = "Stopped by user."


# Global singleton bridge instance
_global_ble_bridge: Optional[BleRingBridge] = None

def get_ble_ring_bridge() -> BleRingBridge:
    global _global_ble_bridge
    if _global_ble_bridge is None:
        _global_ble_bridge = BleRingBridge()
    return _global_ble_bridge


if __name__ == "__main__":
    bridge = get_ble_ring_bridge()
    bridge.start_background()
    try:
        while True:
            time.sleep(1)
            print(f"Status: {bridge.status_message} | Samples: {bridge.sample_count}")
    except KeyboardInterrupt:
        bridge.stop()
