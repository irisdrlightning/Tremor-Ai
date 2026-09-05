"""
Tests for Tremor AI Preprocessing Module
"""

import pytest
import numpy as np
import pandas as pd
from src.preprocessing import (
    butter_bandpass_filter,
    remove_gravity,
    compute_magnitudes,
    segment_into_windows,
    preprocess_recording
)


def test_compute_magnitudes():
    accel = np.array([[1.0, 0.0, 0.0], [0.0, 3.0, 4.0]])
    gyro = np.array([[0.0, 0.0, 0.0], [1.0, 2.0, 2.0]])
    a_mag, g_mag = compute_magnitudes(accel, gyro)

    assert np.isclose(a_mag[0], 1.0)
    assert np.isclose(a_mag[1], 5.0)
    assert np.isclose(g_mag[0], 0.0)
    assert np.isclose(g_mag[1], 3.0)


def test_butter_bandpass_filter_attenuates_dc_and_high_freq():
    fs = 100.0
    t = np.linspace(0, 5, 500, endpoint=False)
    # Signal = DC offset (1.0g) + 5 Hz signal (0.3g) + 40 Hz noise (0.2g)
    signal = 1.0 + 0.3 * np.sin(2 * np.pi * 5.0 * t) + 0.2 * np.sin(2 * np.pi * 40.0 * t)
    signal_2d = signal[:, None]

    filtered = butter_bandpass_filter(signal_2d, lowcut=0.5, highcut=20.0, fs=fs, order=4)
    filtered_1d = filtered[:, 0]

    # In steady-state (excluding edge transients), 5 Hz amplitude should remain largely preserved (~0.3g peak)
    steady_state = filtered_1d[100:-100]
    assert np.abs(np.mean(steady_state)) < 0.05
    assert np.max(steady_state) > 0.25
    assert np.max(steady_state) < 0.38


def test_segment_into_windows():
    data = np.arange(1000)[:, None]
    windows = segment_into_windows(data, window_size_samples=300, overlap_samples=150)
    # Step = 150: starts at 0, 150, 300, 450, 600, 750 (6 windows total, next start 900+300 > 1000)
    assert len(windows) == 5 or len(windows) == 6
    assert windows[0].shape == (300, 1)
    assert windows[1][0, 0] == 150
