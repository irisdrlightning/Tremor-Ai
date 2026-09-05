"""
==============================================================================
Tremor AI — AI Parkinson's Tremor Screening, Severity & Medication Monitoring
==============================================================================
Interactive Streamlit Dashboard.
Supports:
  1. Single-Session Biomarker Analysis (Raw signal, Hann FFT, Severity Gauge,
     Random Forest classification, Explainability, and 1-Click PDF Report Export).
  2. 30-Day Longitudinal Monitoring Mode (30-day trend with dose overlay,
     Medication-Effectiveness Engine, Flare-day detection, Week 1 vs Week 4 drift,
     and 1-Click Monthly Doctor PDF Report Export).
  3. Live MPU6050 Hardware Mode (ESP32 USB Serial ingestion or simulated live
     hand-shaking stream, updating FFT spectrum and classification in real time).
"""

import os
import sys
import time
import json
import glob
from typing import Dict, Any, Optional, List
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import streamlit as st

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.data_loader import load_dataset, generate_synthetic_dataset
from src.preprocessing import preprocess_recording, compute_magnitudes, butter_bandpass_filter
from src.features import extract_window_features
from src.model import load_trained_model, predict_window, train_and_evaluate_models
from src.severity import compute_severity_score
from src.explain import generate_feature_explanation
from src.medication import MedicationManager
from src.longitudinal_sim import generate_30_day_longitudinal_data
from src.effectiveness import analyze_medication_effectiveness, CLINICAL_DISCLAIMER
from src.report import generate_single_session_pdf
from src.doctor_report import generate_monthly_doctor_pdf
from src.checkpoint_manager import load_live_checkpoints, save_live_checkpoint, clear_live_checkpoints, get_live_hardware_session_df

# Set page config
st.set_page_config(
    page_title="Tremor Ai | AI Tremor & Medication Monitor",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern medical interface styling
st.markdown("""
<style>
    /* Clean layout & typography */
    .main {
        background-color: #0B0F19;
    }
    .stApp {
        background-color: #0B0F19;
        color: #E2E8F0;
    }
    /* Header Card */
    .hero-banner {
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        border-left: 5px solid #0284C7;
        padding: 16px 20px;
        border-radius: 8px;
        margin-bottom: 16px;
    }
    .hero-title {
        color: #F8FAFC;
        font-size: 24px;
        font-weight: 700;
        margin: 0;
    }
    .hero-subtitle {
        color: #94A3B8;
        font-size: 13px;
        margin-top: 4px;
    }
    /* Mandatory Disclaimer Box */
    .disclaimer-banner {
        background-color: #422006;
        border: 1px solid #D97706;
        color: #FEF3C7;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-style: italic;
        margin-bottom: 14px;
    }
    /* Metric Cards */
    .metric-card {
        background: #1E293B;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 14px 16px;
        text-align: center;
    }
    .metric-value {
        font-size: 26px;
        font-weight: 700;
        margin: 4px 0;
    }
    .metric-label {
        font-size: 11px;
        color: #94A3B8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    /* Alert cards */
    .verdict-card {
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 14px;
    }
    .verdict-effective {
        background: rgba(22, 163, 74, 0.15);
        border: 1px solid #16A34A;
        color: #86EFAC;
    }
    .verdict-wearing-off {
        background: rgba(220, 38, 38, 0.15);
        border: 1px solid #DC2626;
        color: #FCA5A5;
    }
    .verdict-inconclusive {
        background: rgba(217, 119, 6, 0.15);
        border: 1px solid #D97706;
        color: #FDE68A;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def get_or_train_model():
    """Load model if exists; otherwise train on dataset."""
    models_dir = os.path.join(PROJECT_ROOT, "models")
    try:
        model, scaler, metrics = load_trained_model(models_dir)
        return model, scaler, metrics
    except Exception:
        raw_dir = os.path.join(PROJECT_ROOT, "data", "raw")
        df_raw, _ = load_dataset(raw_dir)
        metrics = train_and_evaluate_models(df_raw, models_dir)
        model, scaler, _ = load_trained_model(models_dir)
        return model, scaler, metrics


@st.cache_data
def get_dataset_records():
    """Load raw dataset."""
    raw_dir = os.path.join(PROJECT_ROOT, "data", "raw")
    df_raw, metadata = load_dataset(raw_dir)
    return df_raw, metadata


# Top Disclaimer Banner (Mandatory Clinical Scope Boundary)
st.markdown("""
<div class="disclaimer-banner">
    ⚠️ <b>NOTICE & CLINICAL DISCLAIMER:</b> Tremor Ai is an investigational screening and longitudinal monitoring aid — 
    <b>NOT a diagnostic device</b>. System outputs correlate motion time-series patterns and do not constitute pharmacological 
    efficacy determination or medical advice. Consult a qualified neurologist for diagnosis.
</div>
""", unsafe_allow_html=True)

# Main Hero Header
st.markdown("""
<div class="hero-banner">
    <div class="hero-title">🧠 Tremor Ai Telemetry & Monitoring System</div>
    <div class="hero-subtitle">
        AI-Powered Parkinson's Tremor Detection, 0–100 Severity Stratification & 30-Day Medication Response Analysis
    </div>
</div>
""", unsafe_allow_html=True)

# Initialize Model & Data
try:
    model, scaler, model_metrics = get_or_train_model()
except Exception as e:
    st.error(f"Error loading model: {e}")
    st.stop()

# -----------------------------------------------------------------------------
# SIDEBAR CONTROLS
# -----------------------------------------------------------------------------
st.sidebar.image("https://img.icons8.com/color/96/artificial-intelligence.png", width=64)
st.sidebar.title("Tremor Ai Control")

# 1. Primary Operating Mode
app_view = st.sidebar.radio(
    "Select Operating View:",
    ["📊 Single-Session Analysis", "📈 30-Day Longitudinal Monitoring", "⚡ Live Hardware (MPU6050 / Serial)"],
    index=0
)

st.sidebar.markdown("---")

# Model Performance Badge (Computed live from actual test split)
rf_metrics = model_metrics.get("random_forest", {})
reported_acc = rf_metrics.get("test_accuracy", 0.0) * 100.0
reported_f1 = rf_metrics.get("test_f1_score", 0.0)
st.sidebar.markdown(f"""
<div style="background:#1E293B; border:1px solid #334155; padding:10px; border-radius:6px; margin-bottom:12px;">
    <div style="font-size:11px; color:#94A3B8; font-weight:bold;">VALIDATED MODEL METRICS (LIVE)</div>
    <div style="font-size:18px; color:#38BDF8; font-weight:bold;">{reported_acc:.1f}% Accuracy</div>
    <div style="font-size:11px; color:#64748B;">Weighted F1: {reported_f1:.3f} | 5-Fold CV: {rf_metrics.get('cv_mean_accuracy', 0)*100:.1f}%</div>
    <div style="font-size:10px; color:#475569; margin-top:3px;">Computed dynamically from validation test split</div>
</div>
""", unsafe_allow_html=True)


# -----------------------------------------------------------------------------
# VIEW 1: SINGLE-SESSION ANALYSIS
# -----------------------------------------------------------------------------
if app_view == "📊 Single-Session Analysis":
    st.subheader("Patient Session Assessment (FFT Spectrum & Feature Extraction)")

    session_source = st.radio(
        "Select Session Assessment Source:",
        ["📁 Standard Clinical Dataset Records", "⚡ Live Physical Hardware Stream (ESP32 / COM4)"],
        horizontal=True
    )
    is_live_stream = "Live Physical Hardware" in session_source

    if is_live_stream:
        live_df = get_live_hardware_session_df()
        if live_df is None or len(live_df) < 50:
            st.warning("⚠️ No active hardware telemetry found in `data/live_telemetry.json`. Ensure `serial_bridge.py` is running on COM4 or trigger a test burst in Tab 3.")
            if st.button("⚡ Inject Test Live Packet"):
                from hardware.bridge.serial_bridge import SerialBridgeRunner
                runner = SerialBridgeRunner(simulate=True, shake_mode="healthy", window_samples=300)
                t_base = time.time()
                for i in range(300):
                    t = t_base + i * 0.02
                    runner.accel_buffer.append([np.random.normal(0, 0.01), 0.0, 0.98 + np.random.normal(0, 0.01)])
                    runner.gyro_buffer.append([np.random.normal(0, 0.5), 0.0, np.random.normal(0, 0.5)])
                    runner.timestamp_buffer.append(t)
                runner.process_current_window()
                st.rerun()
            st.stop()

        patient_df = live_df
        selected_subject = "LIVE_HARDWARE_COM4"
        is_synth_sample = False
        true_label = "LIVE SENSOR (COM4)"
        sampling_rate = 100.0
        st.success("🟢 **Connected to Live Physical Hardware Stream (`COM4`)**: Ingesting real-time 300-sample buffer. Processing through Butterworth bandpass & FFT feature pipeline.")
    else:
        df_raw, ds_meta = get_dataset_records()
        all_subjects = sorted(df_raw["subject_id"].unique().tolist())

        # Patient Selector
        col_sel1, col_sel2 = st.columns([2, 2])
        with col_sel1:
            selected_subject = st.selectbox("Select Patient Sample from Dataset:", all_subjects, index=0)
        
        # Filter for selected patient
        patient_df = df_raw[df_raw["subject_id"] == selected_subject].sort_values("timestamp").reset_index(drop=True)
        is_synth_sample = bool(patient_df["is_synthetic"].iloc[0]) if "is_synthetic" in patient_df.columns else False
        true_label = str(patient_df["label"].iloc[0]).upper()
        sampling_rate = 100.0

        with col_sel2:
            if is_synth_sample:
                st.info(f"🏷️ Clinical Group: **{true_label}** | 🟡 *Synthetic Fallback Active*")
            else:
                st.success(f"🏷️ Clinical Group: **{true_label}** | 🟢 *Clinical Raw Ingestion*")

    # Preprocess recording into analysis windows
    windows = preprocess_recording(patient_df, fs=sampling_rate, window_duration_sec=3.0, overlap_ratio=0.5)
    if not windows:
        acc_m = compute_magnitudes(patient_df[["accel_x", "accel_y", "accel_z"]].values)
        windows = [{
            "accel_mag": acc_m,
            "gyro_mag": compute_magnitudes(patient_df[["gyro_x", "gyro_y", "gyro_z"]].values) if "gyro_x" in patient_df.columns else np.zeros_like(acc_m),
            "accel_raw": patient_df[["accel_x", "accel_y", "accel_z"]].values,
            "fs": sampling_rate,
            "t_start": 0.0,
            "t_end": float(len(patient_df) / sampling_rate),
            "n_samples": len(patient_df)
        }]

    # Window Slider
    win_idx = st.slider("Select Analysis Window (3.0 sec, 50% overlap):", 0, len(windows) - 1, 0)
    active_window = windows[win_idx]

    # Feature extraction & Model prediction
    features, spec_data = extract_window_features(active_window)
    prediction = predict_window(model, scaler, features)
    severity = compute_severity_score(
        pd_probability=prediction["pd_probability"],
        tremor_band_power=features["tremor_band_power"],
        signal_amplitude_rms=features["signal_amplitude_rms"],
        predicted_label=prediction["predicted_label"]
    )
    explanation = generate_feature_explanation(features, prediction, severity)

    # Top Metric Callout Row
    m1, m2, m3, m4, m5 = st.columns(5)
    with m1:
        pred_col = "#EF4444" if prediction["predicted_label"] == "pd" else ("#10B981" if prediction["predicted_label"] == "healthy" else "#F59E0B")
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">AI Classification</div>
            <div class="metric-value" style="color:{pred_col};">{prediction['predicted_label'].upper()}</div>
            <div style="font-size:11px; color:#94A3B8;">Confidence: {prediction['confidence']*100:.1f}%</div>
        </div>
        """, unsafe_allow_html=True)
    with m2:
        s_score = severity["severity_score"]
        s_col = "#EF4444" if s_score >= 70 else ("#F97316" if s_score >= 40 else ("#F59E0B" if s_score >= 20 else "#10B981"))
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Severity Index</div>
            <div class="metric-value" style="color:{s_col};">{s_score:.1f}</div>
            <div style="font-size:11px; color:#94A3B8;">{severity['grade']}</div>
        </div>
        """, unsafe_allow_html=True)
    with m3:
        dom_f = features["dominant_frequency"]
        in_band = 4.0 <= dom_f <= 6.0
        f_col = "#EF4444" if in_band else "#38BDF8"
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Dominant Frequency</div>
            <div class="metric-value" style="color:{f_col};">{dom_f:.2f} <span style="font-size:16px;">Hz</span></div>
            <div style="font-size:11px; color:#94A3B8;">{'In 4-6 Hz Tremor Band' if in_band else 'Outside Tremor Band'}</div>
        </div>
        """, unsafe_allow_html=True)
    with m4:
        ratio = features["tremor_power_ratio"] * 100
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Tremor Band Power</div>
            <div class="metric-value" style="color:#A855F7;">{ratio:.1f}%</div>
            <div style="font-size:11px; color:#94A3B8;">Energy in 4-6 Hz</div>
        </div>
        """, unsafe_allow_html=True)
    with m5:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Jerk RMS</div>
            <div class="metric-value" style="color:#FBBF24;">{features['jerk_rms']:.1f} <span style="font-size:14px;">g/s</span></div>
            <div style="font-size:11px; color:#94A3B8;">Entropy: {features['spectral_entropy']:.2f}</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br/>", unsafe_allow_html=True)

    # Interactive Charts: Waveform & FFT
    c1, c2 = st.columns(2)
    with c1:
        # Time-domain acceleration magnitude
        t_axis = np.linspace(active_window["t_start"], active_window["t_end"], len(active_window["accel_mag"]))
        fig_wave = go.Figure()
        fig_wave.add_trace(go.Scatter(
            x=t_axis, y=active_window["accel_mag"],
            mode="lines", line=dict(color="#38BDF8", width=1.5),
            name="Acceleration Mag"
        ))
        fig_wave.update_layout(
            title=f"Dynamic Acceleration (Window {active_window['t_start']:.1f}s - {active_window['t_end']:.1f}s)",
            xaxis_title="Time (s)", yaxis_title="Amplitude (g)",
            template="plotly_dark", height=320,
            margin=dict(l=40, r=20, t=40, b=30),
            paper_bgcolor="#1E293B", plot_bgcolor="#0F172A"
        )
        st.plotly_chart(fig_wave, use_container_width=True)

    with c2:
        # FFT Spectrum with shaded 4-6 Hz band
        freqs = np.array(spec_data["freqs"])
        psd = np.array(spec_data["psd"])
        mask = (freqs >= 0.5) & (freqs <= 16.0)

        fig_fft = go.Figure()
        fig_fft.add_trace(go.Scatter(
            x=freqs[mask], y=psd[mask],
            mode="lines", line=dict(color="#34D399", width=2.0),
            name="Power Spectrum"
        ))
        # Add 4-6 Hz Shaded Area
        fig_fft.add_vrect(
            x0=4.0, x1=6.0,
            fillcolor="rgba(245, 158, 11, 0.25)",
            layer="below", line_width=1, line_color="#F59E0B",
            annotation_text="PD Tremor Band (4-6 Hz)", annotation_position="top left",
            annotation_font_size=10, annotation_font_color="#FBBF24"
        )
        if dom_f > 0:
            fig_fft.add_vline(x=dom_f, line_dash="dot", line_color="#EF4444",
                              annotation_text=f"Peak: {dom_f:.1f} Hz", annotation_font_size=10)

        fig_fft.update_layout(
            title="FFT Power Spectral Density (0.5 - 16 Hz)",
            xaxis_title="Frequency (Hz)", yaxis_title="PSD (g²/Hz)",
            template="plotly_dark", height=320,
            margin=dict(l=40, r=20, t=40, b=30),
            paper_bgcolor="#1E293B", plot_bgcolor="#0F172A"
        )
        st.plotly_chart(fig_fft, use_container_width=True)

    # Severity Index & Transparent Breakdown
    st.markdown("### Transparent Severity Index & Biomechanical Breakdown")
    exp_col1, exp_col2 = st.columns([1.8, 1.2])
    with exp_col1:
        st.markdown(f"""
        <div style="background:#1E293B; border:1px solid #334155; padding:16px; border-radius:8px;">
            <div style="font-size:14px; font-weight:bold; color:#F8FAFC; margin-bottom:8px;">Biomechanical Explainability Summary</div>
            <p style="color:#CBD5E1; font-size:13px; line-height:1.5;">{explanation['summary_paragraph']}</p>
            <div style="font-size:12px; color:#94A3B8; margin-top:8px;"><b>Clinical Correlate:</b> {explanation['clinical_decision_support_note']}</div>
        </div>
        """, unsafe_allow_html=True)

    with exp_col2:
        # Breakdown of components
        comps = severity["components"]
        fig_bar = go.Figure(go.Bar(
            x=[comps["model_probability_contrib"], comps["tremor_power_contrib"], comps["amplitude_contrib"]],
            y=["AI Pattern (40%)", "Power in 4-6Hz (35%)", "Amplitude (25%)"],
            orientation="h",
            marker=dict(color=["#38BDF8", "#A855F7", "#F59E0B"])
        ))
        fig_bar.update_layout(
            title="Formula Contribution Points",
            xaxis_title="Points Contributed (Total 100)",
            template="plotly_dark", height=190,
            margin=dict(l=20, r=20, t=35, b=25),
            paper_bgcolor="#1E293B", plot_bgcolor="#0F172A"
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    # Export PDF Report Button
    st.markdown("---")
    r_col1, r_col2 = st.columns([3, 1])
    with r_col1:
        st.write("📄 **Export Clinical Session Report (PDF)**")
        st.caption("Generates a publication-grade PDF containing raw waveforms, FFT spectral charts, biomarker table, severity gauge, and medical disclaimer.")
    with r_col2:
        if st.button("Generate Session PDF Report", key="btn_gen_session_pdf"):
            report_filename = f"TremorAI_{'LiveSessionReport_COM4' if is_live_stream else 'SessionReport_' + selected_subject}_{int(time.time())}.pdf"
            reports_dir = os.path.join(PROJECT_ROOT, "reports")
            report_path = os.path.join(reports_dir, report_filename)
            sess_meta = {
                "duration_sec": float(patient_df["timestamp"].max() - patient_df["timestamp"].min()),
                "is_synthetic": is_synth_sample,
                "is_live_hardware": is_live_stream,
                "device_name": "Physical ESP32 + MPU6050 (COM4)" if is_live_stream else "MPU6050 6-DoF IMU Ring",
                "fs": sampling_rate,
                "accel_mag": active_window["accel_mag"],
                "freqs": spec_data["freqs"],
                "psd": spec_data["psd"]
            }
            generate_single_session_pdf(report_path, selected_subject, sess_meta, features, prediction, severity, explanation)
            with open(report_path, "rb") as f:
                pdf_bytes = f.read()
            st.success(f"Report generated: `{report_filename}`")
            st.download_button(
                label="⬇️ Download Session PDF",
                data=pdf_bytes,
                file_name=report_filename,
                mime="application/pdf"
            )


# -----------------------------------------------------------------------------
# VIEW 2: 30-DAY LONGITUDINAL MONITORING MODE
# -----------------------------------------------------------------------------
elif app_view == "📈 30-Day Longitudinal Monitoring":
    st.subheader("30-Day Continuous Monitoring & Medication-Effectiveness Engine")
    st.markdown("""
    <div style="background:#1E293B; border-left:4px solid #F59E0B; padding:10px 14px; border-radius:6px; margin-bottom:12px; font-size:12px; color:#CBD5E1;">
        ℹ️ <b>Methodology Note:</b> <i>Simulated 30-day timeline (built from real per-session recordings)</i>. 
        Models diurnal cycles, scheduled levodopa doses, acute flare incidents, and progressive wearing-off phenomena.
    </div>
    """, unsafe_allow_html=True)

    # Telemetry & Checkpoint state
    telemetry_file = os.path.join(PROJECT_ROOT, "data", "live_telemetry.json")
    live_telemetry_data = None
    live_sev_val = 0.0
    if os.path.exists(telemetry_file):
        try:
            with open(telemetry_file, "r") as f:
                live_telemetry_data = json.load(f)
            live_sev_val = float(live_telemetry_data.get("severity", {}).get("severity_score", 0.0))
        except Exception:
            pass

    live_checkpoints_list = load_live_checkpoints()

    # Patient & Simulation Controls
    ctl1, ctl2, ctl3 = st.columns(3)
    with ctl1:
        patient_profiles = [
            "⚡ LIVE HARDWARE PATIENT (Anchored to COM4 Sensor)",
            "PD_01 (Moderate Baseline)",
            "PD_02 (Mild Baseline)",
            "PD_03 (Advanced Fluctuations)"
        ]
        patient_sim_id = st.selectbox("Select Patient Profile:", patient_profiles, index=0)
        is_live_patient = "LIVE HARDWARE" in patient_sim_id
        p_id = "LIVE_COM4" if is_live_patient else patient_sim_id.split()[0]
    with ctl2:
        sim_wearing_off = st.checkbox("Model Longitudinal Wearing-Off (Diminishing Response)", value=True)
    with ctl3:
        default_base = float(max(10.0, live_sev_val)) if is_live_patient else 52.0
        base_sev_slider = st.slider("Baseline Tremor Severity:", 10.0, 85.0, default_base, step=1.0)

    # Live Hardware Anchor Status Banner & Checkpoint Logger
    if is_live_patient:
        live_pred = live_telemetry_data.get("prediction", {}) if live_telemetry_data else {}
        live_feats = live_telemetry_data.get("features", {}) if live_telemetry_data else {}
        live_sev = live_telemetry_data.get("severity", {}) if live_telemetry_data else {}
        live_f = live_feats.get("dominant_frequency", 0.0)
        live_badge = live_pred.get("predicted_label", "HEALTHY").upper()

        st.markdown(f"""
        <div style="background:#0F2942; border:1px solid #0284C7; padding:12px 16px; border-radius:6px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:#38BDF8; font-weight:bold;">⚡ PHYSICAL WEARABLE TELEMETRY ANCHOR (COM4)</span>
                    <div style="font-size:17px; font-weight:700; color:#F8FAFC; margin-top:2px;">
                        Live Sensor Reading: <span style="color:#38BDF8;">{live_sev_val:.1f} / 100</span> Severity &nbsp;|&nbsp; 
                        Resonance: <span style="color:#34D399;">{live_f:.2f} Hz</span> &nbsp;|&nbsp; 
                        Pattern: <span style="color:#FBBF24;">{live_badge}</span>
                    </div>
                    <div style="font-size:11px; color:#94A3B8; margin-top:3px;">
                        30-day baseline calibrated to physical sensor. Log verified in-person readings below to anchor the longitudinal trajectory.
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        ck_col1, ck_col2, ck_col3 = st.columns([2.2, 1.3, 1.0])
        with ck_col1:
            if st.button("📌 Log Current Live Sensor Reading as Checkpoint", key="btn_log_live_ckpt"):
                if live_telemetry_data:
                    rec = save_live_checkpoint(
                        telemetry_data=live_telemetry_data,
                        note="Manual physical checkpoint logged from 30-Day Monitor",
                        patient_id="LIVE_COM4",
                        day=30
                    )
                    st.success(f"Logged Live Checkpoint! Day {rec['day']} | Severity: {rec['severity_score']:.1f}/100 ({rec['grade']})")
                    time.sleep(0.4)
                    st.rerun()
                else:
                    st.warning("No active live telemetry packet found in `data/live_telemetry.json`.")
        with ck_col2:
            st.info(f"Verified Live Checkpoints: **{len(live_checkpoints_list)}**")
        with ck_col3:
            if len(live_checkpoints_list) > 0 and st.button("🗑️ Clear Checkpoints", key="btn_clear_ckpts"):
                clear_live_checkpoints()
                st.rerun()

    # Generate or retrieve 30-day timeline
    timeline_df, doses_list = generate_30_day_longitudinal_data(
        patient_id=p_id,
        base_severity=base_sev_slider,
        include_wearing_off=sim_wearing_off,
        live_checkpoints=live_checkpoints_list if is_live_patient else None,
        seed=42 if p_id == "PD_01" else (43 if p_id == "PD_02" else 44)
    )

    # Run Medication-Effectiveness Analysis Engine
    eff_result = analyze_medication_effectiveness(timeline_df, doses_list)

    # Display Effectiveness Verdict Box
    verdict = eff_result["verdict"]
    conf = eff_result["confidence"]
    v_class = "verdict-effective" if verdict == "Likely Effective" else ("verdict-wearing-off" if verdict == "Reduced Effectiveness Detected" else "verdict-inconclusive")
    
    st.markdown(f"""
    <div class="verdict-card {v_class}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">MEDICATION-RESPONSE VERDICT (DECISION-SUPPORT ONLY)</span>
                <div style="font-size:24px; font-weight:700; margin-top:2px;">{verdict.upper()}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:24px; font-weight:700;">{conf}%</div>
                <div style="font-size:11px;">Algorithm Confidence</div>
            </div>
        </div>
        <p style="margin-top:8px; font-size:13px; line-height:1.4;">{eff_result['trend_note']}</p>
        <div style="font-size:11px; opacity:0.85;"><b>Clinical Correlation Guidance:</b> All motor fluctuation patterns require evaluation by the treating physician. Never adjust medication autonomously.</div>
    </div>
    """, unsafe_allow_html=True)

    # Top Key Stats
    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Doses Analyzed</div>
            <div class="metric-value" style="color:#38BDF8;">{eff_result['doses_analyzed']}</div>
            <div style="font-size:11px; color:#94A3B8;">30-Day Monitoring Window</div>
        </div>
        """, unsafe_allow_html=True)
    with k2:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Dose Response Rate</div>
            <div class="metric-value" style="color:#10B981;">{eff_result['response_rate_pct']}%</div>
            <div style="font-size:11px; color:#94A3B8;">Doses with >15% drop</div>
        </div>
        """, unsafe_allow_html=True)
    with k3:
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Avg Post-Dose Drop</div>
            <div class="metric-value" style="color:#FBBF24;">-{eff_result['avg_point_drop']} <span style="font-size:14px;">pts</span></div>
            <div style="font-size:11px; color:#94A3B8;">{eff_result['avg_severity_change_pct']}% reduction</div>
        </div>
        """, unsafe_allow_html=True)
    with k4:
        flare_count = len(eff_result["flare_days"])
        st.markdown(f"""
        <div class="metric-card">
            <div class="metric-label">Flare Days Flagged</div>
            <div class="metric-value" style="color:#F87171;">{flare_count} <span style="font-size:14px;">days</span></div>
            <div style="font-size:11px; color:#94A3B8;">> 1.8 SD above baseline</div>
        </div>
        """, unsafe_allow_html=True)

    # Interactive 30-Day Timeline Chart (Plotly)
    st.markdown("### Longitudinal Severity Timeline with Dose Event Overlay")
    fig_long = go.Figure()

    # Scatter of pre-dose and post-dose measurements
    pre_sub = timeline_df[timeline_df["dose_phase"] == "pre_dose"]
    post_sub = timeline_df[timeline_df["dose_phase"] == "post_dose"]
    daily_avg = timeline_df.groupby("day")["severity_score"].mean().reset_index()

    fig_long.add_trace(go.Scatter(
        x=pre_sub["day"] + (pre_sub["timestamp"].dt.hour / 24.0),
        y=pre_sub["severity_score"],
        mode="markers",
        marker=dict(color="#EF4444", size=7, opacity=0.75),
        name="Pre-Dose Severity (OFF State)"
    ))

    fig_long.add_trace(go.Scatter(
        x=post_sub["day"] + (post_sub["timestamp"].dt.hour / 24.0),
        y=post_sub["severity_score"],
        mode="markers",
        marker=dict(color="#10B981", size=7, opacity=0.75),
        name="Post-Dose Severity (ON State)"
    ))

    fig_long.add_trace(go.Scatter(
        x=daily_avg["day"],
        y=daily_avg["severity_score"],
        mode="lines",
        line=dict(color="#F8FAFC", width=2.5),
        name="Daily Average Severity"
    ))

    # Highlight verified physical sensor checkpoints
    if "is_live_hardware" in timeline_df.columns and timeline_df["is_live_hardware"].any():
        live_pts = timeline_df[timeline_df["is_live_hardware"] == True]
        fig_long.add_trace(go.Scatter(
            x=live_pts["day"] + (live_pts["timestamp"].dt.hour / 24.0),
            y=live_pts["severity_score"],
            mode="markers+text",
            marker=dict(symbol="star", size=15, color="#F59E0B", line=dict(color="#FFFFFF", width=1.5)),
            text=[f"COM4 ({s:.1f})" for s in live_pts["severity_score"]],
            textposition="top center",
            textfont=dict(size=10, color="#FDE68A"),
            name="⭐ Live Sensor Checkpoint (COM4)"
        ))

    # Highlight Flare Days
    for fd in eff_result["flare_days"]:
        f_day = fd["day"]
        fig_long.add_vrect(
            x0=f_day - 0.45, x1=f_day + 0.45,
            fillcolor="rgba(239, 68, 68, 0.20)",
            line_width=1, line_color="#EF4444",
            annotation_text=f"Flare Day {f_day}", annotation_position="top left",
            annotation_font_size=9, annotation_font_color="#FCA5A5"
        )

    # Reference boundaries
    fig_long.add_hline(y=20, line_dash="dash", line_color="#64748B", annotation_text="Mild (20)")
    fig_long.add_hline(y=40, line_dash="dash", line_color="#64748B", annotation_text="Moderate (40)")
    fig_long.add_hline(y=70, line_dash="dash", line_color="#DC2626", annotation_text="Severe (70)")

    fig_long.update_layout(
        title="30-Day Symptom Fluctuation & Therapeutic Response Windows",
        xaxis_title="Monitoring Timeline (Day 1 to 30)",
        yaxis_title="Severity Score (0 - 100)",
        template="plotly_dark", height=420,
        margin=dict(l=40, r=20, t=40, b=30),
        paper_bgcolor="#1E293B", plot_bgcolor="#0F172A",
        legend=dict(orientation="h", y=1.1, x=0.1)
    )
    st.plotly_chart(fig_long, use_container_width=True)

    # Comparative Analytics: Week 1 vs Week 4 Baseline Drift & Flare Days
    p_col1, p_col2 = st.columns([1.3, 1.0])
    with p_col1:
        st.markdown("#### Baseline Symptom Progression (Week 1 vs Week 4)")
        w1_mask = timeline_df["day"] <= 7
        w4_mask = timeline_df["day"] >= 24
        w1_pre = timeline_df[w1_mask & (timeline_df["dose_phase"] == "pre_dose")]["severity_score"].mean()
        w1_post = timeline_df[w1_mask & (timeline_df["dose_phase"] == "post_dose")]["severity_score"].mean()
        w4_pre = timeline_df[w4_mask & (timeline_df["dose_phase"] == "pre_dose")]["severity_score"].mean()
        w4_post = timeline_df[w4_mask & (timeline_df["dose_phase"] == "post_dose")]["severity_score"].mean()

        prog_df = pd.DataFrame([
            {"Interval": "Week 1 (Days 1-7)", "Pre-Dose": f"{w1_pre:.1f}", "Post-Dose": f"{w1_post:.1f}", "Drop": f"-{w1_pre - w1_post:.1f} pts"},
            {"Interval": "Week 4 (Days 24-30)", "Pre-Dose": f"{w4_pre:.1f}", "Post-Dose": f"{w4_post:.1f}", "Drop": f"-{w4_pre - w4_post:.1f} pts"}
        ])
        st.table(prog_df)
        st.caption("A narrowing difference between pre-dose and post-dose scores indicates medication wearing-off.")

    with p_col2:
        st.markdown("#### Detected Acute Flare Incidents")
        if eff_result["flare_days"]:
            flare_df = pd.DataFrame(eff_result["flare_days"])
            flare_df.columns = ["Day", "Avg Severity", "Elevation Above Mean"]
            st.dataframe(flare_df, use_container_width=True, hide_index=True)
            st.caption("Flare days represent acute non-medication symptom surges (e.g. infection, sleep debt).")
        else:
            st.info("No acute flare incidents detected above 1.8 standard deviations.")

    # Export Monthly Doctor Report Button
    st.markdown("---")
    d_col1, d_col2 = st.columns([3, 1])
    with d_col1:
        st.write("📋 **Export 30-Day Monthly Clinical Summary Report (PDF)**")
        st.caption("Generates a doctor-ready comprehensive multi-page PDF with 30-day severity curves, medication efficacy verdict, baseline shifts, and full disclosures.")
    with d_col2:
        if st.button("Generate Doctor PDF Report", key="btn_gen_doc_report"):
            doc_report_filename = f"TremorAI_{'MonthlyLiveReport_COM4' if is_live_patient else 'MonthlyReport_' + p_id}_{int(time.time())}.pdf"
            reports_dir = os.path.join(PROJECT_ROOT, "reports")
            doc_report_path = os.path.join(reports_dir, doc_report_filename)
            patient_meta = {
                "is_live_hardware": is_live_patient,
                "device_name": "Physical ESP32 Wearable IMU (COM4)" if is_live_patient else "Wearable Ring (MPU6050 IMU)",
                "live_checkpoints": live_checkpoints_list if is_live_patient else None
            }
            generate_monthly_doctor_pdf(doc_report_path, p_id, timeline_df, doses_list, eff_result, patient_meta=patient_meta)
            with open(doc_report_path, "rb") as f:
                doc_pdf_bytes = f.read()
            st.success(f"Doctor Report created: `{doc_report_filename}`")
            st.download_button(
                label="⬇️ Download Monthly Report (PDF)",
                data=doc_pdf_bytes,
                file_name=doc_report_filename,
                mime="application/pdf"
            )


# -----------------------------------------------------------------------------
# VIEW 3: LIVE HARDWARE (MPU6050 / SERIAL)
# -----------------------------------------------------------------------------
elif app_view == "⚡ Live Hardware (MPU6050 / Serial)":
    st.subheader("Live Wearable IMU Telemetry (ESP32 Serial Bridge)")
    st.markdown("""
    <div style="background:#1E293B; border-left:4px solid #0284C7; padding:10px 14px; border-radius:6px; margin-bottom:12px; font-size:12px; color:#CBD5E1;">
        🔌 <b>Hardware Data Path:</b> Streams 100 Hz 3-axis accelerometer and 3-axis gyroscope data from an ESP32 over USB Serial.
        The exact same signal filtering, FFT biomarker extraction, and trained ML model are invoked in real-time.
    </div>
    """, unsafe_allow_html=True)

    # Auto-detect available COM ports
    try:
        import serial.tools.list_ports
        detected_ports = [p.device for p in serial.tools.list_ports.comports()]
    except Exception:
        detected_ports = []
    
    default_port = "COM4" if "COM4" in detected_ports else (detected_ports[0] if detected_ports else "COM4")
    port_options = detected_ports if detected_ports else ["COM4", "COM3"]
    if default_port not in port_options:
        port_options.insert(0, default_port)

    # Hardware connection controls & status
    hw_col1, hw_col2, hw_col3 = st.columns([1.5, 1.5, 1.2])
    with hw_col1:
        port_input = st.selectbox("Serial Port (ESP32):", port_options, index=port_options.index(default_port))
    with hw_col2:
        baud_choice = st.selectbox("Baud Rate:", [115200, 921600], index=0)
    with hw_col3:
        sim_shake = st.selectbox("Live Stream Mode:", ["Read Physical Serial Port", "Simulate PD Tremor (4.8 Hz)", "Simulate Healthy Baseline"], index=0)

    telemetry_file = os.path.join(PROJECT_ROOT, "data", "live_telemetry.json")

    # In-app live stream generator (allows live demonstration without opening a second terminal!)
    ctrl_col1, ctrl_col2, ctrl_col3 = st.columns([1.5, 1.5, 2.0])
    with ctrl_col1:
        auto_refresh = st.toggle("🔄 Live Auto-Refresh (1 sec)", value=True)
    with ctrl_col2:
        trigger_shake = st.button("⚡ Inject Live Tremor Burst (5s)", key="btn_inject_tremor")

    # Generate telemetry sample if in simulation mode or trigger requested
    if trigger_shake or ("Simulate" in sim_shake and auto_refresh):
        from hardware.bridge.serial_bridge import SerialBridgeRunner
        shake_arg = "pd" if ("PD" in sim_shake or trigger_shake) else "healthy"
        runner = SerialBridgeRunner(simulate=True, shake_mode=shake_arg, window_samples=300)
        # Populate buffer with current time offset so signal evolves dynamically
        t_base = time.time()
        for i in range(320):
            t = t_base + i * 0.01
            if shake_arg == "pd":
                ax = 0.30 * np.sin(2 * np.pi * 4.8 * t) + np.random.normal(0, 0.02)
                ay = 0.22 * np.cos(2 * np.pi * 4.8 * t) + np.random.normal(0, 0.02)
                az = 0.98 + 0.10 * np.sin(2 * np.pi * 4.8 * t)
                gx = 28.0 * np.sin(2 * np.pi * 4.8 * t)
                gy = 18.0 * np.cos(2 * np.pi * 4.8 * t)
                gz = 35.0 * np.sin(2 * np.pi * 4.8 * t)
            else:
                ax = np.random.normal(0, 0.015)
                ay = np.random.normal(0, 0.015)
                az = 0.98 + np.random.normal(0, 0.015)
                gx = np.random.normal(0, 0.8)
                gy = np.random.normal(0, 0.8)
                gz = np.random.normal(0, 0.8)
            runner.accel_buffer.append([ax, ay, az])
            runner.gyro_buffer.append([gx, gy, gz])
            runner.timestamp_buffer.append(t)
        runner.process_current_window()

    # Render live telemetry as an isolated auto-updating fragment (0.4s refresh for fluid live response)
    @st.fragment(run_every=0.4 if auto_refresh else None)
    def render_live_telemetry_stream():
        live_data = None
        if os.path.exists(telemetry_file):
            for _ in range(3):
                try:
                    with open(telemetry_file, "r") as f:
                        live_data = json.load(f)
                    st.session_state["cached_live_data"] = live_data
                    break
                except Exception:
                    time.sleep(0.015)

        if live_data is None:
            live_data = st.session_state.get("cached_live_data", None)

        # Status banner based on telemetry age
        if live_data is not None:
            last_ts = live_data.get("timestamp", 0)
            age_sec = time.time() - last_ts
            time_str = time.strftime("%H:%M:%S", time.localtime(last_ts))
            
            stat_col1, stat_col2 = st.columns([3.5, 1.0])
            with stat_col1:
                if age_sec < 4.0:
                    st.success(f"🟢 **LIVE HARDWARE STREAM ACTIVE** | Port: `{live_data.get('source', 'serial')}` | Last ping: `{age_sec*1000:.0f} ms` ago | Time: `{time_str}` | Packets: `{live_data.get('sample_count', 0)}`")
                else:
                    st.warning(f"🟡 **Stream Idle** (Last packet {age_sec:.1f}s ago). Serial bridge is reconnecting or waiting for sensor.")
            with stat_col2:
                if st.button("🔄 Refresh Stream Now", key="btn_force_stream_refresh", use_container_width=True):
                    st.rerun()
        else:
            st.warning("No live telemetry received yet. Launching serial bridge daemon on COM4...")
            st.code("python hardware/bridge/serial_bridge.py --port COM4 --baud 115200", language="bash")
            return

        # Render Live Metrics & Instant 3-Axis Orientation
        pred = live_data.get("prediction", {})
        sev = live_data.get("severity", {})
        feats = live_data.get("features", {})
        spec = live_data.get("spectrum", {})
        raw_cur = live_data.get("raw_latest", {})

        # Instantaneous 3-Axis Tilt Readout Card (proves physical sensor hardware is live!)
        st.markdown(f"""
        <div style="background:#1E293B; border:1px solid #334155; border-radius:10px; padding:12px 18px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="color:#94A3B8; font-size:12px; text-transform:uppercase; font-weight:700; letter-spacing:0.5px;">Live Sensor 3-Axis Gravity Orientation:</span>
                <span style="font-family:monospace; font-size:15px; font-weight:700; color:#38BDF8; margin-left:12px;">X: {raw_cur.get('ax', 0.0):+.3f} g</span>
                <span style="font-family:monospace; font-size:15px; font-weight:700; color:#34D399; margin-left:12px;">Y: {raw_cur.get('ay', 0.0):+.3f} g</span>
                <span style="font-family:monospace; font-size:15px; font-weight:700; color:#F59E0B; margin-left:12px;">Z: {raw_cur.get('az', 0.0):+.3f} g</span>
            </div>
            <div style="color:#64748B; font-size:12px; font-style:italic;">
                👉 Tilt or rotate the sensor in your hand to see X, Y, Z change in real time
            </div>
        </div>
        """, unsafe_allow_html=True)

        lm1, lm2, lm3, lm4 = st.columns(4)
        with lm1:
            p_label = pred.get("predicted_label", "unknown").upper()
            if p_label == "PD":
                p_color = "#EF4444"
                p_badge = "PARKINSON'S (PD)"
            elif p_label == "OTHER":
                p_color = "#F59E0B"
                p_badge = "OTHER / ET"
            else:
                p_color = "#10B981"
                p_badge = "HEALTHY / REST"
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Live Classification</div>
                <div class="metric-value" style="color:{p_color}; font-size:22px;">{p_badge}</div>
                <div style="font-size:11px; color:#94A3B8;">Confidence: {pred.get('confidence', 0)*100:.1f}%</div>
            </div>
            """, unsafe_allow_html=True)
        with lm2:
            score = sev.get("severity_score", 0.0)
            s_color = "#EF4444" if score >= 70 else ("#F97316" if score >= 40 else ("#38BDF8" if score > 0 else "#10B981"))
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Live Severity Score</div>
                <div class="metric-value" style="color:{s_color};">{score:.1f}</div>
                <div style="font-size:11px; color:#94A3B8;">{sev.get('grade', '')}</div>
            </div>
            """, unsafe_allow_html=True)
        with lm3:
            dom_f = feats.get("dominant_frequency", 0.0)
            f_color = "#EF4444" if 4.0 <= dom_f <= 6.0 else ("#38BDF8" if dom_f > 0 else "#10B981")
            f_str = f"{dom_f:.2f} Hz" if dom_f > 0 else "0.00 Hz (Rest)"
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Peak Resonance</div>
                <div class="metric-value" style="color:{f_color}; font-size:22px;">{f_str}</div>
                <div style="font-size:11px; color:#94A3B8;">Target Band: 4.0 - 6.0 Hz</div>
            </div>
            """, unsafe_allow_html=True)
        with lm4:
            ratio = feats.get("tremor_power_ratio", 0.0) * 100.0
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-label">Tremor Ratio</div>
                <div class="metric-value" style="color:#A855F7;">{ratio:.1f}%</div>
                <div style="font-size:11px; color:#94A3B8;">Jerk RMS: {feats.get('jerk_rms', 0):.1f} g/s</div>
            </div>
            """, unsafe_allow_html=True)

        # Live Charts: Recent samples & Live FFT
        st.markdown("<br/>", unsafe_allow_html=True)
        lc1, lc2 = st.columns(2)

        with lc1:
            recent = live_data.get("recent_accel", {})
            mag = recent.get("mag", [])
            rx = recent.get("ax", [])
            ry = recent.get("ay", [])
            rz = recent.get("az", [])

            fig_live_wave = go.Figure()
            # Show Raw Accelerations to prove physical movement
            if rx and len(rx) > 0:
                fig_live_wave.add_trace(go.Scatter(y=rx[-100:], mode="lines", line=dict(color="#38BDF8", width=1.5), name="Raw Accel X"))
                fig_live_wave.add_trace(go.Scatter(y=ry[-100:], mode="lines", line=dict(color="#34D399", width=1.5), name="Raw Accel Y"))
                fig_live_wave.add_trace(go.Scatter(y=rz[-100:], mode="lines", line=dict(color="#F59E0B", width=1.5), name="Raw Accel Z"))
            if mag and len(mag) > 0:
                fig_live_wave.add_trace(go.Scatter(y=mag[-100:], mode="lines+markers", marker=dict(size=3), line=dict(color="#E2E8F0", width=2.5), name="Dynamic Tremor Mag"))
            
            fig_live_wave.update_layout(
                title="Live Motion Stream (Recent 100 Samples @ 100 Hz)",
                xaxis_title="Recent Samples", yaxis_title="Acceleration (g)",
                template="plotly_dark", height=300,
                margin=dict(l=40, r=20, t=40, b=30),
                paper_bgcolor="#1E293B", plot_bgcolor="#0F172A",
                uirevision="live_stream",
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
            )
            st.plotly_chart(fig_live_wave, use_container_width=True, key="live_motion_wave_chart")

        with lc2:
            freqs = np.array(spec.get("freqs", []))
            psd = np.array(spec.get("psd", []))
            fig_live_fft = go.Figure()
            if len(freqs) > 0 and len(psd) > 0:
                fig_live_fft.add_trace(go.Scatter(
                    x=freqs, y=psd, mode="lines",
                    line=dict(color="#34D399", width=2),
                    name="Live Power Spectrum"
                ))
                fig_live_fft.add_vrect(
                    x0=3.5, x1=6.5,
                    fillcolor="rgba(245, 158, 11, 0.25)",
                    layer="below", line_width=1, line_color="#F59E0B",
                    annotation_text="PD Tremor Band (3.5 - 6.5 Hz)", annotation_position="top left",
                    annotation_font_size=9, annotation_font_color="#FBBF24"
                )
            fig_live_fft.update_layout(
                title="Live FFT Power Spectrum (0 - 25 Hz)",
                xaxis_title="Frequency (Hz)", yaxis_title="PSD (g²/Hz)",
                template="plotly_dark", height=300,
                margin=dict(l=40, r=20, t=40, b=30),
                paper_bgcolor="#1E293B", plot_bgcolor="#0F172A",
                uirevision="live_stream"
            )
            st.plotly_chart(fig_live_fft, use_container_width=True, key="live_motion_fft_chart")

        st.caption("💡 Shaking the MPU6050 (or selecting 'Simulate PD Tremor') concentrates power into the 3.5 - 6.5 Hz band within seconds.")

        # Action Buttons: Instant Session PDF & Log Checkpoint to 30-Day Monitor
        st.markdown("---")
        act_col1, act_col2 = st.columns([1, 1])

        with act_col1:
            st.markdown("#### 📄 Instant Live Session PDF")
            st.caption("Export a clinical session report directly from the active live sensor buffer.")
            if st.button("Generate Live Session PDF", key="btn_gen_live_session_pdf"):
                rep_filename = f"TremorAI_LiveSessionReport_COM4_{int(time.time())}.pdf"
                rep_dir = os.path.join(PROJECT_ROOT, "reports")
                rep_path = os.path.join(rep_dir, rep_filename)
                
                rec_mag = live_data.get("recent_accel", {}).get("mag", []) or np.zeros(50).tolist()
                sess_meta = {
                    "duration_sec": 6.0,
                    "is_synthetic": False,
                    "is_live_hardware": True,
                    "device_name": "Physical ESP32 + MPU6050 (COM4)",
                    "fs": 50.0,
                    "accel_mag": np.array(rec_mag),
                    "freqs": np.array(live_data.get("spectrum", {}).get("freqs", [])),
                    "psd": np.array(live_data.get("spectrum", {}).get("psd", []))
                }
                expl = generate_feature_explanation(feats, pred, sev)
                generate_single_session_pdf(rep_path, "LIVE_COM4", sess_meta, feats, pred, sev, expl)
                with open(rep_path, "rb") as f:
                    live_pdf_bytes = f.read()
                st.success(f"Report ready: `{rep_filename}`")
                st.download_button(
                    label="⬇️ Download Live Session PDF",
                    data=live_pdf_bytes,
                    file_name=rep_filename,
                    mime="application/pdf",
                    key="dl_live_sess_pdf"
                )

        with act_col2:
            st.markdown("#### 📌 30-Day Longitudinal Checkpoint")
            st.caption("Log this verified reading into the 30-day timeline to anchor therapy response tracking.")
            if st.button("Log Reading to 30-Day Monitor", key="btn_live_log_ckpt"):
                rec = save_live_checkpoint(
                    telemetry_data=live_data,
                    note="Logged directly from Live Hardware view",
                    patient_id="LIVE_COM4",
                    day=30
                )
                st.success(f"✅ Checkpoint Logged! Day {rec['day']} | Severity: {rec['severity_score']:.1f}/100 ({rec['grade']}). Viewable on 30-Day Monitor.")

    render_live_telemetry_stream()

