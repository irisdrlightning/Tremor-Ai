import numpy as np
import sys
sys.path.insert(0, '.')

from src.preprocessing import butter_bandpass_filter
from src.features import extract_window_features
from src.model import load_trained_model, predict_window
from src.severity import compute_severity_score

model, scaler, _ = load_trained_model('models')
fs = 100.0
t = np.linspace(0, 3, 300)

def test_stream(acc_raw, label_desc):
    acc_filt = butter_bandpass_filter(acc_raw, 0.5, 20.0, fs=fs)
    a_mag = np.sqrt(np.sum(acc_filt**2, axis=-1))
    w_dict = {'fs': fs, 'accel_filtered': acc_filt, 'accel_mag': a_mag}
    feats, spec = extract_window_features(w_dict)
    pred = predict_window(model, scaler, feats)
    sev = compute_severity_score(
        pred['pd_probability'],
        feats['tremor_band_power'],
        feats['signal_amplitude_rms'],
        pred['predicted_label']
    )
    p_lbl = pred['predicted_label'].upper()
    conf = pred['confidence'] * 100
    dom_f = feats['dominant_frequency']
    pwr = feats['tremor_band_power']
    ratio = feats['tremor_power_ratio']
    score = sev['severity_score']
    grade = sev['grade']
    print(f"[{label_desc}]")
    print(f"  -> Pred: {p_lbl} ({conf:.1f}%) | Peak: {dom_f:.2f} Hz | Pwr: {pwr:.5f} | Ratio: {ratio:.3f} | Severity: {score:.1f}/100 ({grade})")

# 1. Stationary desk
acc_stat = np.stack([
    -0.99 + np.random.normal(0, 0.005, 300),
    np.random.normal(0, 0.005, 300),
    0.06 + np.random.normal(0, 0.005, 300)
], axis=1)
test_stream(acc_stat, 'Case 1: Stationary Desk (Still Sensor)')

# 2. Voluntary glove motion (1.2 Hz)
acc_vol = np.stack([
    -0.9 + 0.2 * np.sin(2 * np.pi * 1.2 * t),
    0.15 * np.cos(2 * np.pi * 1.2 * t),
    0.05 + np.random.normal(0, 0.01, 300)
], axis=1)
test_stream(acc_vol, 'Case 2: Voluntary Glove Movement (1.2 Hz)')

# 3. Physical MPU6050 Transverse PD Vibration (0.08g on Y perpendicular to -0.99g X)
acc_pd_trans = np.stack([
    -0.99 + np.random.normal(0, 0.005, 300),
    0.08 * np.sin(2 * np.pi * 5.0 * t) + np.random.normal(0, 0.005, 300),
    0.06 + np.random.normal(0, 0.005, 300)
], axis=1)
test_stream(acc_pd_trans, 'Case 3: Physical MPU6050 Transverse Vibration (5.0 Hz, 0.08g on Y)')

# 4. Physical MPU6050 Tilted PD Vibration (0.10g at 45 deg tilt)
v = np.array([1, 1, 1]) / np.sqrt(3)
acc_pd_tilt = np.array([-0.99, 0, 0.06])[None, :] + (0.10 * np.sin(2 * np.pi * 4.8 * t))[:, None] * v[None, :] + np.random.normal(0, 0.005, (300, 3))
test_stream(acc_pd_tilt, 'Case 4: Physical MPU6050 Tilted Vibration (4.8 Hz, 0.10g 45-deg tilt)')

# 5. Essential Tremor (8.2 Hz)
acc_et = np.stack([
    -0.99 + np.random.normal(0, 0.005, 300),
    0.12 * np.sin(2 * np.pi * 8.2 * t) + np.random.normal(0, 0.005, 300),
    0.06 + np.random.normal(0, 0.005, 300)
], axis=1)
test_stream(acc_et, 'Case 5: Essential Tremor (8.2 Hz, 0.12g)')
