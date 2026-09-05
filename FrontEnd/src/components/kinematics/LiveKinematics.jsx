import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cpu,
  Download,
  Droplet,
  Filter,
  Hand,
  Layers,
  LogOut,
  Phone,
  Pill,
  Power,
  Radio,
  RefreshCw,
  ScanEye,
  Search,
  User,
  Zap,
} from "lucide-react";

import handScan from "@/assets/hand-scan.png";
import { handScanBase64 } from "@/assets/handScanBase64";
import tremorIcon from "@/assets/tremor-icon.png";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import { useRole } from "@/context/RoleContext";
import { api } from "@/lib/api";

import RingConnectBar from "@/components/kinematics/RingConnectBar";
import { Oscilloscope, BiomarkerCards, FftSpectrumChart } from "@/components/kinematics/KinematicsCharts";
import MedicationAnalytics from "@/components/kinematics/MedicationAnalytics";
import LogMedicationDose from "@/components/kinematics/LogMedicationDose";
import SuggestedRegimen from "@/components/kinematics/SuggestedRegimen";
import PatientPortal from "@/components/patient/PatientPortal";
import AuthModal from "@/components/auth/AuthModal";

function TopBar({
  initials,
  activeTab,
  setActiveTab,
  role,
  onOpenAuthSwitch,
  onLogout,
  patients,
  activePatientId,
  setActivePatientId,
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-6">
      <div className="flex min-w-0 items-center gap-3">
        {/* Tremor AI Brand */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-shell px-3 py-1.5 shadow-sm">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border bg-card p-0.5 overflow-hidden shadow-sm">
            <img
              src={tremorIconBase64 || tremorIcon || "/tremor-icon.png"}
              alt="Tremor AI logo"
              className="h-full w-full object-contain rounded-lg"
            />
          </div>
          <div className="flex items-baseline gap-1 leading-none">
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              Tremor
            </span>
            <span className="font-mono-tech text-[11px] font-bold text-primary tracking-wider">
              AI
            </span>
            <span className="ml-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-mono-tech font-bold uppercase tracking-wider text-primary border border-primary/25">
              Patient Portal
            </span>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex min-w-0 items-center gap-1 rounded-full bg-shell p-1 border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab("kinematics")}
            className={`truncate rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "kinematics"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Diagnose (Live Ring)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
              activeTab === "analytics"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Medication Analytics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("log-medicine")}
            className={`truncate rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTab === "log-medicine"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Log Dose
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suggested-regimen")}
            className={`truncate rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
              activeTab === "suggested-regimen"
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Regimen
          </button>
        </div>
      </div>

      {/* Patient Selector & Search */}
      <div className="order-last col-span-2 flex min-w-0 items-center gap-2 md:order-none md:col-span-1">
        <label className="flex flex-1 min-w-0 items-center gap-2.5 rounded-full bg-shell px-4 py-2.5 border border-border/50">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search patient record or biomarker..."
            className="w-full min-w-0 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>

        {patients && patients.length > 0 && (
          <select
            value={activePatientId}
            onChange={(e) => setActivePatientId(e.target.value)}
            className="rounded-full border border-border/60 bg-shell px-3 py-2 text-xs font-mono-tech text-foreground focus:outline-none focus:border-primary"
          >
            {patients.map((p) => (
              <option key={p.patient_id} value={p.patient_id} className="bg-card text-foreground">
                {p.full_name} ({p.patient_id})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Role Switcher & Profile Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Switch to Doctor View (Requires Re-Auth) */}
        <button
          type="button"
          onClick={() => onOpenAuthSwitch("doctor")}
          className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono-tech text-xs font-semibold text-primary transition-all hover:bg-primary/20 shadow-sm"
        >
          <Activity className="h-3.5 w-3.5" />
          Switch to Doctor Portal
        </button>

        <button
          type="button"
          onClick={onLogout}
          title="Sign Out"
          className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
        </button>

        <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/50 bg-card font-mono-tech text-xs font-bold text-primary shadow-sm" title="Logged in as Eleanor Vance">
          {initials || "EV"}
        </span>
      </div>
    </header>
  );
}

function OverviewCard({ activePatient, dominantHz, samplingRate = "100 Hz", rms = "0.012g" }) {
  const isResting = dominantHz === "0.0";

  return (
    <section className="flex flex-col justify-between rounded-3xl border border-border bg-card p-6 md:p-8">
      <div>
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-primary/15 px-3 py-1 font-mono-tech text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/25">
            MY SMART RING & HEALTH
          </span>
          <span className="font-mono-tech text-xs text-muted-foreground">
            Ring: {activePatient?.ring_id || "RING-7842"}
          </span>
        </div>

        <h1 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight md:text-4xl text-foreground">
          {activePatient?.full_name || "Eleanor Vance"}
        </h1>
        <p className="mt-1 flex items-center gap-2 font-mono-tech text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Patient ID: {activePatient?.patient_id || "PD_01"} • Age: {activePatient?.age || 68}
        </p>
      </div>

      <div className="relative my-6">
        <div className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-3xl bg-shell/60 flex items-center justify-center p-3 border border-border/50">
          <img
            src={handScanBase64 || handScan || "/hand-scan.png"}
            alt="Hand tremor scan"
            className="h-full w-full object-contain rounded-2xl block drop-shadow-[0_0_15px_rgba(0,229,153,0.15)]"
          />
        </div>

        {/* Live Tremor Rate Floating Badge */}
        <div className="mt-4 rounded-2xl border border-primary/40 bg-shell/90 p-3.5 backdrop-blur sm:absolute sm:bottom-3 sm:left-2 sm:mt-0 sm:w-44 shadow-lg">
          <p className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Live Tremor Rate
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">
            {dominantHz} <span className="text-sm text-primary font-normal">Hz</span>
          </p>

          {/* Dynamic SVG: flat line when 0.0 Hz, wave when active */}
          <svg viewBox="0 0 140 20" className="mt-1.5 h-5 w-full text-primary">
            {isResting ? (
              <path
                d="M0 10 H140"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-40"
              />
            ) : (
              <path
                d="M0 10 Q 11.6 0 23.3 10 T 46.6 10 T 70 10 T 93.3 10 T 116.6 10 T 140 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            )}
          </svg>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4 font-mono-tech text-xs text-muted-foreground">
        <span>Sampling: {samplingRate}</span>
        <span className="text-primary font-semibold">RMS Amplitude: {rms}</span>
      </div>
    </section>
  );
}

function SensorNodesCard({ isConnected, dominantHz }) {
  const nodes = [
    {
      id: "mpu",
      code: "MPU-6050 NODE",
      title: "6-DOF Wrist IMU",
      subtitle: "±4g Accel • ±1000°/s Gyro",
      status: "100 Hz SYNCED",
      highlight: false,
    },
    {
      id: "ble",
      code: "BLE GATT SERVER",
      title: "ESP32 Nordic GATT",
      subtitle: isConnected ? "Active 100 Hz Stream (0.01s)" : "Bluetooth 4.2 / 5.0 Stack",
      status: isConnected ? "CONNECTED" : "READY",
      highlight: isConnected,
    },
    {
      id: "ml",
      code: "EDGE ML INFERENCE",
      title: "Butterworth + Random Forest",
      subtitle: dominantHz === "0.0" ? "At Rest (0.0 Hz)" : `Resonance: ${dominantHz} Hz Peak`,
      status: "0.02ms LATENCY",
      highlight: false,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Sensor Channels &amp; Node Health
        </h2>
        <span className="font-mono-tech text-xs text-primary">All 3 Channels Synced</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {nodes.map((node) => (
          <article
            key={node.id}
            className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border p-5 transition-all ${
              node.highlight
                ? "border-primary/60 bg-primary/10 shadow-[0_0_20px_rgba(0,229,153,0.15)]"
                : "border-border bg-card"
            }`}
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
              {node.id === "mpu" ? (
                <Cpu className="h-5 w-5" />
              ) : node.id === "ble" ? (
                <Radio className="h-5 w-5" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground">
                {node.highlight && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                <span className="truncate">{node.code}</span>
              </p>
              <p className="truncate font-display text-sm font-semibold text-foreground">
                {node.title}
              </p>
              <p className="truncate font-mono-tech text-xs text-primary/80">{node.subtitle}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="rounded-full bg-shell border border-border px-2 py-1 font-mono-tech text-[10px] uppercase tracking-wider text-primary">
                {node.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function LiveKinematics() {
  const {
    role,
    setRole,
    user,
    logout,
    activePatientId,
    setActivePatientId,
    activePatient,
    patients,
    bluetoothState,
  } = useRole();

  const [activeTab, setActiveTab] = useState("kinematics");
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [authModalRole, setAuthModalRole] = useState(null);
  const sampleHistoryRef = useRef([]);
  const [sampleHistory, setSampleHistory] = useState([]);

  // Fetch telemetry polling every 400ms from backend
  useEffect(() => {
    let timer;
    let isMounted = true;

    async function fetchTelemetry() {
      try {
        const res = await api.getLiveTelemetry();
        if (isMounted && res && res.data) {
          setLiveTelemetry(res.data);
        }
      } catch {
        // silent fallback
      }
      if (isMounted) {
        timer = setTimeout(fetchTelemetry, 400);
      }
    }

    fetchTelemetry();
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Update sample history buffer from BLE or from liveTelemetry recent_accel
  useEffect(() => {
    if (bluetoothState?.latestSample) {
      sampleHistoryRef.current.push(bluetoothState.latestSample);
      if (sampleHistoryRef.current.length > 200) {
        sampleHistoryRef.current.shift();
      }
      setSampleHistory([...sampleHistoryRef.current]);
    } else if (liveTelemetry && liveTelemetry.recent_accel?.ax) {
      const axArr = liveTelemetry.recent_accel.ax;
      const ayArr = liveTelemetry.recent_accel.ay || [];
      const azArr = liveTelemetry.recent_accel.az || [];
      const pts = [];
      const len = Math.min(axArr.length, 120);
      const start = Math.max(0, axArr.length - len);
      for (let i = start; i < axArr.length; i++) {
        const ax = axArr[i];
        const ay = ayArr[i] || 0;
        const az = azArr[azArr.length > i ? i : 0] || 0;
        pts.push({ timestamp: Date.now(), ax, ay, az });
      }
      sampleHistoryRef.current = pts;
      setSampleHistory(pts);
    }
  }, [bluetoothState?.latestSample, liveTelemetry]);

  const rawDomFreq = liveTelemetry?.features?.dominant_frequency ?? 0.0;
  const isHealthy = (liveTelemetry?.prediction?.predicted_label || "").toLowerCase().includes("healthy") || (liveTelemetry?.prediction?.predicted_label || "").toLowerCase().includes("physio");
  const dominantHz = rawDomFreq >= 0.5 && !isHealthy ? rawDomFreq.toFixed(1) : "0.0";
  const rmsStr = `${(liveTelemetry?.features?.signal_amplitude_rms ?? 0.012).toFixed(3)}g`;

  return (
    <div className="min-h-screen bg-[#060908] text-[#ededed] p-4 md:p-6 lg:p-8 selection:bg-primary selection:text-primary-foreground">
      {/* Auth Modal for Role Switching to Doctor */}
      <AuthModal
        isOpen={Boolean(authModalRole)}
        targetRole={authModalRole || "doctor"}
        onClose={() => setAuthModalRole(null)}
      />

      <div className="mx-auto flex max-w-[1540px] gap-6">
        {/* Left Vertical Sidebar */}
        <aside className="hidden w-16 shrink-0 flex-col items-center justify-between rounded-2xl bg-[#0c100e] border border-[rgba(255,255,255,0.08)] py-5 lg:flex">
          <div className="flex flex-col items-center gap-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a17] border border-[rgba(255,255,255,0.08)] text-[#00e599] font-bold text-sm shadow-sm">
              T<span className="text-xs -ml-0.5">+</span>
            </div>

            <nav className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("kinematics")}
                title="Diagnose (Live Ring)"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-all ${
                  activeTab === "kinematics"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-[#141a17]"
                }`}
              >
                <Activity className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                title="Medication Analytics"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-all ${
                  activeTab === "analytics"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-[#141a17]"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("log-medicine")}
                title="Log Medication Dose"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-all ${
                  activeTab === "log-medicine"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-[#141a17]"
                }`}
              >
                <Pill className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("suggested-regimen")}
                title="Suggested Regimen"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-all ${
                  activeTab === "suggested-regimen"
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-[#141a17]"
                }`}
              >
                <ClipboardList className="h-4 w-4" />
              </button>
            </nav>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign Out / Lock Session"
            className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(255,255,255,0.08)] text-muted-foreground transition-colors hover:text-destructive hover:border-destructive/40 hover:bg-[#141a17]"
          >
            <Power className="h-4 w-4" />
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 space-y-6">
          {/* Header & Role Navigation */}
          <TopBar
            initials={user?.initials || "MB"}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            role={role}
            onOpenAuthSwitch={(target) => setAuthModalRole(target)}
            onLogout={logout}
            patients={patients}
            activePatientId={activePatientId}
            setActivePatientId={setActivePatientId}
          />

          {/* Conditional View Rendering */}
          {activeTab === "analytics" ? (
            <div className="space-y-6">
              <RingConnectBar
                bluetoothState={bluetoothState}
                liveTelemetry={liveTelemetry}
                activePatientId={activePatientId}
              />
              <MedicationAnalytics
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                initials={user?.initials || "MB"}
              />
            </div>
          ) : activeTab === "log-medicine" ? (
            <div className="space-y-6">
              <RingConnectBar
                bluetoothState={bluetoothState}
                liveTelemetry={liveTelemetry}
                activePatientId={activePatientId}
              />
              <LogMedicationDose
                activeTab={activeTab}
                setActiveTab={setActiveTab}
              />
            </div>
          ) : activeTab === "suggested-regimen" ? (
            <div className="space-y-6">
              <RingConnectBar
                bluetoothState={bluetoothState}
                liveTelemetry={liveTelemetry}
                activePatientId={activePatientId}
              />
              <SuggestedRegimen
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                initials={user?.initials || "MB"}
              />
            </div>
          ) : (
            /* Main "Diagnose" Live Workbench */
            <div className="space-y-6">
              {/* 1. Unmissable Ring Connect & Scanning Bar */}
              <RingConnectBar
                bluetoothState={bluetoothState}
                liveTelemetry={liveTelemetry}
                activePatientId={activePatientId}
              />

              {/* 2. Top Overview & 60 FPS Oscilloscope Section */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
                <OverviewCard
                  activePatient={activePatient}
                  dominantHz={dominantHz}
                  samplingRate={bluetoothState?.isConnected ? "100 Hz BLE" : "100 Hz UART/Sim"}
                  rms={rmsStr}
                />
                <Oscilloscope
                  samples={sampleHistory}
                  latestRaw={liveTelemetry?.raw_latest}
                  isConnected={bluetoothState?.isConnected}
                />
              </div>

              {/* 3. Fully Functional Biomarker & Graph Classifications */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Kinematic Tremor Biomarkers &amp; AI Classification
                  </h2>
                  <span className="font-mono-tech text-xs text-primary font-bold">
                    LIVE STREAM ACTIVE
                  </span>
                </div>
                <BiomarkerCards telemetry={liveTelemetry} />
              </div>

              {/* 4. Live FFT Power Spectral Density (PSD) Spectrum */}
              <FftSpectrumChart
                spectrum={liveTelemetry?.spectrum}
                dominantFrequency={rawDomFreq >= 0.5 && !isHealthy ? rawDomFreq : 0.0}
              />

              {/* 5. Sensor Channels & Node Health */}
              <SensorNodesCard
                isConnected={bluetoothState?.isConnected}
                dominantHz={dominantHz}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
