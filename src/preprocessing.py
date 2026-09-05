"""
Tremor AI - Signal Preprocessing Module
=======================================
Implements digital filtering (bandpass, gravity component removal) and 
sliding-window segmentation for IMU accelerometer and gyroscope signals.

Designed to be used identically by both the offline dataset pipeline and 
the real-time hardware serial bridge.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from scipy.signal import butter, filtfilt, sosfiltfilt, iirnotch


def compute_magnitudes(
    accel: np.ndarray, 
    gyro: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, Optional[np.ndarray]]:
    """
    Compute Euclidean vector magnitudes:
      a_mag = sqrt(ax^2 + ay^2 + az^2)
      g_mag = sqrt(gx^2 + gy^2 + gz^2)
    Provides orientation/rotation-invariance for wearable ring/watch movements.
    """
    a_mag = np.sqrt(np.sum(accel ** 2, axis=-1))
    g_mag = np.sqrt(np.sum(gyro ** 2, axis=-1)) if gyro is not None else None
    return a_mag, g_mag


def butter_bandpass_filter(
    data: np.ndarray, 
    lowcut: float = 0.5, 
    highcut: float = 20.0, 
    fs: float = 100.0, 
    order: int = 4
) -> np.ndarray:
    """
    Apply a zero-phase 4th order Butterworth bandpass filter.
    Preserves tremor frequencies (3-12 Hz) while removing DC gravity drift (<0.5 Hz)
    and high-frequency noise (>20 Hz).
    """
    nyq = 0.5 * fs
    low = max(0.01, lowcut / nyq)
    high = min(0.99, highcut / nyq)
    
    if low >= high:
        raise ValueError(f"Invalid bandpass cutoff: lowcut={lowcut}, highcut={highcut} for fs={fs}")
        
    sos = butter(order, [low, high], btype="bandpass", output="sos")
    
    # Check if data length is sufficient for filtfilt padlen
    padlen = 3 * (2 * order)
    if data.shape[0] <= padlen:
        # Fallback for very short segments
        return data - np.mean(data, axis=0)

    filtered = sosfiltfilt(sos, data, axis=0)
    return filtered


def remove_gravity(
    accel: np.ndarray, 
    fs: float = 100.0, 
    cutoff: float = 0.5
) -> np.ndarray:
    """
    Remove the static/slowly varying gravity vector (~1.0g DC component) 
    using a high-pass Butterworth filter.
    """
    nyq = 0.5 * fs
    normal_cutoff = cutoff / nyq
    sos = butter(2, normal_cutoff, btype="highpass", output="sos")
    
    padlen = 12
    if accel.shape[0] <= padlen:
        return accel - np.mean(accel, axis=0)

    accel_dynamic = sosfiltfilt(sos, accel, axis=0)
    return accel_dynamic


def segment_into_windows(
    data: np.ndarray, 
    window_size_samples: int = 300, 
    overlap_samples: int = 150
) -> List[np.ndarray]:
    """
    Slice continuous 1D or 2D time series into overlapping fixed-length windows.
    Default: 300 samples (3.0s at 100 Hz) with 150 sample (50%) overlap.
    """
    n_samples = data.shape[0]
    step = window_size_samples - overlap_samples
    if step <= 0:
        raise ValueError(f"Overlap ({overlap_samples}) must be smaller than window size ({window_size_samples})")

    windows = []
    for start in range(0, n_samples - window_size_samples + 1, step):
        end = start + window_size_samples
        windows.append(data[start:end])
        
    return windows


def preprocess_recording(
    df: pd.DataFrame,
    fs: float = 100.0,
    window_duration_sec: float = 3.0,
    overlap_ratio: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Full preprocessing pipeline for a continuous recording:
      1. Extract 3-axis accel and gyro arrays
      2. Remove gravity & apply 0.5 - 20 Hz bandpass filter
      3. Compute dynamic acceleration & gyro vector magnitudes
      4. Segment into overlapping windows
      5. Pack metadata per window
    """
    window_samples = int(window_duration_sec * fs)
    overlap_samples = int(window_samples * overlap_ratio)

    accel_raw = df[["accel_x", "accel_y", "accel_z"]].values
    gyro_raw = df[["gyro_x", "gyro_y", "gyro_z"]].values
    timestamps = df["timestamp"].values

    # 1. Bandpass filter dynamic components (0.5 to 20 Hz) per axis
    # Eliminates DC static gravity individually on each channel, avoiding non-linear Euclidean cancellation
    accel_filtered = butter_bandpass_filter(accel_raw, lowcut=0.5, highcut=20.0, fs=fs, order=4)
    gyro_filtered = butter_bandpass_filter(gyro_raw, lowcut=0.5, highcut=20.0, fs=fs, order=4)

    # 2. Dynamic magnitudes: Norm of zero-mean dynamic signals
    a_mag = np.sqrt(np.sum(accel_filtered ** 2, axis=-1))
    g_mag = np.sqrt(np.sum(gyro_filtered ** 2, axis=-1))

    # 3. Windowing
    step = window_samples - overlap_samples
    n_samples = len(df)
    window_list = []

    subject_id = str(df["subject_id"].iloc[0]) if "subject_id" in df.columns else "Unknown"
    label = str(df["label"].iloc[0]) if "label" in df.columns else "unknown"
    is_synthetic = bool(df["is_synthetic"].iloc[0]) if "is_synthetic" in df.columns else False

    for start in range(0, n_samples - window_samples + 1, step):
        end = start + window_samples
        w_dict = {
            "subject_id": subject_id,
            "label": label,
            "is_synthetic": is_synthetic,
            "t_start": float(timestamps[start]),
            "t_end": float(timestamps[end - 1]),
            "accel_raw": accel_raw[start:end],
            "accel_filtered": accel_filtered[start:end],
            "gyro_filtered": gyro_filtered[start:end],
            "accel_mag": a_mag[start:end],
            "gyro_mag": g_mag[start:end],
            "fs": fs
        }
        window_list.append(w_dict)

    return window_list
