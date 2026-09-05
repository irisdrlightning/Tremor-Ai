"""
Tremor Ai — Doctor Clinical Dashboard
======================================
Desktop-first, comprehensive clinical workbench.
Screens:
  Screen 0: Doctor Login / Sign Up
  Screen 1: Patient Lookup (Search by Ring ID or Patient ID + Recent list)
  Screen 2: Patient Overview (Date range filter, 7d/30d/custom trend with doses, verdict, flare summary, disclaimer)
  Screen 3: Report Export (Scoped to active date range with preview and PDF download)
"""

import os
import time
import datetime
import streamlit as st
import numpy as np
import pandas as pd
import plotly.graph_objects as go
from typing import Dict, Any, Optional, List

from backend.auth_service import (
    signup_user,
    login_user,
    logout_user,
    get_patient_profile,
    record_doctor_lookup,
    get_doctor_recent_patients
)
from src.longitudinal_sim import generate_30_day_longitudinal_data
from src.effectiveness import analyze_medication_effectiveness, CLINICAL_DISCLAIMER
from src.doctor_report import generate_monthly_doctor_pdf
from src.checkpoint_manager import load_live_checkpoints

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DOCTOR_DISCLAIMER = "⚠️ Decision-support tool — not a diagnosis. Clinical judgment required."


def render_doctor_dashboard(live_telemetry: Optional[Dict[str, Any]] = None):
    """Render the Doctor Dashboard desktop-first clinical workspace."""

    if "doctor_user" not in st.session_state:
        st.session_state.doctor_user = None
    if "selected_patient_id" not in st.session_state:
        st.session_state.selected_patient_id = None
    if "doctor_screen" not in st.session_state:
        st.session_state.doctor_screen = "lookup"
    if "doc_date_preset" not in st.session_state:
        st.session_state.doc_date_preset = "Last 30 days"

    # Clinical desktop CSS
    st.markdown("""
    <style>
        /* Force clinical light canvas */
        .stApp {
            background-color: #F8FAFC !important;
            color: #0F172A !important;
        }
        .main {
            background-color: #F8FAFC !important;
        }
        header[data-testid="stHeader"] {
            background-color: #F8FAFC !important;
        }
        .doc-header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            padding: 14px 24px;
            margin-bottom: 20px;
            border-radius: 10px;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
            color: #0F172A;
        }
        .doc-metric-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 16px;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
            color: #0F172A;
        }
        .doc-disclaimer-banner {
            background-color: #FEF3C7;
            border-left: 4px solid #D97706;
            color: #92400E;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 16px;
        }
        /* Crisp typography & inputs */
        h1, h2, h3, h4, h5, h6 {
            color: #0F172A !important;
        }
        .stTextInput label, .stSelectbox label, .stNumberInput label, .stSlider label {
            color: #1E293B !important;
            font-weight: 600 !important;
        }
        .stTextInput input, .stNumberInput input {
            color: #0F172A !important;
            background-color: #FFFFFF !important;
            border: 1px solid #CBD5E1 !important;
            border-radius: 8px !important;
        }
        .stCaption, p, span {
            color: #334155;
        }
    </style>
    """, unsafe_allow_html=True)

    user = st.session_state.doctor_user
    if not user:
        _render_screen_0_doc_auth()
        return

    # Top Account & Session Bar
    doc_name = user.get("full_name", "Dr. Physician")
    clinic = user.get("clinic_name", "Movement Disorders Center")

    col_title, col_account = st.columns([3, 1.2])
    with col_title:
        st.markdown(f"### 🩺 Tremor Ai Clinical Workbench &mdash; {clinic}")
    with col_account:
        st.markdown(f"""
        <div style="text-align: right; font-size: 13px; color: #475569;">
            Logged in as <b>{doc_name}</b>
        </div>
        """, unsafe_allow_html=True)
        btn_c1, btn_c2 = st.columns([1, 1])
        with btn_c1:
            if st.button("🔍 Change Patient", key="btn_doc_change_pt", use_container_width=True):
                st.session_state.selected_patient_id = None
                st.session_state.doctor_screen = "lookup"
                st.rerun()
        with btn_c2:
            if st.button("🚪 Log Out", key="btn_doc_logout", use_container_width=True):
                logout_user(user["token"])
                st.session_state.doctor_user = None
                st.session_state.selected_patient_id = None
                st.rerun()

    st.markdown(f"<div class='doc-disclaimer-banner'>{DOCTOR_DISCLAIMER}</div>", unsafe_allow_html=True)

    # Route based on patient selection
    if not st.session_state.selected_patient_id:
        _render_screen_1_lookup(user)
    else:
        profile = get_patient_profile(st.session_state.selected_patient_id)
        if not profile:
            st.error(f"Patient profile for '{st.session_state.selected_patient_id}' could not be loaded.")
            st.session_state.selected_patient_id = None
            if st.button("Back to Lookup"):
                st.rerun()
            return

        # Navigation tabs for selected patient
        tab1, tab2 = st.tabs(["📊 Patient Overview & Motor Fluctuations", "📄 Clinical Report Export"])
        with tab1:
            _render_screen_2_overview(user, profile, live_telemetry)
        with tab2:
            _render_screen_3_report_export(user, profile)


def _render_screen_0_doc_auth():
    """Screen 0: Doctor Login / Sign Up."""
    col_l, col_center, col_r = st.columns([1, 1.8, 1])
    with col_center:
        st.markdown("""
        <div style="text-align: center; margin-bottom: 16px;">
            <h2 style="color: #0F172A; margin-bottom: 4px;">🩺 Physician Clinical Portal</h2>
            <p style="color: #64748B; font-size: 14px;">Authorized access to patient motor fluctuation records & medication response analytics</p>
        </div>
        """, unsafe_allow_html=True)

        mode = st.radio("Portal Mode:", ["Log In", "Sign Up"], horizontal=True, label_visibility="collapsed")

        with st.expander("⚡ Demo Doctor Credentials (1-Click Fill)", expanded=False):
            if st.button("Fill Demo Doctor (doctor@tremor.ai)", key="btn_fill_doc_demo"):
                st.session_state["d_login_email"] = "doctor@tremor.ai"
                st.session_state["d_login_pwd"] = "doctor123"

        if mode == "Log In":
            with st.form("form_doc_login"):
                email = st.text_input("Physician Email", value=st.session_state.get("d_login_email", ""), placeholder="doctor@hospital.org")
                password = st.text_input("Password", value=st.session_state.get("d_login_pwd", ""), type="password", placeholder="••••••••")
                submit = st.form_submit_button("Access Clinical Portal", type="primary", use_container_width=True)

                if submit:
                    ok, msg, user_data = login_user(email, password, required_role="doctor")
                    if ok:
                        st.session_state.doctor_user = user_data
                        st.success("Credentials authenticated. Loading clinic workbench...")
                        time.sleep(0.5)
                        st.rerun()
                    else:
                        st.error("Invalid email or password.")
        else:
            with st.form("form_doc_signup"):
                st.markdown("##### Physician Registration")
                full_name = st.text_input("Full Name & Title", placeholder="Dr. Sarah Jenkins, MD")
                clinic_name = st.text_input("Hospital / Clinic Name", placeholder="Neurology & Movement Disorders Institute")
                email = st.text_input("Institutional Email", placeholder="sjenkins@hospital.org")
                password = st.text_input("Password", type="password", placeholder="Minimum 6 characters")
                conf_pwd = st.text_input("Confirm Password", type="password", placeholder="Re-enter password")
                submit = st.form_submit_button("Register Physician Account", type="primary", use_container_width=True)

                if submit:
                    if password != conf_pwd:
                        st.error("Passwords do not match.")
                    elif len(password) < 6:
                        st.error("Password must be at least 6 characters.")
                    else:
                        ok, msg, user_data = signup_user(email, password, role="doctor", full_name=full_name, clinic_name=clinic_name)
                        if ok:
                            st.session_state.doctor_user = user_data
                            st.success("Account registered successfully!")
                            time.sleep(0.5)
                            st.rerun()
                        else:
                            st.error(msg)

        st.markdown(f"<div class='doc-disclaimer-banner'>{DOCTOR_DISCLAIMER}</div>", unsafe_allow_html=True)


def _render_screen_1_lookup(user: Dict[str, Any]):
    """Screen 1: Patient Lookup by Ring ID or Patient ID."""
    st.markdown("#### 🔍 Patient Record Lookup")
    st.caption("Under strict clinical access protocols, patient records are accessible only by entering a verified Ring ID or Patient Identifier.")

    search_col, btn_col = st.columns([3.5, 1])
    with search_col:
        lookup_query = st.text_input(
            "Enter Ring ID or Patient ID:",
            placeholder="e.g. RING-7842, PD_01, or RING-COM4",
            label_visibility="collapsed"
        )
    with btn_col:
        lookup_btn = st.button("Search Patient", type="primary", use_container_width=True)

    if lookup_btn and lookup_query:
        profile = get_patient_profile(lookup_query)
        if profile:
            st.session_state.selected_patient_id = profile["patient_id"]
            record_doctor_lookup(user["user_id"], profile["patient_id"])
            st.success(f"Record found for {profile['full_name']} ({profile['patient_id']}). Loading...")
            time.sleep(0.4)
            st.rerun()
        else:
            st.error(f"No clinical records matching identifier '{lookup_query}'. Please check the ID.")

    st.markdown("---")
    st.markdown("##### 🕒 Recent / Frequent Clinic Patients")
    recent = get_doctor_recent_patients(user["user_id"], limit=5)

    # Fallback to standard demo patients if history is empty
    if not recent:
        st.caption("No lookup history in this session. Quick-access benchmark profiles:")
        demo_cols = st.columns(3)
        with demo_cols[0]:
            if st.button("📋 Eleanor Vance (RING-7842)", use_container_width=True):
                st.session_state.selected_patient_id = "PD_01"
                record_doctor_lookup(user["user_id"], "PD_01")
                st.rerun()
        with demo_cols[1]:
            if st.button("⚡ Live Hardware (RING-COM4)", use_container_width=True):
                st.session_state.selected_patient_id = "LIVE_COM4"
                record_doctor_lookup(user["user_id"], "LIVE_COM4")
                st.rerun()
        with demo_cols[2]:
            if st.button("📋 Robert Chen (PD_02)", use_container_width=True):
                st.session_state.selected_patient_id = "PD_02"
                record_doctor_lookup(user["user_id"], "PD_02")
                st.rerun()
    else:
        for p in recent:
            c1, c2, c3, c4 = st.columns([2, 1.5, 2, 1])
            with c1:
                st.markdown(f"**{p['full_name']}** (`{p['patient_id']}`)")
            with c2:
                st.markdown(f"Ring: `{p.get('ring_id') or 'N/A'}` | Age: {p.get('age', '--')}")
            with c3:
                st.markdown(f"Rx: *{p.get('medication_name') or 'Levodopa'}*")
            with c4:
                if st.button("Open Record", key=f"btn_open_{p['patient_id']}", use_container_width=True):
                    st.session_state.selected_patient_id = p["patient_id"]
                    record_doctor_lookup(user["user_id"], p["patient_id"])
                    st.rerun()


def _render_screen_2_overview(user: Dict[str, Any], profile: Dict[str, Any], live_telemetry: Optional[Dict[str, Any]]):
    """Screen 2: Patient Overview with Date Range Selector, Overlaid Doses, Verdict, and Flare-Day summary."""
    p_id = profile["patient_id"]
    is_live_patient = (p_id == "LIVE_COM4")

    # 1. Patient Profile Header
    st.markdown(f"""
    <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h3 style="margin: 0; color: #0F172A;">{profile.get('full_name', 'Patient')} <span style="font-size: 14px; font-weight: normal; color: #64748B;">({p_id})</span></h3>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155;">
                    <b>Age:</b> {profile.get('age', 65)} &nbsp;|&nbsp; 
                    <b>Paired Ring ID:</b> <code>{profile.get('ring_id', 'None')}</code> &nbsp;|&nbsp; 
                    <b>Active Medication:</b> {profile.get('medication_name', 'Carbidopa/Levodopa')} ({profile.get('medication_schedule', 'TID')})
                </p>
            </div>
            <div>
                <span style="background: #E0F2FE; color: #0369A1; font-weight: 600; padding: 4px 10px; border-radius: 6px; font-size: 12px;">
                    {'⚡ Active Physical Telemetry' if is_live_patient else '📁 Longitudinal Record'}
                </span>
            </div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # 2. Date Range Selector (Controls everything below)
    st.markdown("##### 📅 Clinical Observation Date Range")
    range_col1, range_col2 = st.columns([1.8, 2.2])

    with range_col1:
        date_preset = st.radio(
            "Quick Range:",
            ["Last 7 days", "Last 30 days", "Since first recorded", "Custom Range"],
            horizontal=True,
            index=["Last 7 days", "Last 30 days", "Since first recorded", "Custom Range"].index(st.session_state.doc_date_preset) if st.session_state.doc_date_preset in ["Last 7 days", "Last 30 days", "Since first recorded", "Custom Range"] else 1,
            key="doc_date_preset_radio"
        )
        st.session_state.doc_date_preset = date_preset

    # Load 30-day baseline simulation
    timeline_df, doses_list = generate_30_day_longitudinal_data(patient_id=p_id, base_severity=45.0)

    # If live hardware checkpoints exist, inject them
    live_ckpts = load_live_checkpoints()
    if live_ckpts:
        ckpt_rows = []
        for ck in live_ckpts:
            ckpt_rows.append({
                "patient_id": p_id,
                "timestamp": ck["timestamp"],
                "window_idx": 999,
                "day": 30,
                "hour": 14,
                "time_of_day": "Afternoon (Live)",
                "pred_label": ck["predicted_label"],
                "pd_probability": 0.88 if ck["predicted_label"] == "pd" else 0.05,
                "severity_score": float(ck["severity_score"]),
                "dominant_freq": float(ck["dominant_frequency"]),
                "tremor_power": 0.03,
                "is_flare_day": False,
                "is_synthetic": False,
                "is_live_hardware": True
            })
        timeline_df = pd.concat([timeline_df, pd.DataFrame(ckpt_rows)], ignore_index=True)

    # Filter dataframe based on date preset
    max_day = int(timeline_df["day"].max())
    if date_preset == "Last 7 days":
        filter_start_day = max(1, max_day - 6)
        filter_end_day = max_day
    elif date_preset == "Last 30 days" or date_preset == "Since first recorded":
        filter_start_day = 1
        filter_end_day = max_day
    else:
        with range_col2:
            custom_days = st.slider("Select Day Range:", 1, max_day, (max(1, max_day - 14), max_day))
            filter_start_day, filter_end_day = custom_days

    # Filter timeline and doses
    filtered_df = timeline_df[(timeline_df["day"] >= filter_start_day) & (timeline_df["day"] <= filter_end_day)].copy()
    filtered_doses = [d for d in doses_list if filter_start_day <= d.get("day", 1) <= filter_end_day]

    st.caption(f"Showing observations from **Day {filter_start_day}** to **Day {filter_end_day}** ({len(filtered_df)} window assessments, {len(filtered_doses)} doses).")

    # 3. Compute Medication Effectiveness Verdict on filtered window
    eff_result = analyze_medication_effectiveness(filtered_df, filtered_doses)
    verdict = eff_result.get("verdict", "Inconclusive")
    conf = eff_result.get("confidence", 85)

    if verdict == "Likely Effective":
        v_color = "#059669"
        v_bg = "#ECFDF5"
    elif verdict == "Reduced Effectiveness Detected":
        v_color = "#DC2626"
        v_bg = "#FEF2F2"
    else:
        v_color = "#D97706"
        v_bg = "#FFFBEB"

    # Metric Cards Row
    m_col1, m_col2, m_col3 = st.columns(3)
    with m_col1:
        st.markdown(f"""
        <div class="doc-metric-card" style="background: {v_bg}; border-left: 4px solid {v_color};">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B;">Medication Efficacy Verdict</span>
            <h3 style="margin: 4px 0 2px 0; color: {v_color}; font-size: 20px;">{verdict}</h3>
            <span style="font-size: 12px; color: #475569;">Confidence: <b>{conf:.0f}%</b></span>
        </div>
        """, unsafe_allow_html=True)

    with m_col2:
        flare_count = eff_result.get("flare_days_count", 0)
        flare_color = "#DC2626" if flare_count > 0 else "#059669"
        st.markdown(f"""
        <div class="doc-metric-card">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B;">Identified Flare Days</span>
            <h3 style="margin: 4px 0 2px 0; color: {flare_color}; font-size: 20px;">{flare_count} Incident{'s' if flare_count != 1 else ''}</h3>
            <span style="font-size: 12px; color: #64748B;">> 1.8 SD above baseline tremor</span>
        </div>
        """, unsafe_allow_html=True)

    with m_col3:
        avg_drop = eff_result.get("average_pre_post_drop", 12.5)
        st.markdown(f"""
        <div class="doc-metric-card">
            <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B;">Mean Post-Dose Relief</span>
            <h3 style="margin: 4px 0 2px 0; color: #0284C7; font-size: 20px;">-{avg_drop:.1f} pts</h3>
            <span style="font-size: 12px; color: #64748B;">UPDRS severity index reduction</span>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br/>", unsafe_allow_html=True)

    # 4. Severity Trend Chart with Overlaid Doses
    st.markdown("##### 📈 Motor Fluctuation Curve with Overlaid Medication Doses")
    fig = go.Figure()

    # Severity curve - calculate fractional day safely
    if "hour" in filtered_df.columns:
        hours_series = filtered_df["hour"]
    elif "timestamp" in filtered_df.columns:
        ts_s = pd.to_datetime(filtered_df["timestamp"])
        hours_series = ts_s.dt.hour + (ts_s.dt.minute / 60.0)
    else:
        hours_series = 12.0

    fig.add_trace(go.Scatter(
        x=filtered_df["day"] + (hours_series / 24.0),
        y=filtered_df["severity_score"],
        mode="lines",
        name="Tremor Severity (0–100)",
        line=dict(color="#0284C7", width=2.5),
        hovertemplate="Day %{x:.1f}<br>Severity: %{y:.1f}/100<extra></extra>"
    ))

    # Overlaid medication doses
    dose_x = []
    for d in filtered_doses:
        d_day = d.get("day", 1)
        if "hour" in d:
            d_hour = d["hour"]
        elif "timestamp" in d and d["timestamp"] is not None:
            ts_d = pd.to_datetime(d["timestamp"])
            d_hour = ts_d.hour + (ts_d.minute / 60.0)
        else:
            d_hour = 8.0
        dose_x.append(d_day + (d_hour / 24.0))

    dose_y = [5.0] * len(dose_x)
    fig.add_trace(go.Scatter(
        x=dose_x,
        y=dose_y,
        mode="markers",
        name="Medication Dose (Levodopa)",
        marker=dict(symbol="triangle-up", size=10, color="#10B981", line=dict(color="#047857", width=1.5)),
        hovertemplate="Scheduled Dose Taken<br>Day %{x:.1f}<extra></extra>"
    ))

    # Severity clinical bands shading
    fig.add_hrect(y0=0, y1=20, fillcolor="#ECFDF5", opacity=0.35, line_width=0, annotation_text="Minimal (<20)", annotation_position="top left", annotation_font_size=9)
    fig.add_hrect(y0=20, y1=40, fillcolor="#F0F9FF", opacity=0.35, line_width=0, annotation_text="Mild (20–40)", annotation_position="top left", annotation_font_size=9)
    fig.add_hrect(y0=40, y1=70, fillcolor="#FFFBEB", opacity=0.35, line_width=0, annotation_text="Moderate (40–70)", annotation_position="top left", annotation_font_size=9)
    fig.add_hrect(y0=70, y1=100, fillcolor="#FEF2F2", opacity=0.35, line_width=0, annotation_text="Marked (>70)", annotation_position="top left", annotation_font_size=9)

    fig.update_layout(
        height=380,
        margin=dict(l=40, r=30, t=20, b=40),
        xaxis=dict(title=f"Timeline Days ({filter_start_day} to {filter_end_day})", gridcolor="#F1F5F9"),
        yaxis=dict(title="Severity Index (0 - 100)", range=[0, 100], gridcolor="#F1F5F9"),
        plot_bgcolor="#FFFFFF",
        paper_bgcolor="#FFFFFF",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    st.plotly_chart(fig, use_container_width=True)

    # 5. Plain-Language Clinical Explanation & Flare Summary
    st.markdown(f"""
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px;">
        <b>Clinical Interpretation:</b> {eff_result.get('clinical_summary', 'The patient exhibits responsive motor relief following dopaminergic doses, with manageable diurnal wearing-off.')}
    </div>
    """, unsafe_allow_html=True)

    # Save active filtered range in session for report export
    st.session_state.active_filtered_df = filtered_df
    st.session_state.active_filtered_doses = filtered_doses
    st.session_state.active_filter_start_day = filter_start_day
    st.session_state.active_filter_end_day = filter_end_day
    st.session_state.active_eff_result = eff_result


def _render_screen_3_report_export(user: Dict[str, Any], profile: Dict[str, Any]):
    """Screen 3: Report Export scoped to current date range with preview and download button."""
    p_id = profile["patient_id"]
    p_name = profile.get("full_name", "Patient")
    start_day = st.session_state.get("active_filter_start_day", 1)
    end_day = st.session_state.get("active_filter_end_day", 30)
    filtered_df = st.session_state.get("active_filtered_df")
    filtered_doses = st.session_state.get("active_filtered_doses")
    eff_result = st.session_state.get("active_eff_result")

    if filtered_df is None or len(filtered_df) == 0:
        filtered_df, filtered_doses = generate_30_day_longitudinal_data(p_id, base_severity=45.0)
        eff_result = analyze_medication_effectiveness(filtered_df, filtered_doses)

    # Standardized filename as required by prompt
    now_date = datetime.datetime.now().strftime("%Y%m%d")
    sanitized_name = "".join(c for c in p_name if c.isalnum() or c in (' ', '_')).replace(" ", "_")
    report_filename = f"TremorAI_Report_{sanitized_name}_Day{start_day}_to_Day{end_day}.pdf"

    st.markdown("#### 📄 Clinical Report Export & Preview")
    st.caption(f"Scoped to active date selection: **Day {start_day} to Day {end_day}**")

    # Brief preview card of report contents
    st.markdown(f"""
    <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 18px; margin-bottom: 16px;">
        <h4 style="margin:0 0 10px 0; color: #0F172A;">📋 Report Content Preview</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #334155; line-height: 1.6;">
            <li><b>Patient Profile:</b> {p_name} ({p_id}) | Ring: <code>{profile.get('ring_id', 'N/A')}</code></li>
            <li><b>Timeline Scope:</b> Day {start_day} to Day {end_day} ({len(filtered_df)} session windows)</li>
            <li><b>Motor Trend Curve:</b> Embedded longitudinal severity graph with dopaminergic dose overlays</li>
            <li><b>Medication-Effectiveness Analysis:</b> Structured verdict (<b>{eff_result.get('verdict', 'Likely Effective')}</b>, {eff_result.get('confidence', 85):.0f}% confidence)</li>
            <li><b>Flare Days Incident Log:</b> {eff_result.get('flare_days_count', 0)} detected event(s)</li>
            <li><b>Mandatory Disclaimer:</b> {CLINICAL_DISCLAIMER}</li>
        </ul>
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748B;">Generated file will be named: <code>{report_filename}</code></p>
    </div>
    """, unsafe_allow_html=True)

    # Generate ReportLab PDF on demand
    reports_dir = os.path.join(PROJECT_ROOT, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    out_pdf_path = os.path.join(reports_dir, report_filename)

    btn_gen_col, dl_col = st.columns([1, 1.5])
    with btn_gen_col:
        if st.button("🔨 Compile Clinical PDF Report", type="primary", use_container_width=True):
            with st.spinner("Compiling high-resolution clinical PDF..."):
                generate_monthly_doctor_pdf(
                    output_pdf_path=out_pdf_path,
                    patient_id=p_id,
                    timeline_df=filtered_df,
                    doses_list=filtered_doses,
                    effectiveness_result=eff_result,
                    patient_meta=profile
                )
            st.success("PDF compiled successfully!")

    if os.path.exists(out_pdf_path):
        with open(out_pdf_path, "rb") as f:
            pdf_bytes = f.read()
        with dl_col:
            st.download_button(
                label=f"⬇️ Download PDF Report ({report_filename})",
                data=pdf_bytes,
                file_name=report_filename,
                mime="application/pdf",
                type="primary",
                use_container_width=True
            )
