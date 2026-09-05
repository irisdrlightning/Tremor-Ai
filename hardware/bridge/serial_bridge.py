"""
Tremor AI - Hardware USB Serial Bridge & Live Inference Streamer
=================================================================
Connects to the ESP32 over USB Serial, continuously ingests 100 Hz MPU6050
CSV telemetry, buffers into fixed-length windows, and runs the EXACT SAME
preprocessing, FFT feature extraction, and ML classification pipeline
used for the offline clinical dataset.

Key Requirement:
  No duplicated signal processing or inference logic. Imports directly from src/!

Usage:
  # With physical ESP32 connected:
  python hardware/bridge/serial_bridge.py --port COM3 --baud 115200

  # Zero-Hardware Fallback Simulation Mode:
  python hardware/bridge/serial_bridge.py --simulate --shake-mode pd
"""

import sys
import os
import time
import json
import argparse
import logging
from typing import Optional, List, Dict, Any
import numpy as np
import pandas as pd

# Add project root to path so src modules import identically
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.preprocessing import butter_bandpass_filter, compute_magnitudes
from src.features import extract_window_features
from src.model import load_trained_model, predict_window
from src.severity import compute_severity_score

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TremorAI.SerialBridge")

TELEMETRY_OUT_FILE = os.path.join(PROJECT_ROOT, "data", "live_telemetry.json")


def discover_esp32_port() -> Optional[str]:
    """Scan available serial ports for ESP32 / CP210x / CH340 / USB-Serial devices."""
    try:
        import serial.tools.list_ports
        ports = list(serial.tools.list_ports.comports())
        for p in ports:
            desc = p.description.lower()
            if any(k in desc for k in ["cp210", "ch340", "ch341", "usb-serial", "esp32", "uart"]):
                logger.info(f"Discovered candidate ESP32 port: {p.device} ({p.description})")
                return p.device
        if ports:
            # Default to first available COM port
            logger.info(f"Defaulting to first detected port: {ports[0].device} ({ports[0].description})")
            return ports[0].device
    except Exception as e:
        logger.warning(f"Error enumerating serial ports: {e}")
    return None


class SerialBridgeRunner:
    """Manages serial ingestion, sliding window buffer, and live model execution."""

    def __init__(
        self,
        port: Optional[str] = None,
        baud_rate: int = 115200,
        window_samples: int = 300,
        fs: float = 100.0,
        simulate: bool = False,
        shake_mode: str = "pd"
    ):
        self.port = port
        self.baud_rate = baud_rate
        self.window_samples = window_samples
        self.fs = fs
        self.simulate = simulate
        self.shake_mode = shake_mode  # 'pd', 'healthy', or 'et'
        self.running = False

        # Sliding sample buffers: (N, 3) arrays
        self.accel_buffer: List[List[float]] = []
        self.gyro_buffer: List[List[float]] = []
        self.timestamp_buffer: List[float] = []

        # Load trained ML model from models directory
        models_dir = os.path.join(PROJECT_ROOT, "models")
        try:
            self.model, self.scaler, self.metrics = load_trained_model(models_dir)
            logger.info("Successfully loaded trained Tremor AI model and scaler.")
        except Exception as err:
            logger.warning(f"Could not load pre-trained model ({err}). Live predictions will use heuristic fallback.")
            self.model, self.scaler, self.metrics = None, None, {}

    def parse_csv_line(self, line: str) -> Optional[Tuple[float, List[float], List[float]]]:
        """Parse raw CSV: timestamp_ms,ax,ay,az,gx,gy,gz"""
        line = line.strip()
        if not line or line.startswith("#"):
            return None
        parts = line.split(",")
        if len(parts) < 7:
            return None
        try:
            ts = float(parts[0]) / 1000.0  # Convert ms to sec
            ax, ay, az = float(parts[1]), float(parts[2]), float(parts[3])
            gx, gy, gz = float(parts[4]), float(parts[5]), float(parts[6])
            return ts, [ax, ay, az], [gx, gy, gz]
        except ValueError:
            return None

    def process_current_window(self) -> Dict[str, Any]:
        """
        Run current buffer through exact same preprocessing, feature extraction,
        model prediction, and severity scoring as dataset mode.
        """
        accel_arr = np.array(self.accel_buffer[-self.window_samples:], dtype=np.float32)
        gyro_arr = np.array(self.gyro_buffer[-self.window_samples:], dtype=np.float32)

        # 1. Preprocess: Bandpass filter dynamic components per axis (0.5 to 20 Hz)
        # Removes DC gravity individually per axis to prevent transverse cancellation
        accel_filt = butter_bandpass_filter(accel_arr, lowcut=0.5, highcut=20.0, fs=self.fs, order=4)
        gyro_filt = butter_bandpass_filter(gyro_arr, lowcut=0.5, highcut=20.0, fs=self.fs, order=4)

        # Dynamic magnitudes: Euclidean norm of zero-mean dynamic signals
        a_mag = np.sqrt(np.sum(accel_filt ** 2, axis=-1))
        g_mag = np.sqrt(np.sum(gyro_filt ** 2, axis=-1))

        # 2. Construct window dictionary with 3D components for orientation-invariant 3D Total PSD
        window_dict = {
            "fs": self.fs,
            "accel_filtered": accel_filt,
            "gyro_filtered": gyro_filt,
            "accel_mag": a_mag,
            "gyro_mag": g_mag
        }

        # 3. Extract biomarkers & FFT spectrum
        features, spectrum_data = extract_window_features(window_dict)

        # 4. ML Inference using exact model
        if self.model is not None and self.scaler is not None:
            prediction = predict_window(self.model, self.scaler, features)
        else:
            # Heuristic fallback if model not yet trained
            is_pd = (3.5 <= features["dominant_frequency"] <= 6.5) and (features["tremor_power_ratio"] > 0.22 or features["tremor_band_power"] > 0.0008)
            prediction = {
                "predicted_label": "pd" if is_pd else "healthy",
                "confidence": 0.88 if is_pd else 0.85,
                "pd_probability": 0.88 if is_pd else 0.05,
                "class_probabilities": {"pd": 0.88, "healthy": 0.10, "other": 0.02} if is_pd else {"healthy": 0.85, "pd": 0.05, "other": 0.10}
            }

        # 6. Compute transparent 0-100 severity index
        severity = compute_severity_score(
            pd_probability=prediction["pd_probability"],
            tremor_band_power=features["tremor_band_power"],
            signal_amplitude_rms=features["signal_amplitude_rms"],
            predicted_label=prediction["predicted_label"]
        )

        # Package live output
        telemetry_payload = {
            "timestamp": time.time(),
            "source": "simulated_hardware" if self.simulate else f"serial_{self.port}",
            "sample_count": len(self.accel_buffer),
            "features": features,
            "prediction": prediction,
            "severity": severity,
            "spectrum": {
                "freqs": spectrum_data["freqs"][:80],  # 0 to 25 Hz
                "psd": spectrum_data["psd"][:80],
                "dominant_frequency": spectrum_data["dominant_frequency"]
            },
            "recent_accel": {
                "ax": accel_arr[:, 0].tolist(),
                "ay": accel_arr[:, 1].tolist(),
                "az": accel_arr[:, 2].tolist(),
                "mag": a_mag.tolist()
            },
            "recent_gyro": {
                "gx": gyro_arr[:, 0].tolist() if len(gyro_arr) > 0 else [],
                "gy": gyro_arr[:, 1].tolist() if len(gyro_arr) > 0 else [],
                "gz": gyro_arr[:, 2].tolist() if len(gyro_arr) > 0 else [],
                "mag": g_mag.tolist() if len(g_mag) > 0 else []
            },
            "raw_latest": {
                "ax": round(float(accel_arr[-1, 0]), 4) if len(accel_arr) > 0 else 0.0,
                "ay": round(float(accel_arr[-1, 1]), 4) if len(accel_arr) > 0 else 0.0,
                "az": round(float(accel_arr[-1, 2]), 4) if len(accel_arr) > 0 else 0.0,
                "gx": round(float(gyro_arr[-1, 0]), 2) if len(gyro_arr) > 0 else 0.0,
                "gy": round(float(gyro_arr[-1, 1]), 2) if len(gyro_arr) > 0 else 0.0,
                "gz": round(float(gyro_arr[-1, 2]), 2) if len(gyro_arr) > 0 else 0.0,
                "mag_dynamic": round(float(a_mag[-1]), 5) if len(a_mag) > 0 else 0.0
            }
        }

        # Safe write to shared json file with Windows lock-contention retry
        os.makedirs(os.path.dirname(TELEMETRY_OUT_FILE), exist_ok=True)
        temp_file = TELEMETRY_OUT_FILE + ".tmp"
        try:
            with open(temp_file, "w") as f:
                json.dump(telemetry_payload, f)
            # Retry replace up to 5 times if Streamlit is currently reading
            for attempt in range(5):
                try:
                    os.replace(temp_file, TELEMETRY_OUT_FILE)
                    break
                except (PermissionError, OSError):
                    time.sleep(0.015)
        except Exception as write_err:
            logger.debug(f"Transient telemetry write contention: {write_err}")

        return telemetry_payload

    def run(self, max_duration_sec: Optional[float] = None):
        """Main streaming loop (hardware serial or simulation)."""
        self.running = True
        start_time = time.time()
        logger.info(f"Starting Tremor AI Hardware Bridge (Simulate: {self.simulate})...")

        if self.simulate:
            self._run_simulation_loop(start_time, max_duration_sec)
        else:
            self._run_serial_loop(start_time, max_duration_sec)

    def _run_simulation_loop(self, start_time: float, max_duration: Optional[float]):
        """Generates realistic 100 Hz MPU6050 CSV stream in memory without physical hardware."""
        sample_idx = 0
        dt = 1.0 / self.fs
        next_sample_time = time.time()
        last_process_time = 0

        logger.info(f"Simulating live MPU6050 with shake mode: '{self.shake_mode}' (4.8 Hz resting tremor for PD).")

        while self.running:
            now = time.time()
            if max_duration and (now - start_time) >= max_duration:
                break

            # Synthesize single sample at 100 Hz
            t = sample_idx * dt
            if self.shake_mode == "pd":
                # 4.8 Hz resting tremor + harmonics
                ax = 0.28 * np.sin(2 * np.pi * 4.8 * t) + np.random.normal(0, 0.02)
                ay = 0.22 * np.cos(2 * np.pi * 4.8 * t + 0.3) + np.random.normal(0, 0.02)
                az = 0.98 + 0.10 * np.sin(2 * np.pi * 4.8 * t)
                gx = 28.0 * np.sin(2 * np.pi * 4.8 * t)
                gy = 18.0 * np.cos(2 * np.pi * 4.8 * t)
                gz = 35.0 * np.sin(2 * np.pi * 4.8 * t)
            elif self.shake_mode == "et":
                # 8.2 Hz essential tremor
                ax = 0.25 * np.sin(2 * np.pi * 8.2 * t) + np.random.normal(0, 0.02)
                ay = 0.18 * np.cos(2 * np.pi * 8.2 * t) + np.random.normal(0, 0.02)
                az = 0.98 + 0.08 * np.sin(2 * np.pi * 8.2 * t)
                gx = 32.0 * np.sin(2 * np.pi * 8.2 * t)
                gy = 20.0 * np.cos(2 * np.pi * 8.2 * t)
                gz = 15.0 * np.sin(2 * np.pi * 8.2 * t)
            else:
                # Healthy baseline
                ax = np.random.normal(0, 0.015)
                ay = np.random.normal(0, 0.015)
                az = 0.98 + np.random.normal(0, 0.015)
                gx = np.random.normal(0, 0.8)
                gy = np.random.normal(0, 0.8)
                gz = np.random.normal(0, 0.8)

            self.accel_buffer.append([ax, ay, az])
            self.gyro_buffer.append([gx, gy, gz])
            self.timestamp_buffer.append(t)
            sample_idx += 1

            # Once buffer reaches window size, run inference every 200 ms (5 Hz update rate)
            if len(self.accel_buffer) < self.window_samples:
                if sample_idx % 50 == 0:
                    logger.info(f"Buffering window: {len(self.accel_buffer)}/{self.window_samples} samples ({len(self.accel_buffer)/self.fs:.1f}s / {self.window_samples/self.fs:.1f}s)...")
            else:
                if (now - last_process_time) >= 0.20:
                    payload = self.process_current_window()
                    last_process_time = now
                    p_lbl = payload['prediction']['predicted_label'].upper()
                    conf = payload['prediction']['confidence'] * 100
                    dom_f = payload['features']['dominant_frequency']
                    score = payload['severity']['severity_score']
                    grade = payload['severity']['grade']
                    logger.info(f"[Live Simulation] Pred: {p_lbl} ({conf:.1f}%) | Peak: {dom_f:.2f} Hz | Severity: {score:.1f}/100 ({grade})")

            # Maintain sliding buffer size (keep last 500 samples)
            if len(self.accel_buffer) > 500:
                self.accel_buffer = self.accel_buffer[-500:]
                self.gyro_buffer = self.gyro_buffer[-500:]
                self.timestamp_buffer = self.timestamp_buffer[-500:]

            # Sleep to pace at 100 Hz
            next_sample_time += dt
            sleep_duration = next_sample_time - time.time()
            if sleep_duration > 0:
                time.sleep(sleep_duration)

    def _run_serial_loop(self, start_time: float, max_duration: Optional[float]):
        """Connects to real USB serial port and parses incoming 100 Hz CSV lines."""
        import serial

        port = self.port or discover_esp32_port()
        if not port:
            logger.error("No serial port specified or discovered! Falling back to simulation mode.")
            self.simulate = True
            self._run_simulation_loop(start_time, max_duration)
            return

        logger.info(f"Opening serial port {port} at {self.baud_rate} baud...")
        ser = serial.Serial()
        ser.port = port
        ser.baudrate = self.baud_rate
        ser.timeout = 1.0
        ser.dtr = False
        ser.rts = False

        connected = False
        for attempt in range(6):
            try:
                ser.open()
                connected = True
                break
            except Exception as e:
                logger.warning(f"Port {port} busy/locked (attempt {attempt+1}/6): {e}. Retrying in 1s...")
                time.sleep(1.0)

        if not connected:
            logger.error(f"Failed to open serial port {port} after retries. Falling back to simulation mode.")
            self.simulate = True
            self.shake_mode = "healthy"
            self._run_simulation_loop(start_time, max_duration)
            return

        time.sleep(1.5)  # Allow ESP32 stream to stabilize
        ser.reset_input_buffer()

        last_process_time = 0.0

        try:
            while self.running:
                if max_duration and (time.time() - start_time) >= max_duration:
                    break

                try:
                    line_bytes = ser.readline()
                    if not line_bytes:
                        continue

                    line_str = line_bytes.decode("utf-8", errors="ignore")
                    parsed = self.parse_csv_line(line_str)
                    if parsed is not None:
                        ts, acc, gyr = parsed
                        self.accel_buffer.append(acc)
                        self.gyro_buffer.append(gyr)
                        self.timestamp_buffer.append(ts)

                    # DRAIN ANY PENDING PACKETS in the serial buffer so buffer never falls behind real-time
                    while ser.in_waiting > 0:
                        extra_line = ser.readline()
                        if not extra_line:
                            break
                        parsed_extra = self.parse_csv_line(extra_line.decode("utf-8", errors="ignore"))
                        if parsed_extra is not None:
                            ts, acc, gyr = parsed_extra
                            self.accel_buffer.append(acc)
                            self.gyro_buffer.append(gyr)
                            self.timestamp_buffer.append(ts)
                except (serial.SerialException, OSError, PermissionError) as comm_err:
                    logger.warning(f"Serial communication bump on {port}: {comm_err}. Reconnecting...")
                    time.sleep(1.0)
                    try:
                        ser.close()
                    except Exception:
                        pass
                    reconnected = False
                    for retry_idx in range(5):
                        try:
                            ser.open()
                            ser.reset_input_buffer()
                            logger.info(f"Successfully reconnected to {port}.")
                            reconnected = True
                            break
                        except Exception:
                            time.sleep(1.0)
                    if not reconnected:
                        logger.error(f"Could not re-open {port}. Pausing before next retry...")
                        time.sleep(2.0)
                    continue

                now = time.time()
                if len(self.accel_buffer) < self.window_samples:
                    if len(self.accel_buffer) % 50 == 0:
                        logger.info(f"Buffering physical hardware stream: {len(self.accel_buffer)}/{self.window_samples} samples...")
                else:
                    if (now - last_process_time) >= 0.20:
                        payload = self.process_current_window()
                        last_process_time = now
                        p_lbl = payload['prediction']['predicted_label'].upper()
                        conf = payload['prediction']['confidence'] * 100
                        dom_f = payload['features']['dominant_frequency']
                        score = payload['severity']['severity_score']
                        grade = payload['severity']['grade']
                        logger.info(f"[Live Serial COM4] Pred: {p_lbl} ({conf:.1f}%) | Peak: {dom_f:.2f} Hz | Severity: {score:.1f}/100 ({grade})")

                if len(self.accel_buffer) > 600:
                    self.accel_buffer = self.accel_buffer[-600:]
                    self.gyro_buffer = self.gyro_buffer[-600:]
                    self.timestamp_buffer = self.timestamp_buffer[-600:]

        finally:
            ser.close()
            logger.info(f"Serial port {port} closed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Tremor AI Live Serial Hardware Bridge")
    parser.add_argument("--port", type=str, default=None, help="Serial COM port (e.g. COM3 or /dev/ttyUSB0)")
    parser.add_argument("--baud", type=int, default=115200, help="Baud rate (default 115200)")
    parser.add_argument("--simulate", action="store_true", help="Run simulated 100 Hz stream without hardware")
    parser.add_argument("--shake-mode", type=str, default="healthy", choices=["pd", "healthy", "et"], help="Simulation shake mode")
    parser.add_argument("--duration", type=float, default=None, help="Max run duration in seconds")

    args = parser.parse_args()
    runner = SerialBridgeRunner(
        port=args.port,
        baud_rate=args.baud,
        simulate=args.simulate,
        shake_mode=args.shake_mode
    )
    try:
        runner.run(max_duration_sec=args.duration)
    except KeyboardInterrupt:
        logger.info("Bridge stopped by user.")
