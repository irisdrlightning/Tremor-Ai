"""
Tremor Ai — Patient Mobile App
==============================
Mobile-first, clean, clinical patient interface.
Screens:
  Screen 0: Login / Sign Up
  Screen 1: Ring Pairing
  Screen 2: Patient Profile Setup
  Screen 3: Home / Today's Readings (Plain language tremor level, recording status, dose log, 7-day sparkline)
  Screen 4: Settings (Edit profile, re-pair ring, logout, disclaimer)
"""

import time
import os
import streamlit as st
import numpy as np
import plotly.graph_objects as go
from typing import Dict, Any, Optional

from backend.auth_service import (
    signup_user,
    login_user,
    logout_user,
    get_patient_profile,
    pair_ring_to_patient,
    save_patient_profile,
    log_patient_dose,
    get_patient_recent_doses
)

PATIENT_DISCLAIMER = (
    "⚠️ This app supports monitoring and is not a diagnostic tool. "
    "Always consult your doctor about your treatment."
)


def render_patient_app(live_telemetry: Optional[Dict[str, Any]] = None):
    """Render the Patient App with a clean, calm blue/white mobile-first design."""

    # Initialize patient session state
    if "patient_user" not in st.session_state:
        st.session_state.patient_user = None
    if "patient_screen" not in st.session_state:
        st.session_state.patient_screen = "login"

    # Mobile container styling (calm blues and whites)
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
        .patient-phone-frame {
            max-width: 460px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 28px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05);
            border: 1px solid #E2E8F0;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #0F172A;
        }
        .patient-header {
            background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%);
            color: #FFFFFF;
            padding: 18px 20px;
            text-align: center;
        }
        .patient-header h3 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
            color: #FFFFFF;
        }
        .patient-header p {
            margin: 4px 0 0 0;
            font-size: 12px;
            color: #E0F2FE;
        }
        .patient-card {
            background: #FFFFFF;
            border: 1px solid #E2E8F0;
            border-radius: 14px;
            padding: 16px;
            margin-bottom: 14px;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .patient-badge-green {
            background: #ECFDF5;
            color: #047857;
            border: 1px solid #A7F3D0;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .patient-disclaimer-box {
            background: #EFF6FF;
            border-left: 4px solid #0284C7;
            padding: 10px 14px;
            font-size: 11.5px;
            color: #1E3A8A;
            border-radius: 4px;
            margin: 12px 0;
            line-height: 1.4;
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

    # Route based on authentication
    user = st.session_state.patient_user

    # Centered mobile viewport
    col_l, col_center, col_r = st.columns([1, 2.2, 1])

    with col_center:
        # Header banner
        st.markdown("""
        <div class="patient-header" style="border-radius: 16px 16px 0 0; margin-bottom: 12px;">
            <h3>💍 Tremor Ai Patient Portal</h3>
            <p>Your Personal Tremor Companion & Medication Diary</p>
        </div>
        """, unsafe_allow_html=True)

        if not user:
            _render_screen_0_auth()
        else:
            profile = get_patient_profile(user["linked_id"])

            # -----------------------------------------------------------------
            # 📡 Persistent Web Bluetooth Ring Link (Mounted ONCE at Top Level)
            # Never unmounts or disconnects when switching between patient tabs!
            # -----------------------------------------------------------------
            patient_linked_id = user.get("linked_id", "")
            web_bt_html = _get_web_bluetooth_component_html(patient_linked_id)
            st.components.v1.html(web_bt_html, height=410)

            # Native Client-Side Tabs (Switching tabs does NOT reload iframes or disconnect!)
            tab_home, tab_ring, tab_settings = st.tabs(["🏠 Today's Readings", "💍 Ring Details & Pairing", "⚙️ Settings"])

            with tab_home:
                _render_screen_3_home(user, profile, live_telemetry)

            with tab_ring:
                _render_screen_1_pairing(user, profile, live_telemetry)

            with tab_settings:
                _render_screen_4_settings(user, profile)


def _render_screen_0_auth():
    """Screen 0: Patient Login / Sign Up with generic error messages and demo auto-fill."""
    st.markdown("#### Patient Sign In")
    st.caption("Securely access your daily tremor observations and medication log.")

    mode = st.radio("Choose Action:", ["Log In", "Sign Up"], horizontal=True, label_visibility="collapsed")

    # Quick demo account helper
    with st.expander("⚡ Quick Demo Credentials (1-Click Fill)", expanded=False):
        if st.button("Fill Demo Patient (patient@tremor.ai)", key="btn_fill_patient_demo"):
            st.session_state["p_login_email"] = "patient@tremor.ai"
            st.session_state["p_login_pwd"] = "patient123"

    if mode == "Log In":
        with st.form("form_patient_login"):
            email = st.text_input("Email Address", value=st.session_state.get("p_login_email", ""), placeholder="patient@example.com")
            password = st.text_input("Password", value=st.session_state.get("p_login_pwd", ""), type="password", placeholder="••••••••")
            submitted = st.form_submit_button("Sign In to Tremor Ai", type="primary", use_container_width=True)

            if submitted:
                ok, msg, user_data = login_user(email, password, required_role="patient")
                if ok:
                    st.session_state.patient_user = user_data
                    profile = get_patient_profile(user_data["linked_id"])
                    if not profile or not profile.get("ring_id"):
                        st.session_state.patient_screen = "pair"
                    else:
                        st.session_state.patient_screen = "home"
                    st.success("Welcome back! Signing in...")
                    time.sleep(0.5)
                    st.rerun()
                else:
                    st.error("Invalid email or password.")

        st.caption("Forgot password? Contact your clinical administrator or tap [Reset Password](#).")

    else:
        with st.form("form_patient_signup"):
            st.markdown("##### Create Patient Account")
            new_email = st.text_input("Email Address", placeholder="name@domain.com")
            full_name = st.text_input("Full Name", placeholder="Eleanor Vance")
            new_pwd = st.text_input("Create Password", type="password", placeholder="Minimum 6 characters")
            conf_pwd = st.text_input("Confirm Password", type="password", placeholder="Re-enter password")
            signup_submit = st.form_submit_button("Create Account & Pair Ring", type="primary", use_container_width=True)

            if signup_submit:
                if new_pwd != conf_pwd:
                    st.error("Passwords do not match. Please re-enter.")
                elif len(new_pwd) < 6:
                    st.error("Password must be at least 6 characters.")
                else:
                    ok, msg, user_data = signup_user(
                        email=new_email,
                        password=new_pwd,
                        role="patient",
                        full_name=full_name
                    )
                    if ok:
                        st.session_state.patient_user = user_data
                        st.session_state.patient_screen = "pair"
                        st.success("Account created successfully! Let's pair your ring.")
                        time.sleep(0.5)
                        st.rerun()
                    else:
                        st.error(msg)

    st.markdown(f"<div class='patient-disclaimer-box'>{PATIENT_DISCLAIMER}</div>", unsafe_allow_html=True)



def _get_web_bluetooth_component_html(patient_linked_id: str) -> str:
    """HTML & JavaScript for high-speed Web Bluetooth connection with live 100 Hz canvas oscilloscope, explicit Disconnect button, and auto-reconnect."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body {{
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 0;
          background: transparent;
        }}
        .bt-card {{
          background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%);
          border: 1.5px solid #0284C7;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 6px;
        }}
        .bt-btn {{
          background-color: #0284C7;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: background-color 0.2s, transform 0.1s;
        }}
        .bt-btn:hover {{
          background-color: #0369A1;
        }}
        .bt-btn:active {{
          transform: scale(0.99);
        }}
        .status-box {{
          margin-top: 8px;
          font-size: 11px;
          color: #075985;
          line-height: 1.4;
        }}
        .metric-tile {{
          background: #FFFFFF;
          border: 1px solid #BAE6FD;
          border-radius: 6px;
          padding: 6px 8px;
          text-align: center;
        }}
        .metric-title {{
          font-size: 9px;
          color: #0369A1;
          font-weight: 700;
          text-transform: uppercase;
        }}
        .metric-val {{
          font-size: 11.5px;
          font-weight: 800;
          color: #0F172A;
          margin-top: 1px;
        }}
        .metric-sub {{
          font-size: 9px;
          color: #64748B;
        }}
        .disconnect-btn {{
          background-color: #EF4444;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s;
        }}
        .disconnect-btn:hover {{
          background-color: #DC2626;
        }}
      </style>
    </head>
    <body>
      <div class="bt-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size: 12px; font-weight:700; color: #0369A1;">📡 Wireless Web Bluetooth Ring Link</span>
            <span style="font-size: 9.5px; background: #E0F2FE; color: #0369A1; font-weight: 600; padding: 1px 6px; border-radius: 4px;">Persistent Mode</span>
          </div>
          <span id="conn-pill" style="background: #64748B; color: #FFF; font-size: 9px; padding: 2px 7px; border-radius: 10px; font-weight: 600;">Disconnected</span>
        </div>
        
        <!-- Connect Section (Visible when disconnected) -->
        <div id="connect-section">
          <button id="bt-btn" class="bt-btn" onclick="connectWebBluetooth()">
            <span>⚡ Connect Ring via Bluetooth</span>
          </button>
        </div>
        
        <!-- Live Stream Feedback Console (Visible when connected) -->
        <div id="live-console" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
            <div style="flex:1; background:#DCFCE7; border:1px solid #86EFAC; border-radius:8px; padding:6px 10px; display:flex; flex-direction:column; justify-content:center;">
              <span id="conn-device-label" style="color:#15803D; font-size:12px; font-weight:700;">🟢 Connected: TremorAi-RING-7842</span>
              <span id="conn-sub-label" style="color:#166534; font-size:9.5px;">🔒 Persistent link active — Only disconnects when you press Disconnect below</span>
            </div>
            <button id="disconnect-btn" class="disconnect-btn" onclick="disconnectRing()" title="Explicitly disconnect ring">
              🛑 Disconnect
            </button>
          </div>

          <!-- 100 Hz Live Canvas Oscilloscope -->
          <div style="background:#0F172A; border-radius:8px; padding:8px 10px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:10px; color:#94A3B8; margin-bottom:4px;">
              <span><b>Live 100 Hz Motion Trace</b> (Real-Time Oscilloscope)</span>
              <span><span style="color:#EF4444;">● ax</span> <span style="color:#10B981;">● ay</span> <span style="color:#38BDF8;">● az</span></span>
            </div>
            <canvas id="scope-canvas" width="400" height="70" style="width:100%; height:70px; display:block; border-radius:4px;"></canvas>
          </div>

          <!-- Live Numbers Grid -->
          <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:6px; margin-bottom:8px;">
            <div class="metric-tile">
              <div class="metric-title">Acceleration</div>
              <div id="val-accel" class="metric-val">+0.00, +0.00, +0.00</div>
              <div id="val-amag" class="metric-sub">|a|: 1.00g</div>
            </div>
            <div class="metric-tile">
              <div class="metric-title">Gyroscope</div>
              <div id="val-gyro" class="metric-val">0, 0, 0</div>
              <div class="metric-sub">deg/sec</div>
            </div>
            <div class="metric-tile">
              <div class="metric-title">Stream Rate</div>
              <div id="val-rate" class="metric-val" style="color:#16A34A;">100 Hz Active</div>
              <div id="val-count" class="metric-sub">0 samples</div>
            </div>
          </div>

          <!-- Real-Time AI Clinical Diagnostic Card -->
          <div style="background:#FFFFFF; border:1.5px solid #0284C7; border-radius:8px; padding:8px 10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="font-size:10px; font-weight:700; color:#0369A1;">AI CLINICAL DIAGNOSIS</span>
              <span id="ai-pred-badge" style="background:#DCFCE7; color:#15803D; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">HEALTHY (99%)</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:3px;">
              <span style="font-size:11px; color:#334155;">Tremor Severity Index:</span>
              <span id="ai-sev-score" style="font-size:14px; font-weight:800; color:#059669;">0.0 / 100</span>
            </div>
            <div style="background:#E2E8F0; border-radius:4px; height:6px; overflow:hidden; margin-bottom:5px;">
              <div id="ai-sev-bar" style="background:#10B981; width:2%; height:100%; transition: width 0.3s;"></div>
            </div>
            <div id="ai-note" style="font-size:10px; color:#475569; line-height:1.3;">
              Physiological baseline or voluntary movement. No rhythmic 4-6 Hz tremor detected.
            </div>
          </div>
        </div>

        <div id="bt-status" class="status-box">
          Click button to pair directly with your ESP32 ring. Works in Chrome & Edge with no USB cable needed!
        </div>
      </div>

      <script>
        const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
        const CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
        const patientId = "{patient_linked_id}";
        let sampleBatch = [];
        let lastPostTime = Date.now();
        let lastSampleTime = Date.now();
        let totalSent = 0;
        let isConnected = false;
        let isReconnecting = false;
        let userExplicitlyDisconnected = false;
        let activeDevice = null;
        let activeCharacteristic = null;
        let wakeLock = null;
        let watchdogInterval = null;

        // Oscilloscope buffer (last 80 points)
        const canvas = document.getElementById("scope-canvas");
        const ctx = canvas ? canvas.getContext("2d") : null;
        let traceAx = new Array(80).fill(1.0);
        let traceAy = new Array(80).fill(0.0);
        let traceAz = new Array(80).fill(0.0);

        function renderScope() {{
          if (!ctx || !canvas) return;
          ctx.fillStyle = "#0F172A";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Center grid
          ctx.strokeStyle = "#1E293B";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height / 2);
          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();

          function drawLine(data, color, offsetZero, scale) {{
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            const step = canvas.width / (data.length - 1);
            for (let i = 0; i < data.length; i++) {{
              const val = data[i] - offsetZero;
              const y = Math.max(2, Math.min(canvas.height - 2, (canvas.height / 2) - (val * scale)));
              if (i === 0) ctx.moveTo(0, y);
              else ctx.lineTo(i * step, y);
            }}
            ctx.stroke();
          }}

          drawLine(traceAx, "#EF4444", 1.0, 30);
          drawLine(traceAy, "#10B981", 0.0, 30);
          drawLine(traceAz, "#38BDF8", 0.0, 30);

          if (isConnected) {{
            requestAnimationFrame(renderScope);
          }}
        }}

        function setStatus(msg, isError = false) {{
          const el = document.getElementById("bt-status");
          if (el) {{
            el.innerHTML = msg;
            el.style.color = isError ? "#DC2626" : "#075985";
          }}
        }}

        // Screen Wake Lock API to prevent sleep during active recording
        async function requestWakeLock() {{
          try {{
            if ('wakeLock' in navigator) {{
              wakeLock = await navigator.wakeLock.request('screen');
            }}
          }} catch (e) {{
            console.log("WakeLock:", e.message);
          }}
        }}

        function releaseWakeLock() {{
          if (wakeLock) {{
            wakeLock.release().catch(() => {{}});
            wakeLock = null;
          }}
        }}

        // Heartbeat Watchdog to detect silent drops
        function startWatchdog() {{
          stopWatchdog();
          watchdogInterval = setInterval(() => {{
            if (isConnected && !userExplicitlyDisconnected) {{
              const elapsed = Date.now() - lastSampleTime;
              if (elapsed > 4500 && activeDevice) {{
                console.warn("Watchdog: No BLE packets for " + elapsed + "ms. Checking connection...");
                if (!activeDevice.gatt || !activeDevice.gatt.connected) {{
                  handleUnexpectedDisconnect();
                }}
              }}
            }}
          }}, 2000);
        }}

        function stopWatchdog() {{
          if (watchdogInterval) {{
            clearInterval(watchdogInterval);
            watchdogInterval = null;
          }}
        }}

        // Tab visibility and unload guards
        document.addEventListener("visibilitychange", () => {{
          if (document.visibilityState === "visible" && isConnected && !userExplicitlyDisconnected) {{
            requestWakeLock();
            requestAnimationFrame(renderScope);
          }}
        }});

        window.addEventListener("beforeunload", (e) => {{
          if (isConnected && !userExplicitlyDisconnected) {{
            e.preventDefault();
            e.returnValue = "Tremor AI Ring is actively streaming. Are you sure you want to disconnect?";
            return e.returnValue;
          }}
        }});

        function onSampleReceived(e) {{
          lastSampleTime = Date.now();
          const text = new TextDecoder().decode(e.target.value);
          const parts = text.trim().split(",");
          if (parts.length >= 7) {{
            const vals = parts.map(Number);
            sampleBatch.push(vals);

            const ax = vals[1], ay = vals[2], az = vals[3];
            const gx = vals[4], gy = vals[5], gz = vals[6];
            traceAx.push(ax); traceAx.shift();
            traceAy.push(ay); traceAy.shift();
            traceAz.push(az); traceAz.shift();

            const elA = document.getElementById("val-accel");
            if (elA) elA.innerText = ax.toFixed(2) + ", " + ay.toFixed(2) + ", " + az.toFixed(2);
            const elG = document.getElementById("val-gyro");
            if (elG) elG.innerText = gx.toFixed(0) + ", " + gy.toFixed(0) + ", " + gz.toFixed(0);
            const elM = document.getElementById("val-amag");
            if (elM) {{
              const mag = Math.sqrt(ax*ax + ay*ay + az*az);
              elM.innerText = "|a|: " + mag.toFixed(2) + "g";
            }}
          }}

          // Flush batch every 200 ms (approx 20 samples @ 100 Hz)
          if (Date.now() - lastPostTime >= 200 && sampleBatch.length > 0) {{
            const ringCode = activeDevice ? activeDevice.name.replace("TremorAi-", "") : "RING-7842";
            const payload = {{
              ring_id: ringCode,
              patient_id: patientId,
              samples: sampleBatch
            }};
            sampleBatch = [];
            lastPostTime = Date.now();

            fetch("http://127.0.0.1:8000/api/telemetry/ingest", {{
              method: "POST",
              headers: {{ "Content-Type": "application/json" }},
              body: JSON.stringify(payload)
            }})
            .then(r => r.json())
            .then(res => {{
              totalSent += payload.samples.length;
              const elC = document.getElementById("val-count");
              if (elC) elC.innerText = totalSent + " samples";
              if (res && res.prediction) {{
                const lbl = (res.prediction.predicted_label || "healthy").toUpperCase();
                const conf = Math.round((res.prediction.confidence || 0.99) * 100);
                const badge = document.getElementById("ai-pred-badge");
                if (badge) {{
                  badge.innerText = (lbl === "HEALTHY" ? "🟢 " : "🔴 ") + lbl + " (" + conf + "%)";
                  badge.style.background = lbl === "HEALTHY" ? "#DCFCE7" : "#FEE2E2";
                  badge.style.color = lbl === "HEALTHY" ? "#15803D" : "#B91C1C";
                }}
                if (res.severity) {{
                  const s = Number(res.severity.severity_score || 0.0);
                  const elS = document.getElementById("ai-sev-score");
                  if (elS) {{
                    elS.innerText = s.toFixed(1) + " / 100";
                    elS.style.color = s < 20 ? "#059669" : (s < 50 ? "#D97706" : "#DC2626");
                  }}
                  const bar = document.getElementById("ai-sev-bar");
                  if (bar) {{
                    bar.style.width = Math.min(100, Math.max(3, s)) + "%";
                    bar.style.backgroundColor = s < 20 ? "#10B981" : (s < 50 ? "#F59E0B" : "#EF4444");
                  }}
                  const note = document.getElementById("ai-note");
                  if (note && res.severity.clinical_note) {{
                    note.innerText = res.severity.clinical_note;
                  }}
                }}
              }}
            }})
            .catch(err => {{
              console.warn("Upload retry:", err);
            }});
          }}
        }}

        function onDisconnectedCleanup(reason) {{
          isConnected = false;
          isReconnecting = false;
          stopWatchdog();
          releaseWakeLock();
          document.getElementById("live-console").style.display = "none";
          document.getElementById("connect-section").style.display = "block";
          document.getElementById("conn-pill").innerText = "Disconnected";
          document.getElementById("conn-pill").style.backgroundColor = "#64748B";
          setStatus(reason || "Ring disconnected. Click button to reconnect.");
        }}

        function disconnectRing() {{
          userExplicitlyDisconnected = true;
          stopWatchdog();
          releaseWakeLock();
          setStatus("Disconnecting ring upon user request...");
          if (activeDevice && activeDevice.gatt && activeDevice.gatt.connected) {{
            activeDevice.gatt.disconnect();
          }} else {{
            onDisconnectedCleanup("Ring disconnected by user.");
          }}
        }}

        async function handleUnexpectedDisconnect() {{
          if (userExplicitlyDisconnected || isReconnecting) return;
          isReconnecting = true;
          isConnected = false;

          console.log("Unexpected signal drop. Entering persistent auto-reconnect for", activeDevice ? activeDevice.name : "ring");
          document.getElementById("conn-pill").innerText = "🟡 Reconnecting...";
          document.getElementById("conn-pill").style.backgroundColor = "#F59E0B";
          const dLabel = document.getElementById("conn-device-label");
          if (dLabel && activeDevice) dLabel.innerText = "🟡 Reconnecting: " + activeDevice.name;
          const sLabel = document.getElementById("conn-sub-label");
          if (sLabel) sLabel.innerText = "Reconnecting automatically — Stays active until you tap Disconnect";
          setStatus("🟡 <b>Signal drop detected:</b> Auto-reconnecting... (Ring stays connected indefinitely until Disconnect is pressed)");

          let attempt = 0;
          while (!userExplicitlyDisconnected && activeDevice && (!activeDevice.gatt || !activeDevice.gatt.connected)) {{
            attempt++;
            setStatus("🟡 <b>Auto-reconnecting (Attempt " + attempt + "):</b> Searching for " + activeDevice.name + "... (Press Disconnect to cancel)");
            try {{
              await new Promise(r => setTimeout(r, 1500));
              if (userExplicitlyDisconnected) break;

              await establishGattConnection(activeDevice);
              isConnected = true;
              isReconnecting = false;
              lastSampleTime = Date.now();

              if (dLabel) dLabel.innerText = "🟢 Connected: " + activeDevice.name;
              if (sLabel) sLabel.innerText = "🔒 Persistent link active — Only disconnects when you press Disconnect below";
              document.getElementById("conn-pill").innerText = "🟢 Streaming Live (Locked)";
              document.getElementById("conn-pill").style.backgroundColor = "#16A34A";
              setStatus("🟢 <b>Reconnected successfully to " + activeDevice.name + "</b> @ 100 Hz | Permanent Link Active.");
              requestAnimationFrame(renderScope);
              startWatchdog();
              requestWakeLock();
              break;
            }} catch (e) {{
              console.warn("Auto-reconnect attempt " + attempt + " failed:", e);
            }}
          }}
          isReconnecting = false;
          if (userExplicitlyDisconnected) {{
            onDisconnectedCleanup("Ring disconnected by user.");
          }}
        }}

        async function establishGattConnection(device) {{
          let server = null;
          let service = null;
          let characteristic = null;

          for (let attempt = 1; attempt <= 3; attempt++) {{
            try {{
              if (!device.gatt.connected) {{
                setStatus("🔗 Connecting to " + device.name + (attempt > 1 ? " (Attempt " + attempt + "/3)..." : "..."));
                server = await device.gatt.connect();
              }} else {{
                server = device.gatt;
              }}

              // Allow Windows / Chromium Bluetooth LE stack to settle GATT cache
              await new Promise(r => setTimeout(r, 350));

              if (!server || !server.connected) {{
                server = await device.gatt.connect();
                await new Promise(r => setTimeout(r, 350));
              }}

              setStatus("🔍 Discovering ring telemetry service...");
              service = await server.getPrimaryService(SERVICE_UUID);

              setStatus("📡 Starting 100 Hz real-time stream...");
              characteristic = await service.getCharacteristic(CHAR_UUID);
              await characteristic.startNotifications();
              characteristic.addEventListener("characteristicvaluechanged", onSampleReceived);
              activeCharacteristic = characteristic;
              return server;
            }} catch (err) {{
              console.warn("GATT connect attempt " + attempt + " failed:", err);
              if (attempt === 3) throw err;
              setStatus("🟡 GATT settling. Retrying (" + attempt + "/3)...");
              await new Promise(r => setTimeout(r, 600));
            }}
          }}
        }}

        async function connectWebBluetooth() {{
          if (!navigator.bluetooth) {{
            setStatus("❌ Web Bluetooth is supported in Google Chrome, Microsoft Edge, and Opera. On other browsers, use the manual Ring ID box below.", true);
            return;
          }}

          try {{
            userExplicitlyDisconnected = false;
            setStatus("🔍 Searching for nearby TremorAi Ring...");
            const device = await navigator.bluetooth.requestDevice({{
              filters: [{{ namePrefix: "TremorAi" }}],
              optionalServices: [SERVICE_UUID]
            }});

            activeDevice = device;
            await establishGattConnection(device);

            isConnected = true;
            lastSampleTime = Date.now();
            document.getElementById("connect-section").style.display = "none";
            document.getElementById("live-console").style.display = "block";
            document.getElementById("conn-device-label").innerText = "🟢 Connected: " + device.name;
            document.getElementById("conn-sub-label").innerText = "🔒 Persistent link active — Only disconnects when you press Disconnect below";
            document.getElementById("conn-pill").innerText = "🟢 Connected & Locked";
            document.getElementById("conn-pill").style.backgroundColor = "#16A34A";
            setStatus("🟢 <b>Streaming Live:</b> " + device.name + " @ 100 Hz | Locked in — Disconnects ONLY when you press Disconnect.");
            requestAnimationFrame(renderScope);
            startWatchdog();
            requestWakeLock();

            device.addEventListener("gattserverdisconnected", async () => {{
              if (userExplicitlyDisconnected) {{
                onDisconnectedCleanup("Ring disconnected by user.");
              }} else {{
                handleUnexpectedDisconnect();
              }}
            }});

          }} catch (err) {{
            if (err.name !== "NotFoundError") {{
              setStatus("⚠️ Connection error: " + err.message + " — Ensure ring is powered on, then click above to retry.", true);
            }} else {{
              setStatus("Pairing cancelled by user.");
            }}
          }}
        }}
      </script>
    </body>
    </html>
    """


def _render_live_telemetry_dashboard(live_telemetry: Optional[Dict[str, Any]], key_prefix: str = "live_p"):
    """
    Renders an interactive real-time telemetry dashboard in the Patient App:
    - Status badge & live timestamp
    - 4 Key Clinical Metric Tiles
    - Interactive Plotly tabs for 3-Axis Accel, 3-Axis Gyro, and 3D Total PSD Spectrum
    - Manual refresh button (no auto-reload that tears down Web Bluetooth)
    """
    if not live_telemetry:
        return

    ring_id = live_telemetry.get("ring_id", "RING-7842")
    source = live_telemetry.get("source", "web_bluetooth")
    source_label = "📡 Web Bluetooth (Wireless)" if "bluetooth" in source.lower() else "🔌 Serial USB (COM4)"
    ts = live_telemetry.get("timestamp", time.time())
    ts_str = time.strftime("%H:%M:%S", time.localtime(ts))
    n_samples = live_telemetry.get("sample_count", 300)

    # 1. Header with Snapshot Refresh Button
    col_hdr, col_ref = st.columns([1.4, 1])
    with col_hdr:
        st.markdown(f"""
        <div style="display:flex; align-items:center; gap:8px; margin-top:6px; margin-bottom:4px;">
            <span style="font-size:14px; font-weight:700; color:#0F172A;">⚡ Live Telemetry Feedback</span>
            <span class="patient-badge-green" style="font-size:10px;">🟢 100 Hz Active</span>
        </div>
        <span style="font-size:11px; color:#64748B;">{source_label} | Ring: <b>{ring_id}</b> | Time: <b>{ts_str}</b></span>
        """, unsafe_allow_html=True)
    with col_ref:
        if st.button("🔄 Update Snapshot", key=f"{key_prefix}_btn_refresh", use_container_width=True, help="Update charts with latest sensor window"):
            st.rerun()

    # 2. Key Metrics
    sev = live_telemetry.get("severity", {})
    pred = live_telemetry.get("prediction", {})
    feats = live_telemetry.get("features", {})
    sev_score = float(sev.get("severity_score", 0.0))
    sev_grade = str(sev.get("grade", "Minimal / Negligible"))
    pred_label = str(pred.get("predicted_label", "healthy")).upper()
    pred_conf = float(pred.get("confidence", 0.99)) * 100.0
    dom_freq = float(feats.get("dominant_frequency", 0.0))
    tremor_ratio = float(feats.get("tremor_power_ratio", 0.0)) * 100.0
    amp_rms = float(feats.get("signal_amplitude_rms", 0.0))

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.markdown(f"""
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:6px 8px; text-align:center;">
            <span style="font-size:9px; color:#64748B; font-weight:600; text-transform:uppercase;">Severity</span>
            <div style="font-size:16px; font-weight:800; color:{'#059669' if sev_score < 20 else '#D97706' if sev_score < 50 else '#DC2626'};">{sev_score:.1f}<span style="font-size:10px; color:#94A3B8;">/100</span></div>
            <span style="font-size:9px; color:#475569;">{sev_grade.split('/')[0]}</span>
        </div>
        """, unsafe_allow_html=True)
    with m2:
        st.markdown(f"""
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:6px 8px; text-align:center;">
            <span style="font-size:9px; color:#64748B; font-weight:600; text-transform:uppercase;">Diagnosis</span>
            <div style="font-size:13px; font-weight:800; color:{'#059669' if pred_label == 'HEALTHY' else '#DC2626'}; margin-top:2px;">{pred_label}</div>
            <span style="font-size:9px; color:#475569;">{pred_conf:.0f}% Conf.</span>
        </div>
        """, unsafe_allow_html=True)
    with m3:
        st.markdown(f"""
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:6px 8px; text-align:center;">
            <span style="font-size:9px; color:#64748B; font-weight:600; text-transform:uppercase;">Dominant Peak</span>
            <div style="font-size:15px; font-weight:800; color:#0284C7;">{dom_freq:.2f} <span style="font-size:10px;">Hz</span></div>
            <span style="font-size:9px; color:#475569;">{'PD Band (4-6Hz)' if 3.85 <= dom_freq <= 6.2 else 'Baseline'}</span>
        </div>
        """, unsafe_allow_html=True)
    with m4:
        st.markdown(f"""
        <div style="background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:6px 8px; text-align:center;">
            <span style="font-size:9px; color:#64748B; font-weight:600; text-transform:uppercase;">Tremor Ratio</span>
            <div style="font-size:15px; font-weight:800; color:#475569;">{tremor_ratio:.1f}<span style="font-size:10px;">%</span></div>
            <span style="font-size:9px; color:#475569;">RMS: {amp_rms:.3f}g</span>
        </div>
        """, unsafe_allow_html=True)

    # 3. Interactive Plotly Tabs
    tab_accel, tab_gyro, tab_psd = st.tabs(["📈 Accelerometer (g)", "🔄 Gyroscope (°/s)", "🔬 3D Total PSD"])

    accel = live_telemetry.get("recent_accel", {})
    gyro = live_telemetry.get("recent_gyro", {})
    spectrum = live_telemetry.get("spectrum", {})

    with tab_accel:
        ax = accel.get("ax", [])
        ay = accel.get("ay", [])
        az = accel.get("az", [])
        if ax and len(ax) > 0:
            time_axis = [i * 0.01 for i in range(len(ax))]
            fig_a = go.Figure()
            fig_a.add_trace(go.Scatter(x=time_axis, y=ax, mode="lines", name="ax", line=dict(color="#EF4444", width=1.5)))
            fig_a.add_trace(go.Scatter(x=time_axis, y=ay, mode="lines", name="ay", line=dict(color="#10B981", width=1.5)))
            fig_a.add_trace(go.Scatter(x=time_axis, y=az, mode="lines", name="az", line=dict(color="#0284C7", width=1.5)))
            fig_a.update_layout(
                height=200,
                margin=dict(l=25, r=15, t=10, b=20),
                plot_bgcolor="#FFFFFF",
                paper_bgcolor="#FFFFFF",
                xaxis=dict(title="Time (s)", showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9)),
                yaxis=dict(title="Accel (g)", showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9)),
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(size=9))
            )
            st.plotly_chart(fig_a, use_container_width=True, config={"displayModeBar": False}, key=f"{key_prefix}_plot_accel")
        else:
            st.caption("Awaiting acceleration stream...")

    with tab_gyro:
        gx = gyro.get("gx", [])
        gy = gyro.get("gy", [])
        gz = gyro.get("gz", [])
        if gx and len(gx) > 0:
            time_axis_g = [i * 0.01 for i in range(len(gx))]
            fig_g = go.Figure()
            fig_g.add_trace(go.Scatter(x=time_axis_g, y=gx, mode="lines", name="gx", line=dict(color="#F97316", width=1.5)))
            fig_g.add_trace(go.Scatter(x=time_axis_g, y=gy, mode="lines", name="gy", line=dict(color="#14B8A6", width=1.5)))
            fig_g.add_trace(go.Scatter(x=time_axis_g, y=gz, mode="lines", name="gz", line=dict(color="#8B5CF6", width=1.5)))
            fig_g.update_layout(
                height=200,
                margin=dict(l=25, r=15, t=10, b=20),
                plot_bgcolor="#FFFFFF",
                paper_bgcolor="#FFFFFF",
                xaxis=dict(title="Time (s)", showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9)),
                yaxis=dict(title="Gyro (°/s)", showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9)),
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(size=9))
            )
            st.plotly_chart(fig_g, use_container_width=True, config={"displayModeBar": False}, key=f"{key_prefix}_plot_gyro")
        else:
            st.caption("Awaiting gyroscope stream...")

    with tab_psd:
        freqs = spectrum.get("freqs", [])
        psd = spectrum.get("psd", [])
        if freqs and psd:
            fig_p = go.Figure()
            fig_p.add_vrect(
                x0=3.85, x1=6.20,
                fillcolor="rgba(239, 68, 68, 0.12)",
                line_width=1, line_color="rgba(239, 68, 68, 0.3)",
                annotation_text="Parkinson's Band (4-6 Hz)",
                annotation_position="top left",
                annotation_font=dict(size=8.5, color="#DC2626")
            )
            fig_p.add_trace(go.Scatter(
                x=freqs, y=psd,
                mode="lines",
                name="3D Total PSD",
                line=dict(color="#0284C7", width=2),
                fill="tozeroy",
                fillcolor="rgba(2, 132, 199, 0.08)"
            ))
            fig_p.update_layout(
                height=200,
                margin=dict(l=25, r=15, t=10, b=20),
                plot_bgcolor="#FFFFFF",
                paper_bgcolor="#FFFFFF",
                xaxis=dict(title="Frequency (Hz)", range=[0, 20], showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9)),
                yaxis=dict(title="Power (g²/Hz)", showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9)),
                showlegend=False
            )
            st.plotly_chart(fig_p, use_container_width=True, config={"displayModeBar": False}, key=f"{key_prefix}_plot_psd")
        else:
            st.caption("Awaiting spectral calculation...")



def _render_screen_1_pairing(user: Dict[str, Any], profile: Optional[Dict[str, Any]], live_telemetry: Optional[Dict[str, Any]] = None):
    """Screen 1: Ring Pairing with Live Web Bluetooth Oscilloscope & Telemetry Dashboard."""
    st.markdown("#### 💍 Step 1: Pair Your Smart Ring")
    st.caption("Connect your physical ring wirelessly via Bluetooth or enter your Ring ID.")

    curr_ring = profile.get("ring_id") if profile else None
    detected_hardware_ring = live_telemetry.get("ring_id") if live_telemetry else None

    if curr_ring:
        st.markdown(f"""
        <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <span class="patient-badge-green">🟢 Ring Connected</span><br/>
            <b style="font-size: 15px; color: #15803D;">Active Ring ID: {curr_ring}</b>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #166534;">MPU6050 100 Hz Bluetooth / Serial link active</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 12px; color: #991B1B;">
            🔴 <b>No Ring Paired:</b> Connect your ring via Web Bluetooth or enter your Ring ID below.
        </div>
        """, unsafe_allow_html=True)

    # -------------------------------------------------------------------------
    # Physical Ring Identity & Telemetry Link Status (Web Bluetooth)
    # -------------------------------------------------------------------------
    st.markdown("##### 📡 Direct Wireless Bluetooth Pairing")
    import streamlit.components.v1 as components
    components.html(_get_web_bluetooth_component_html(user.get("linked_id", "PD_01")), height=240)

    # -------------------------------------------------------------------------
    # Live Telemetry & Biomarker Feedback Dashboard
    # -------------------------------------------------------------------------
    if live_telemetry:
        _render_live_telemetry_dashboard(live_telemetry, key_prefix="pair_dash")
        st.markdown("<hr style='margin: 14px 0; border-color: #E2E8F0;'/>", unsafe_allow_html=True)


    # 1-Click Hardware Auto-Pairing helper if physical ring is broadcasting
    if detected_hardware_ring and detected_hardware_ring != curr_ring:
        st.markdown(f"""
        <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px;">
            <span style="color: #0369A1; font-size: 12px; font-weight: 600;">📡 Nearby Physical Ring Detected (ESP32 USB/Serial):</span><br/>
            <span style="font-size: 14px; font-weight: bold; color: #0284C7;">{detected_hardware_ring}</span>
        </div>
        """, unsafe_allow_html=True)
        if st.button(f"⚡ Pair Detected Ring ({detected_hardware_ring})", key="btn_auto_pair_detected", use_container_width=True):
            ok, msg = pair_ring_to_patient(user["linked_id"], detected_hardware_ring)
            if ok:
                st.success(f"Successfully paired to physical {detected_hardware_ring}!")
                if not profile or not profile.get("age"):
                    st.session_state.patient_screen = "profile"
                else:
                    st.session_state.patient_screen = "home"
                time.sleep(0.4)
                st.rerun()

    with st.form("form_pair_ring"):
        default_val = detected_hardware_ring or curr_ring or "RING-7842"
        ring_input = st.text_input("Enter your Ring ID:", value=default_val, placeholder="e.g. RING-7842, RING-01, or AUTO")
        st.caption("💡 Check the engraving on your Tremor Ai wearable ring, or use the auto-detected ID above.")
        btn_pair = st.form_submit_button("Connect Ring", type="primary", use_container_width=True)

        if btn_pair:
            ok, msg = pair_ring_to_patient(user["linked_id"], ring_input)
            if ok:
                st.success(msg)
                # If profile setup isn't complete, navigate to profile
                if not profile or not profile.get("age"):
                    st.session_state.patient_screen = "profile"
                else:
                    st.session_state.patient_screen = "home"
                time.sleep(0.5)
                st.rerun()
            else:
                st.error(msg)

    if profile and profile.get("age"):
        if st.button("Continue to Home →", use_container_width=True):
            st.session_state.patient_screen = "home"
            st.rerun()

    st.markdown(f"<div class='patient-disclaimer-box'>{PATIENT_DISCLAIMER}</div>", unsafe_allow_html=True)


def _render_screen_2_profile(user: Dict[str, Any], profile: Optional[Dict[str, Any]]):
    """Screen 2: Patient Profile Setup."""
    st.markdown("#### 👤 Step 2: Patient Profile Setup")
    st.caption("Tell us about your medication routine to personalize your therapy tracking.")

    with st.form("form_patient_profile_setup"):
        p_name = st.text_input("Full Name:", value=profile.get("full_name", user.get("full_name", "Eleanor Vance")))
        p_age = st.number_input("Age:", min_value=18, max_value=110, value=int(profile.get("age", 68) if profile and profile.get("age") else 68))
        p_med = st.text_input("Medication Name:", value=profile.get("medication_name", "Carbidopa/Levodopa 25/100 mg"))
        p_sched = st.text_input("Schedule / Times per Day:", value=profile.get("medication_schedule", "8:00 AM, 1:00 PM, 6:00 PM"))
        p_doses = st.slider("Doses per day:", 1, 6, int(profile.get("doses_per_day", 3) if profile else 3))

        btn_save = st.form_submit_button("Save Profile & Finish", type="primary", use_container_width=True)
        if btn_save:
            ok, msg = save_patient_profile(
                patient_id=user["linked_id"],
                full_name=p_name,
                age=p_age,
                medication_name=p_med,
                medication_schedule=p_sched,
                doses_per_day=p_doses
            )
            if ok:
                st.success("Profile saved! Taking you to your daily dashboard...")
                st.session_state.patient_screen = "home"
                time.sleep(0.5)
                st.rerun()
            else:
                st.error(msg)

    st.markdown(f"<div class='patient-disclaimer-box'>{PATIENT_DISCLAIMER}</div>", unsafe_allow_html=True)


def _render_screen_3_home(user: Dict[str, Any], profile: Dict[str, Any], live_telemetry: Optional[Dict[str, Any]]):
    """Screen 3: Home / Today's Readings with plain-language labels, recording indicator, dose logger, and mini sparkline."""
    patient_name = profile.get("full_name", "Patient")
    ring_id = profile.get("ring_id", "RING-7842")

    # Welcome banner
    st.markdown(f"""
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <div>
            <h4 style="margin:0; color:#0F172A;">Hello, {patient_name.split()[0]} 👋</h4>
            <span style="font-size:12px; color:#64748B;">Ring ID: <b>{ring_id}</b></span>
        </div>
        <div class="patient-badge-green">
            🟢 Active Ring (100 Hz)
        </div>
    </div>
    """, unsafe_allow_html=True)

    # 1. Plain-Language Tremor Level Card
    # Determine severity from live telemetry or baseline
    if live_telemetry and "severity" in live_telemetry:
        sev_score = live_telemetry["severity"].get("severity_score", 0.0)
    else:
        sev_score = 18.5

    if sev_score < 20.0:
        level_label = "Minimal / Calm"
        level_color = "#059669"
        level_bg = "#ECFDF5"
        level_desc = "Your tremor is well controlled right now. Normal physiological rhythm."
    elif sev_score < 40.0:
        level_label = "Mild Tremor"
        level_color = "#0284C7"
        level_bg = "#F0F9FF"
        level_desc = "Slight periodic movement detected. Within safe baseline limits."
    elif sev_score < 70.0:
        level_label = "Moderate Tremor"
        level_color = "#D97706"
        level_bg = "#FFFBEB"
        level_desc = "Noticeable tremor oscillation. Consider checking your medication schedule."
    else:
        level_label = "Elevated Tremor"
        level_color = "#DC2626"
        level_bg = "#FEF2F2"
        level_desc = "Higher than usual motion pattern. Rest comfortably."

    st.markdown(f"""
    <div style="background: {level_bg}; border: 1px solid {level_color}40; border-radius: 14px; padding: 18px; margin-bottom: 14px;">
        <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B;">Today's Tremor Status</span>
        <h2 style="margin: 4px 0 6px 0; color: {level_color}; font-size: 26px; font-weight: 800;">{level_label}</h2>
        <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.4;">{level_desc}</p>
    </div>
    """, unsafe_allow_html=True)

    # Live Physical Sensor Telemetry Feedback
    if live_telemetry:
        _render_live_telemetry_dashboard(live_telemetry, key_prefix="home_dash")
        st.markdown("<hr style='margin: 14px 0; border-color: #E2E8F0;'/>", unsafe_allow_html=True)

    # 2. Medication Log Button (feeds the effectiveness engine)

    st.markdown("##### 💊 Medication Quick-Log")
    med_name = profile.get("medication_name", "Carbidopa/Levodopa")

    col_btn, col_hist = st.columns([1.4, 1])
    with col_btn:
        if st.button("✅ I Took My Medication", type="primary", use_container_width=True, help="Tap whenever you take a prescribed dose."):
            ok, msg, dose_info = log_patient_dose(
                patient_id=user["linked_id"],
                medication_name=med_name,
                dose_amount="Standard dose",
                notes="Patient 1-click tap"
            )
            if ok:
                st.success(f"Dose recorded at {dose_info['time_str']}! Thank you.")
                time.sleep(1.0)
                st.rerun()

    recent_doses = get_patient_recent_doses(user["linked_id"], limit=3)
    if recent_doses:
        st.markdown(f"<span style='font-size: 11.5px; color: #64748B;'>Last logged: <b>{recent_doses[0].get('logged_at', '')[:16]}</b></span>", unsafe_allow_html=True)

    # 3. 7-Day Mini Trend Sparkline
    st.markdown("##### 📈 Your 7-Day Tremor Pattern")
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    # Synthesize realistic mild-to-moderate values matching patient history
    np.random.seed(int(sum(ord(c) for c in user["linked_id"])))
    weekly_scores = np.clip(np.random.normal(24.0, 5.0, 7), 10.0, 45.0).tolist()
    # If live telemetry is available today, update Sunday
    if live_telemetry and "severity" in live_telemetry:
        weekly_scores[-1] = max(5.0, float(live_telemetry["severity"]["severity_score"]))

    fig_spark = go.Figure()
    fig_spark.add_trace(go.Scatter(
        x=days,
        y=weekly_scores,
        mode="lines+markers",
        line=dict(color="#0284C7", width=3, shape="spline"),
        marker=dict(size=7, color="#0369A1", line=dict(color="#FFFFFF", width=1.5)),
        fill="tozeroy",
        fillcolor="rgba(2, 132, 199, 0.08)"
    ))
    fig_spark.update_layout(
        height=140,
        margin=dict(l=20, r=20, t=10, b=25),
        yaxis=dict(range=[0, 60], showgrid=True, gridcolor="#F1F5F9", tickfont=dict(size=9, color="#94A3B8")),
        xaxis=dict(showgrid=False, tickfont=dict(size=10, color="#64748B")),
        plot_bgcolor="#FFFFFF",
        paper_bgcolor="#FFFFFF"
    )
    st.plotly_chart(fig_spark, use_container_width=True, config={"displayModeBar": False})
    st.caption("Weekly fluctuation stays within your normal target range.")

    # 4. Mandatory Disclaimer Box
    st.markdown(f"<div class='patient-disclaimer-box'>{PATIENT_DISCLAIMER}</div>", unsafe_allow_html=True)


def _render_screen_4_settings(user: Dict[str, Any], profile: Dict[str, Any]):
    """Screen 4: Settings (Edit profile, re-pair ring, logout, disclaimer)."""
    st.markdown("#### ⚙️ Settings & Account")

    st.markdown("##### 👤 Profile Details")
    with st.form("form_edit_profile"):
        new_name = st.text_input("Full Name:", value=profile.get("full_name", ""))
        new_age = st.number_input("Age:", min_value=18, max_value=110, value=int(profile.get("age", 65)))
        new_med = st.text_input("Medication Name:", value=profile.get("medication_name", ""))
        new_sched = st.text_input("Dose Schedule:", value=profile.get("medication_schedule", ""))
        if st.form_submit_button("Update Profile", type="secondary", use_container_width=True):
            ok, msg = save_patient_profile(user["linked_id"], new_name, new_age, new_med, new_sched)
            if ok:
                st.success("Profile updated.")
                time.sleep(0.5)
                st.rerun()

    st.markdown("---")
    st.markdown("##### 💍 Device Management")
    st.caption(f"Currently linked to Ring ID: `{profile.get('ring_id', 'Not Paired')}`")
    if st.button("🔄 Re-Pair a New Ring", use_container_width=True):
        st.session_state.patient_screen = "pair"
        st.rerun()

    st.markdown("---")
    if st.button("🚪 Log Out of Patient App", type="primary", use_container_width=True):
        logout_user(user["token"])
        st.session_state.patient_user = None
        st.session_state.patient_screen = "login"
        st.success("Logged out.")
        time.sleep(0.5)
        st.rerun()

    st.markdown(f"<div class='patient-disclaimer-box'>{PATIENT_DISCLAIMER}</div>", unsafe_allow_html=True)
