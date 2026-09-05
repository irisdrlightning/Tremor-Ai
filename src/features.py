"""
Tremor AI - Feature Extraction Module
=====================================
Extracts spectral (FFT), temporal, and kinematic features from segmented
accelerometer and gyroscope windows.

Key features isolate the clinically recognized 4.0 - 6.0 Hz Parkinsonian
resting tremor band, kinematic jerk, and spectral entropy.
"""

from typing import Dict, Any, Tuple, Optional
import numpy as np
from scipy.fft import rfft, rfftfreq


FEATURE_NAMES = [
    "dominant_frequency",      # Peak frequency in 2.0 - 12.0 Hz range (Hz)
    "tremor_band_power",        # Integrated PSD in 4.0 - 6.0 Hz band (g^2 / Hz)
    "tremor_power_ratio",       # Ratio of tremor band power to total signal power (0-1)
    "signal_amplitude_rms",     # Root-mean-square acceleration magnitude (g)
    "peak_to_peak_amplitude",   # Peak-to-peak amplitude difference (g)
    "jerk_rms",                 # Rate of change of acceleration derivative RMS (g/s)
    "spectral_entropy",         # Normalized Shannon entropy of the power spectrum (0-1)
    "gyro_tremor_power",        # Rotational tremor power in 4.0 - 6.0 Hz band ((deg/s)^2 / Hz)
    "harmonic_ratio"            # Ratio of power in 2nd harmonic band (8-12 Hz) to fundamental
]


def compute_spectral_entropy(psd: np.ndarray) -> float:
    """
    Compute normalized Shannon spectral entropy:
      H = - sum(p * log2(p)) / log2(N)
    A pure sinusoidal tremor has low entropy (~0.1 - 0.4),
    while random white noise or irregular movement has high entropy (~0.7 - 1.0).
    """
    total_power = np.sum(psd)
    if total_power <= 1e-12:
        return 1.0

    p = psd / total_power
    p = p[p > 0]  # avoid log(0)
    entropy = -np.sum(p * np.log2(p))
    max_entropy = np.log2(len(psd)) if len(psd) > 1 else 1.0
    return float(np.clip(entropy / max_entropy, 0.0, 1.0))


def compute_fft_spectrum(
    signal: np.ndarray, 
    fs: float = 100.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute real Fast Fourier Transform (rfft) with Hann window
    to prevent spectral leakage. Returns (frequencies, power_spectral_density).
    """
    n = len(signal)
    if n == 0:
        return np.array([]), np.array([])

    # Hann window
    window = np.hanning(n)
    windowed_signal = (signal - np.mean(signal)) * window

    # One-sided FFT
    fft_vals = rfft(windowed_signal)
    freqs = rfftfreq(n, d=1.0 / fs)

    # Power Spectral Density (PSD) normalized
    window_energy = np.sum(window ** 2)
    if window_energy <= 1e-12:
        psd = np.zeros_like(freqs)
    else:
        psd = (np.abs(fft_vals) ** 2) / (fs * window_energy)
        # Multiply by 2 for all except DC and Nyquist to preserve total power
        if len(psd) > 2:
            psd[1:-1] *= 2.0

    return freqs, psd


def extract_window_features(
    window_dict: Dict[str, Any]
) -> Tuple[Dict[str, float], Dict[str, Any]]:
    """
    Extract all digital biomarkers from a preprocessed window:
      - 3D Total PSD (orientation-invariant, no gravity cancellation) in 3.5 - 6.5 Hz band
      - Kinematic jerk metric across dynamic vector
      - Signal amplitude RMS, peak-to-peak, and spectral entropy
      
    Returns:
      (features_dict, spectral_plot_data)
    """
    fs = float(window_dict.get("fs", 100.0))
    accel_filtered = window_dict.get("accel_filtered", None)
    accel_mag = window_dict.get("accel_mag", None)
    gyro_filtered = window_dict.get("gyro_filtered", None)
    gyro_mag = window_dict.get("gyro_mag", None)
    dt = 1.0 / fs

    # 1. Compute PSD and time-domain metrics:
    # Prefer 3D filtered components to eliminate DC gravity cancellation in Euclidean norm
    if accel_filtered is not None and accel_filtered.ndim == 2 and accel_filtered.shape[1] == 3:
        freqs, psd_x = compute_fft_spectrum(accel_filtered[:, 0], fs=fs)
        _, psd_y = compute_fft_spectrum(accel_filtered[:, 1], fs=fs)
        _, psd_z = compute_fft_spectrum(accel_filtered[:, 2], fs=fs)
        psd = psd_x + psd_y + psd_z

        rms_amp = float(np.sqrt(np.mean(np.sum(accel_filtered ** 2, axis=-1))))
        p2p_amp = float(np.max([np.ptp(accel_filtered[:, k]) for k in range(3)]))
        jerk_series = np.diff(accel_filtered, axis=0) / dt
        jerk_rms = float(np.sqrt(np.mean(np.sum(jerk_series ** 2, axis=-1))))
    elif accel_mag is not None:
        freqs, psd = compute_fft_spectrum(accel_mag, fs=fs)
        rms_amp = float(np.sqrt(np.mean(accel_mag ** 2))) if len(accel_mag) > 0 else 0.0
        p2p_amp = float(np.ptp(accel_mag)) if len(accel_mag) > 0 else 0.0
        if len(accel_mag) > 1:
            jerk_series = np.diff(accel_mag) / dt
            jerk_rms = float(np.sqrt(np.mean(jerk_series ** 2)))
        else:
            jerk_rms = 0.0
    else:
        freqs = np.array([])
        psd = np.array([])
        rms_amp = 0.0
        p2p_amp = 0.0
        jerk_rms = 0.0

    # 2. Spectral Band Indices
    # Parkinsonian resting tremor clinically spans 3.85 - 6.2 Hz (MDS-UPDRS standards)
    # Walking footstep ground reaction double harmonics typically fall between 3.2 - 3.75 Hz
    tremor_mask = (freqs >= 3.85) & (freqs <= 6.2)
    voluntary_mask = (freqs >= 0.5) & (freqs < 3.85)
    broad_mask = (freqs >= 0.5) & (freqs <= 15.0)
    search_peak_mask = (freqs >= 0.8) & (freqs <= 12.0)
    harmonic_mask = (freqs >= 7.5) & (freqs <= 12.0)

    # Power calculations (trapezoidal integration)
    df_step = freqs[1] - freqs[0] if len(freqs) > 1 else 1.0
    tremor_power = float(np.sum(psd[tremor_mask]) * df_step) if np.any(tremor_mask) else 0.0
    voluntary_power = float(np.sum(psd[voluntary_mask]) * df_step) if np.any(voluntary_mask) else 0.0
    total_broad_power = float(np.sum(psd[broad_mask]) * df_step) if np.any(broad_mask) else 0.0
    harmonic_power = float(np.sum(psd[harmonic_mask]) * df_step) if np.any(harmonic_mask) else 0.0

    # Noise Floor & Quiescence Gate:
    # Sensor resting motionless on desk: total_broad_power < 0.00035 g^2 or RMS < 0.022 g
    is_stationary = (total_broad_power < 0.00035) or (rms_amp < 0.022 and tremor_power < 0.0003)

    # Dominant Frequency with intelligent tremor isolation
    if not is_stationary and np.any(search_peak_mask) and np.sum(psd[search_peak_mask]) > 1e-4:
        search_freqs = freqs[search_peak_mask]
        search_psd = psd[search_peak_mask]
        med_psd = float(np.median(search_psd)) if len(search_psd) > 0 else 1e-8
        max_psd = float(np.max(search_psd))
        global_peak_freq = float(search_freqs[np.argmax(search_psd)])

        # Check for resonant peak in tremor band
        if np.any(tremor_mask):
            tremor_freqs = freqs[tremor_mask]
            tremor_psds = psd[tremor_mask]
            max_tremor_psd = float(np.max(tremor_psds))
            tremor_peak_freq = float(tremor_freqs[np.argmax(tremor_psds)])
        else:
            max_tremor_psd = 0.0
            tremor_peak_freq = 0.0

        # Peak selection logic:
        # A. Global peak is inside clinical tremor band (3.85 - 6.2 Hz)
        if 3.85 <= global_peak_freq <= 6.2:
            dom_freq = global_peak_freq
        # B. Global peak is low-frequency (voluntary movement < 3.85 Hz), but there is also a distinct,
        #    prominent Parkinsonian tremor resonance in 3.85 - 6.2 Hz:
        elif global_peak_freq < 3.85 and 3.85 <= tremor_peak_freq <= 6.2 and max_tremor_psd >= 2.5 * max(med_psd, 1e-7) and tremor_power >= 0.0010 and tremor_power >= 0.40 * voluntary_power and max_tremor_psd >= 0.25 * max_psd:
            dom_freq = tremor_peak_freq
        # C. High frequency / Essential Tremor (>= 6.8 Hz)
        elif global_peak_freq >= 6.8 and max_psd >= 2.0 * max(med_psd, 1e-7):
            dom_freq = global_peak_freq
        # D. Pure voluntary movement / walking / cadence (< 3.85 Hz)
        elif max_psd >= 2.0 * max(med_psd, 1e-7):
            dom_freq = global_peak_freq
        else:
            dom_freq = 0.0
    else:
        dom_freq = 0.0

    tremor_ratio = float(tremor_power / total_broad_power) if total_broad_power > 1e-8 else 0.0
    tremor_ratio = float(np.clip(tremor_ratio, 0.0, 1.0))
    harmonic_ratio = float(harmonic_power / tremor_power) if tremor_power > 1e-8 else 0.0

    # 4. Spectral Entropy
    entropy = compute_spectral_entropy(psd[broad_mask] if np.any(broad_mask) else psd)

    # 5. Gyroscope Tremor Power (prefer 3D filtered components)
    if gyro_filtered is not None and gyro_filtered.ndim == 2 and gyro_filtered.shape[1] == 3:
        _, g_px = compute_fft_spectrum(gyro_filtered[:, 0], fs=fs)
        _, g_py = compute_fft_spectrum(gyro_filtered[:, 1], fs=fs)
        _, g_pz = compute_fft_spectrum(gyro_filtered[:, 2], fs=fs)
        gyro_psd = g_px + g_py + g_pz
        gyro_tremor_power = float(np.sum(gyro_psd[tremor_mask]) * df_step) if np.any(tremor_mask) else 0.0
    elif gyro_mag is not None and len(gyro_mag) > 0:
        _, gyro_psd = compute_fft_spectrum(gyro_mag, fs=fs)
        gyro_tremor_power = float(np.sum(gyro_psd[tremor_mask]) * df_step) if np.any(tremor_mask) else 0.0
    else:
        gyro_tremor_power = 0.0

    features = {
        "dominant_frequency": round(dom_freq, 2),
        "tremor_band_power": round(tremor_power, 6),
        "tremor_power_ratio": round(tremor_ratio, 4),
        "signal_amplitude_rms": round(rms_amp, 5),
        "peak_to_peak_amplitude": round(p2p_amp, 5),
        "jerk_rms": round(jerk_rms, 3),
        "spectral_entropy": round(entropy, 4),
        "gyro_tremor_power": round(gyro_tremor_power, 4),
        "harmonic_ratio": round(harmonic_ratio, 4)
    }

    spectrum_data = {
        "freqs": freqs.tolist(),
        "psd": psd.tolist(),
        "dominant_frequency": dom_freq,
        "tremor_band_power": tremor_power,
        "tremor_ratio": tremor_ratio
    }

    return features, spectrum_data


def features_dict_to_array(fdict: Dict[str, float]) -> np.ndarray:
    """Convert feature dictionary to a consistent numpy row vector for scikit-learn models."""
    return np.array([fdict.get(name, 0.0) for name in FEATURE_NAMES], dtype=np.float32)
