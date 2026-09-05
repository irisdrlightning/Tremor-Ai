import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Heart,
  LogOut,
  Pill,
  Phone,
  Power,
  RefreshCw,
  Shield,
  Smile,
  User,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import tremorIcon from "@/assets/tremor-icon.png";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import handScan from "@/assets/hand-scan.png";
import { handScanBase64 } from "@/assets/handScanBase64";
import { useRole } from "@/context/RoleContext";
import { useWebBluetooth } from "@/hooks/useWebBluetooth";
import { api } from "@/lib/api";
import AuthModal from "@/components/auth/AuthModal";

export default function PatientPortal() {
  const { user, activePatientId, activePatient, logout, setRole } = useRole();
  const bluetoothState = useWebBluetooth(activePatientId);

  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggingDose, setIsLoggingDose] = useState(false);
  const [doseSuccessMessage, setDoseSuccessMessage] = useState(null);
  const [recentDoses, setRecentDoses] = useState([
    { time: "08:05 AM", medication: "Carbidopa/Levodopa 25/100 mg", status: "Taken" },
    { time: "01:10 PM", medication: "Carbidopa/Levodopa 25/100 mg", status: "Taken" },
  ]);

  const canvasRef = useRef(null);
  const sampleHistoryRef = useRef([]);

  // Fetch telemetry polling every 400ms
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

  // Update sample history from BLE or from liveTelemetry recent_accel
  useEffect(() => {
    if (bluetoothState.latestSample) {
      sampleHistoryRef.current.push(bluetoothState.latestSample);
      if (sampleHistoryRef.current.length > 200) {
        sampleHistoryRef.current.shift();
      }
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
        const mag = Math.sqrt(ax * ax + ay * ay + az * az);
        pts.push({ timestamp: Date.now(), ax, ay, az, gx: 0, gy: 0, gz: 0, mag });
      }
      sampleHistoryRef.current = pts;
    }
  }, [bluetoothState.latestSample, liveTelemetry]);

  // 60 FPS Oscilloscope render
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Center reference line
      ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const samples = sampleHistoryRef.current;
      if (samples.length > 1) {
        const step = width / Math.max(samples.length - 1, 1);

        // Ax (Red)
        ctx.strokeStyle = "#EF4444";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - (s.ax || 0) * 30;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Ay (Green)
        ctx.strokeStyle = "#10B981";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - (s.ay || 0) * 30;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Az (Sky Blue)
        ctx.strokeStyle = "#0284C7";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - ((s.az || 0) - (bluetoothState.isConnected ? 1.0 : 0)) * 30;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [bluetoothState.isConnected]);

  // Log medication dose handler
  const handleLogDose = async () => {
    setIsLoggingDose(true);
    try {
      const medName = activePatient?.medication_name || "Carbidopa/Levodopa 25/100 mg";
      await api.logPatientDose(
        activePatientId,
        medName,
        "Standard dose",
        "Logged directly from Patient Portal"
      );
      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setRecentDoses((prev) => [{ time: nowTime, medication: medName, status: "Taken Just Now" }, ...prev]);
      setDoseSuccessMessage("✅ Dose logged! Your doctor's dashboard has been updated.");
      setTimeout(() => setDoseSuccessMessage(null), 4000);
    } catch {
      setDoseSuccessMessage("⚠️ Failed to record dose to server. Please try again.");
      setTimeout(() => setDoseSuccessMessage(null), 4000);
    } finally {
      setIsLoggingDose(false);
    }
  };

  const rawDomFreq = liveTelemetry?.features?.dominant_frequency ?? 0.0;
  const isHealthy = (liveTelemetry?.prediction?.predicted_label || "").toLowerCase().includes("healthy") || (liveTelemetry?.prediction?.predicted_label || "").toLowerCase().includes("physio");
  const tremorHz = rawDomFreq >= 0.5 && !isHealthy ? rawDomFreq : 0.0;
  const severityScore = Math.round(liveTelemetry?.severity?.severity_score ?? 0.0);

  const statusLabel =
    severityScore === 0
      ? "Calm / At Rest"
      : severityScore < 20
      ? "Minimal Motion"
      : severityScore < 50
      ? "Mild Tremor"
      : "Moderate Tremor";

  const statusColor =
    severityScore < 20
      ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"
      : severityScore < 50
      ? "text-amber-600 bg-amber-500/10 border-amber-500/30"
      : "text-rose-600 bg-rose-500/10 border-rose-500/30";

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-3 sm:p-6 selection:bg-primary selection:text-primary-foreground">
      {/* Doctor Authorization Modal */}
      <AuthModal
        isOpen={showAuthModal}
        targetRole="doctor"
        onClose={() => setShowAuthModal(false)}
      />

      {/* Toast Alert */}
      {doseSuccessMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-card border border-primary/40 px-5 py-3 text-sm font-medium shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span>{doseSuccessMessage}</span>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-shell p-1 shadow-sm">
              <img
                src={tremorIconBase64 || tremorIcon || "/tremor-icon.png"}
                alt="Tremor AI logo"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-foreground">
                  Patient Health Portal
                </h1>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono-tech uppercase tracking-widest text-primary font-bold">
                  {activePatientId}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono-tech">
                {activePatient?.full_name || "Eleanor Vance"} • Paired with Ring: {activePatient?.ring_id || "RING-7842"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Doctor View switch with authorization */}
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 rounded-full border border-border/70 bg-shell px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-card transition-colors shadow-sm"
            >
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span>Doctor View</span>
            </button>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-destructive hover:bg-card transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* 1. Wearable Ring Wireless Link & Live Oscilloscope (Prominent Top Section) */}
        <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-4 w-4" />
                </span>
                <h2 className="font-display text-lg font-bold">
                  Wearable Tremor Ring Live Link
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-mono-tech">
                {bluetoothState.isConnected
                  ? `Connected via Web Bluetooth to ${bluetoothState.ringId} (100 Hz Real-Time)`
                  : "Streaming motion telemetry live from ring sensor"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {bluetoothState.isConnected ? (
                <button
                  type="button"
                  onClick={bluetoothState.disconnect}
                  className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-all shadow-sm"
                >
                  🛑 Disconnect Ring
                </button>
              ) : (
                <button
                  type="button"
                  onClick={bluetoothState.connect}
                  disabled={bluetoothState.isConnecting}
                  className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-95 active:scale-95 transition-all shadow-md disabled:opacity-50"
                >
                  <Wifi className="h-4 w-4" />
                  {bluetoothState.isConnecting ? "Scanning..." : "⚡ Connect Ring via Bluetooth"}
                </button>
              )}
            </div>
          </div>

          {bluetoothState.error && (
            <div className="mb-4 rounded-2xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive">
              ⚠️ {bluetoothState.error}
            </div>
          )}

          {/* Status Badge Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-2xl border border-border/60 bg-shell/70 p-3">
              <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                Ring Status
              </span>
              <p className="mt-1 font-display text-base font-bold flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {bluetoothState.isConnected ? "BLE Direct" : "Ring Active"}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-shell/70 p-3">
              <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                Current Level
              </span>
              <p className="mt-1 font-display text-base font-bold text-primary">
                {statusLabel}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-shell/70 p-3">
              <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                Tremor Frequency
              </span>
              <p className="mt-1 font-display text-base font-bold text-foreground">
                {tremorHz >= 0.5 ? `${tremorHz.toFixed(1)} Hz` : "0.0 Hz (At Rest)"}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-shell/70 p-3">
              <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                Severity Score
              </span>
              <p className="mt-1 font-display text-base font-bold text-foreground">
                {severityScore} <span className="text-xs font-normal text-muted-foreground">/ 100</span>
              </p>
            </div>
          </div>

          {/* Live Waveform Canvas */}
          <div className="rounded-2xl border border-border/70 bg-shell/90 p-4">
            <div className="flex items-center justify-between text-xs font-mono-tech text-muted-foreground mb-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Ax (g)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Ay (g)
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-sky-500" /> Az (g)
                </span>
              </div>
              <span className="text-primary font-semibold">
                {bluetoothState.isConnected
                  ? `Live 100 Hz Stream (${bluetoothState.sampleCount} pkts)`
                  : "Sensor Oscilloscope Active"}
              </span>
            </div>
            <div className="relative aspect-[16/5] w-full overflow-hidden rounded-xl bg-card">
              <canvas ref={canvasRef} width={700} height={200} className="h-full w-full object-cover" />
            </div>
          </div>
        </section>

        {/* 2. Medication Log Section */}
        <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Pill className="h-4 w-4" />
                </span>
                <h2 className="font-display text-lg font-bold">
                  Medication Tracker
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground font-mono-tech">
                Active Prescription: {activePatient?.medication_name || "Carbidopa/Levodopa 25/100 mg"} • {activePatient?.medication_schedule || "8:00 AM, 1:00 PM, 6:00 PM"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogDose}
              disabled={isLoggingDose}
              className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground shadow-md hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
            >
              <Pill className="h-4 w-4" />
              <span>{isLoggingDose ? "Recording..." : "Log Taken Dose Now"}</span>
            </button>
          </div>

          {/* Dose Log List */}
          <div className="space-y-2.5">
            {recentDoses.map((dose, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-shell/60 p-3.5 text-xs"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{dose.medication}</p>
                    <p className="text-[10px] text-muted-foreground font-mono-tech">Recorded at {dose.time}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-mono-tech text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {dose.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Clinical Support Contact */}
        <section className="rounded-3xl border border-border/80 bg-gradient-to-r from-card to-shell p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              Neurology Institute Clinical Support
            </h3>
            <p className="text-xs text-muted-foreground font-mono-tech mt-0.5">
              Assigned Physician: Dr. Marcus Bell, MD • Telemetry direct channel active
            </p>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-2xl border border-border bg-shell px-4 py-2.5 text-xs font-semibold text-foreground hover:border-primary/50 transition-colors shadow-sm"
          >
            <Phone className="h-4 w-4 text-primary" />
            <span>Contact Clinic</span>
          </button>
        </section>
      </div>
    </div>
  );
}
