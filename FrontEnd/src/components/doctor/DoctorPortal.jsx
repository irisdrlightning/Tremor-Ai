import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Download,
  FileText,
  Filter,
  HeartPulse,
  Layers,
  LogOut,
  Pill,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import tremorIcon from "@/assets/tremor-icon.png";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import handScan from "@/assets/hand-scan.png";
import { handScanBase64 } from "@/assets/handScanBase64";
import { useRole } from "@/context/RoleContext";
import { api } from "@/lib/api";
import AuthModal from "@/components/auth/AuthModal";

export default function DoctorPortal() {
  const {
    user,
    role,
    patients,
    activePatientId,
    setActivePatientId,
    activePatient,
    logout,
    bluetoothState,
  } = useRole();

  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState("patient");
  const [activeTab, setActiveTab] = useState("clinical-overview"); // "clinical-overview" | "titration" | "reports"

  // Prescription titration states
  const [dosageMg, setDosageMg] = useState(100);
  const [carbidopaMg, setCarbidopaMg] = useState(25);
  const [frequency, setFrequency] = useState("TID (Every 5 Hours)");
  const [adjunctTherapy, setAdjunctTherapy] = useState("Rasagiline 0.5 mg daily");
  const [titrationNotes, setTitrationNotes] = useState(
    "Mild morning wearing-off noted. Adjusted mid-day Levodopa dose to stabilize motor symptoms."
  );
  const [isSavingRegimen, setIsSavingRegimen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Search filter for patients
  const [searchQuery, setSearchQuery] = useState("");

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
    if (bluetoothState?.latestSample) {
      sampleHistoryRef.current.push(bluetoothState.latestSample);
      if (sampleHistoryRef.current.length > 200) {
        sampleHistoryRef.current.shift();
      }
    } else if (liveTelemetry && liveTelemetry.recent_accel?.ax) {
      const axArr = liveTelemetry.recent_accel.ax;
      const ayArr = liveTelemetry.recent_accel.ay || [];
      const azArr = liveTelemetry.recent_accel.az || [];
      const pts = [];
      const len = Math.min(axArr.length, 140);
      const start = Math.max(0, axArr.length - len);
      for (let i = start; i < axArr.length; i++) {
        const ax = axArr[i];
        const ay = ayArr[i] || 0;
        const az = azArr[azArr.length > i ? i : 0] || 0;
        pts.push({ timestamp: Date.now(), ax, ay, az });
      }
      sampleHistoryRef.current = pts;
    }
  }, [bluetoothState?.latestSample, liveTelemetry]);

  // 60 FPS Clinical Oscilloscope render
  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let y = 20; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center reference baseline
      ctx.strokeStyle = "rgba(0, 229, 153, 0.25)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      const samples = sampleHistoryRef.current;
      if (samples.length > 1) {
        const step = width / Math.max(samples.length - 1, 1);

        // Ax trace (Red)
        ctx.strokeStyle = "#ff4d4f";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - (s.ax || 0) * 35;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Ay trace (Green)
        ctx.strokeStyle = "#00e599";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - (s.ay || 0) * 35;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Az trace (Sky Blue)
        ctx.strokeStyle = "#00c2ff";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - ((s.az || 0) - (bluetoothState?.isConnected ? 1.0 : 0)) * 35;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [bluetoothState?.isConnected]);

  // Handle saving modified regimen
  const handleSaveRegimen = async () => {
    setIsSavingRegimen(true);
    try {
      const scheduleStr =
        frequency === "BID (Every 8 Hours)"
          ? "8:00 AM, 4:00 PM"
          : frequency === "QID (Every 4 Hours)"
          ? "7:00 AM, 11:00 AM, 3:00 PM, 7:00 PM"
          : "8:00 AM, 1:00 PM, 6:00 PM";

      await api.updateRegimen(
        activePatientId,
        `Carbidopa/Levodopa ${carbidopaMg}/${dosageMg} mg + ${adjunctTherapy}`,
        scheduleStr,
        frequency === "BID (Every 8 Hours)" ? 2 : frequency === "QID (Every 4 Hours)" ? 4 : 3,
        titrationNotes
      );
      setSaveSuccessMsg(`✅ Prescription updated and synced to Patient ${activePatientId} Ring!`);
      setTimeout(() => setSaveSuccessMsg(null), 4500);
    } catch {
      setSaveSuccessMsg("⚠️ Failed to sync regimen to server. Please verify connection.");
      setTimeout(() => setSaveSuccessMsg(null), 4500);
    } finally {
      setIsSavingRegimen(false);
    }
  };

  const rawDomFreq = liveTelemetry?.features?.dominant_frequency ?? 0.0;
  const isHealthy =
    (liveTelemetry?.prediction?.predicted_label || "").toLowerCase().includes("healthy") ||
    (liveTelemetry?.prediction?.predicted_label || "").toLowerCase().includes("physio");
  const dominantHz = rawDomFreq >= 0.5 && !isHealthy ? rawDomFreq.toFixed(1) : "0.0";
  const severityScore = Math.round(liveTelemetry?.severity?.severity_score ?? 0.0);
  const tremorPowerRatio = liveTelemetry?.features?.tremor_power_ratio
    ? (liveTelemetry.features.tremor_power_ratio * 100).toFixed(0)
    : "0";
  const aiLabel = isHealthy
    ? "Physiological Baseline"
    : (liveTelemetry?.prediction?.predicted_label || "Physiological Baseline");

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patient_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#060908] text-[#ededed] p-4 md:p-6 lg:p-8 font-sans selection:bg-[#00e599] selection:text-[#060908]">
      {/* Auth Modal for Switching to Patient Portal */}
      <AuthModal
        isOpen={showAuthModal}
        targetRole={authModalRole}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Toast Alert */}
      {saveSuccessMsg && (
        <div className="fixed top-5 right-5 z-50 rounded-2xl bg-[#0e1713] border border-[#00e599]/60 px-5 py-3.5 text-sm font-medium shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 text-[#00e599]">
          <CheckCircle2 className="h-5 w-5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      <div className="mx-auto max-w-[1540px] space-y-6">
        {/* Doctor Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] p-1 shadow-sm">
              <img
                src={tremorIconBase64 || tremorIcon || "/tremor-icon.png"}
                alt="Tremor AI logo"
                className="h-full w-full object-contain rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-xl font-bold text-white tracking-tight">
                  Doctor Clinical Portal
                </h1>
                <span className="rounded-full bg-[#00e599]/15 px-3 py-0.5 text-[10px] font-mono-tech uppercase tracking-widest text-[#00e599] font-bold border border-[#00e599]/30">
                  CLINICAL WORKBENCH
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono-tech mt-0.5">
                Dr. Marcus Bell, MD • Department of Movement Disorders & Precision Neuromonitoring
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full bg-[#141a17] p-1 border border-[rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={() => setActiveTab("clinical-overview")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === "clinical-overview"
                    ? "bg-[#1f2824] text-[#00e599] shadow-sm font-bold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                Patient Fleet Telemetry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("titration")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === "titration"
                    ? "bg-[#1f2824] text-[#00e599] shadow-sm font-bold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Prescription Titration
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("reports")}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === "reports"
                    ? "bg-[#1f2824] text-[#00e599] shadow-sm font-bold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                UPDRS Reports
              </button>
            </div>

            {/* Switch to Patient Portal with Authorization */}
            <button
              type="button"
              onClick={() => {
                setAuthModalRole("patient");
                setShowAuthModal(true);
              }}
              className="flex items-center gap-2 rounded-full border border-[#00e599]/40 bg-[#00e599]/10 px-4 py-2.5 text-xs font-semibold text-[#00e599] hover:bg-[#00e599]/20 transition-all shadow-sm"
            >
              <User className="h-3.5 w-3.5" />
              <span>Switch to Patient Portal</span>
            </button>

            {/* Doctor Initials Profile */}
            <span className="grid h-9 w-9 place-items-center rounded-full border border-[#00e599]/50 bg-[#141a17] font-mono-tech text-xs font-bold text-[#00e599] shadow-sm">
              MB
            </span>

            {/* Sign Out */}
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="grid h-9 w-9 place-items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#141a17] text-muted-foreground hover:text-[#ff4d4f] hover:bg-[#ff4d4f]/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Doctor Summary KPI Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4 shadow-sm">
            <span className="text-[10px] font-mono-tech uppercase tracking-widest text-muted-foreground">
              Monitored Patients
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-white">
                {patients.length} Active
              </span>
              <span className="text-xs font-mono-tech text-[#00e599] flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-pulse" /> 100% Online
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4 shadow-sm">
            <span className="text-[10px] font-mono-tech uppercase tracking-widest text-muted-foreground">
              Mean UPDRS Part III
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-white">
                {severityScore} <span className="text-sm font-normal text-muted-foreground">/ 100</span>
              </span>
              <span className="text-xs font-mono-tech text-[#00e599] flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5" /> Stable Baseline
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4 shadow-sm">
            <span className="text-[10px] font-mono-tech uppercase tracking-widest text-muted-foreground">
              Fleet Ring Link
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-white">
                {bluetoothState?.isConnected ? "Direct BLE" : "MQTT / Cloud"}
              </span>
              <span className="text-xs font-mono-tech text-[#00e599]">100 Hz Sync</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4 shadow-sm">
            <span className="text-[10px] font-mono-tech uppercase tracking-widest text-muted-foreground">
              Dyskinesia Risk Index
            </span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl font-bold text-[#00e599]">
                Low (3.8%)
              </span>
              <span className="text-xs font-mono-tech text-muted-foreground">Therapeutic Safe</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Clinical Overview & Patient Fleet Telemetry */}
        {activeTab === "clinical-overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Patient Fleet Roster (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#00e599]" />
                    Patient Cohort Roster
                  </h2>
                  <span className="text-xs font-mono-tech text-muted-foreground">
                    {filteredPatients.length} Enrolled
                  </span>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="search"
                      placeholder="Filter patient by name or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-[#00e599]"
                    />
                  </div>
                </div>

                {/* Patient Cards List */}
                <div className="space-y-3">
                  {filteredPatients.map((p) => {
                    const isSelected = p.patient_id === activePatientId;
                    return (
                      <button
                        key={p.patient_id}
                        type="button"
                        onClick={() => setActivePatientId(p.patient_id)}
                        className={`w-full text-left rounded-2xl p-4 transition-all border ${
                          isSelected
                            ? "bg-[#141a17] border-[#00e599] shadow-lg shadow-[#00e599]/5"
                            : "bg-[#0e1210] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#121714]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`grid h-10 w-10 place-items-center rounded-xl font-mono-tech text-xs font-bold ${
                                isSelected
                                  ? "bg-[#00e599] text-[#060908]"
                                  : "bg-[#1f2824] text-[#00e599]"
                              }`}
                            >
                              {p.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white">{p.full_name}</p>
                              <p className="text-[11px] font-mono-tech text-muted-foreground">
                                {p.patient_id} • Age {p.age} • Ring: {p.ring_id}
                              </p>
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              isSelected ? "text-[#00e599] translate-x-1" : "text-muted-foreground"
                            }`}
                          />
                        </div>

                        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[11px] font-mono-tech">
                          <span className="text-muted-foreground truncate max-w-[170px]">
                            💊 {p.medication_name}
                          </span>
                          <span className="text-[#00e599] font-semibold">
                            {isSelected ? `${dominantHz} Hz` : "0.0 Hz"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Selected Patient Clinical Deep Dive (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Patient Selected Dossier Header */}
              <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#141a17] border border-[rgba(255,255,255,0.1)] text-[#00e599] font-display text-xl font-bold">
                      {activePatient?.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-2xl font-bold text-white">
                          {activePatient?.full_name}
                        </h2>
                        <span className="rounded-full bg-[#00e599]/15 px-2.5 py-0.5 text-[10px] font-mono-tech text-[#00e599] font-bold">
                          {activePatientId}
                        </span>
                      </div>
                      <p className="text-xs font-mono-tech text-muted-foreground mt-0.5">
                        Assigned Ring: {activePatient?.ring_id} • Prescription:{" "}
                        {activePatient?.medication_name} • Schedule: {activePatient?.medication_schedule}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-3.5 py-2 text-xs font-mono-tech text-white">
                      Status: <span className="text-[#00e599] font-bold">{aiLabel}</span>
                    </span>
                  </div>
                </div>

                {/* 4 Clinical Indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121714] p-3.5">
                    <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                      Live Tremor Frequency
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-white">
                      {dominantHz} <span className="text-xs text-[#00e599]">Hz</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121714] p-3.5">
                    <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                      Tremor Power Ratio
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-[#00e599]">
                      {tremorPowerRatio}% <span className="text-xs text-muted-foreground">4-7 Hz</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121714] p-3.5">
                    <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                      MDS-UPDRS Part III
                    </span>
                    <p className="mt-1 font-display text-lg font-bold text-white">
                      {severityScore} <span className="text-xs text-muted-foreground">/ 100</span>
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#121714] p-3.5">
                    <span className="text-[10px] font-mono-tech uppercase tracking-wider text-muted-foreground">
                      Edge ML Verdict
                    </span>
                    <p className="mt-1 font-display text-sm font-bold text-[#00e599] truncate">
                      {aiLabel}
                    </p>
                  </div>
                </div>

                {/* Live 6-DOF Kinematics Oscilloscope */}
                <div className="mt-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#070a08] p-4">
                  <div className="flex items-center justify-between text-xs font-mono-tech text-muted-foreground mb-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-white">
                        <Activity className="h-3.5 w-3.5 text-[#00e599]" />
                        Real-Time 6-DOF Kinematics Traces (100 Hz MPU-6050)
                      </span>
                      <span className="flex items-center gap-1 text-[#ff4d4f]">
                        <span className="h-2 w-2 rounded-full bg-[#ff4d4f]" /> Ax
                      </span>
                      <span className="flex items-center gap-1 text-[#00e599]">
                        <span className="h-2 w-2 rounded-full bg-[#00e599]" /> Ay
                      </span>
                      <span className="flex items-center gap-1 text-[#00c2ff]">
                        <span className="h-2 w-2 rounded-full bg-[#00c2ff]" /> Az
                      </span>
                    </div>
                    <span className="rounded-full bg-[#00e599]/10 px-2 py-0.5 text-[10px] font-bold text-[#00e599]">
                      60 FPS Telemetry Stream
                    </span>
                  </div>

                  <div className="relative aspect-[16/6] w-full overflow-hidden rounded-xl bg-[#0a0f0d] border border-[rgba(255,255,255,0.04)]">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={240}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Prescription Titration & Regimen Management */}
        {activeTab === "titration" && (
          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6 md:p-8 shadow-sm max-w-4xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#00e599]/10 text-[#00e599]">
                  <Sliders className="h-4 w-4" />
                </span>
                <h2 className="font-display text-xl font-bold text-white">
                  Clinical Levodopa Titration & Regimen Control
                </h2>
              </div>
              <p className="text-xs text-muted-foreground font-mono-tech mt-1">
                Adjust dosage and schedule for {activePatient?.full_name} ({activePatientId}). Changes are
                instantly synced to the patient portal & wearable ring schedule.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[rgba(255,255,255,0.08)]">
              {/* Levodopa Dose Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
                    Levodopa Dosage (mg)
                  </label>
                  <span className="font-display text-lg font-bold text-[#00e599]">
                    {dosageMg} mg
                  </span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={300}
                  step={25}
                  value={dosageMg}
                  onChange={(e) => setDosageMg(Number(e.target.value))}
                  className="w-full accent-[#00e599]"
                />
                <div className="flex justify-between text-[10px] font-mono-tech text-muted-foreground">
                  <span>50 mg</span>
                  <span>100 mg</span>
                  <span>200 mg</span>
                  <span>300 mg</span>
                </div>
              </div>

              {/* Carbidopa Dose Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
                    Carbidopa Dosage (mg)
                  </label>
                  <span className="font-display text-lg font-bold text-white">
                    {carbidopaMg} mg
                  </span>
                </div>
                <input
                  type="range"
                  min={12.5}
                  max={75}
                  step={12.5}
                  value={carbidopaMg}
                  onChange={(e) => setCarbidopaMg(Number(e.target.value))}
                  className="w-full accent-[#00e599]"
                />
                <div className="flex justify-between text-[10px] font-mono-tech text-muted-foreground">
                  <span>12.5 mg</span>
                  <span>25 mg</span>
                  <span>50 mg</span>
                  <span>75 mg</span>
                </div>
              </div>

              {/* Frequency Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
                  Dosing Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-4 py-3 text-xs font-mono-tech text-white focus:outline-none focus:border-[#00e599]"
                >
                  <option value="BID (Every 8 Hours)">BID — Twice Daily (8:00 AM, 4:00 PM)</option>
                  <option value="TID (Every 5 Hours)">TID — Three Times Daily (8:00 AM, 1:00 PM, 6:00 PM)</option>
                  <option value="QID (Every 4 Hours)">QID — Four Times Daily (7:00 AM, 11:00 AM, 3:00 PM, 7:00 PM)</option>
                </select>
              </div>

              {/* Adjunct Therapy */}
              <div className="space-y-2">
                <label className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
                  Adjunct / Enzyme Inhibitor Therapy
                </label>
                <select
                  value={adjunctTherapy}
                  onChange={(e) => setAdjunctTherapy(e.target.value)}
                  className="w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-4 py-3 text-xs font-mono-tech text-white focus:outline-none focus:border-[#00e599]"
                >
                  <option value="None">None (Monotherapy)</option>
                  <option value="Rasagiline 0.5 mg daily">Rasagiline (MAO-B Inhibitor) 0.5 mg daily</option>
                  <option value="Rasagiline 1.0 mg daily">Rasagiline (MAO-B Inhibitor) 1.0 mg daily</option>
                  <option value="Entacapone 200 mg with each dose">Entacapone (COMT Inhibitor) 200 mg with each dose</option>
                  <option value="Pramipexole 0.375 mg ER">Pramipexole (Dopamine Agonist) 0.375 mg ER</option>
                </select>
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="space-y-2">
              <label className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
                Physician Titration Rationale & Notes
              </label>
              <textarea
                rows={3}
                value={titrationNotes}
                onChange={(e) => setTitrationNotes(e.target.value)}
                className="w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] p-4 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-[#00e599]"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <button
                type="button"
                onClick={handleSaveRegimen}
                disabled={isSavingRegimen}
                className="flex items-center gap-2 rounded-2xl bg-[#00e599] px-6 py-3.5 font-display text-sm font-semibold text-[#060908] hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-[#00e599]/10 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSavingRegimen ? "Transmitting to Ring..." : "Save & Sync Prescription"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: UPDRS Reports & Telemetry Summary */}
        {activeTab === "reports" && (
          <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6 md:p-8 shadow-sm max-w-4xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#00e599]" />
                  MDS-UPDRS Part III Clinical Telemetry Report
                </h2>
                <p className="text-xs text-muted-foreground font-mono-tech mt-1">
                  Comprehensive motor assessment report for Eleanor Vance ({activePatientId})
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  alert("Generated Clinical PDF Telemetry Report for " + activePatient?.full_name);
                }}
                className="flex items-center gap-2 rounded-2xl bg-[#00e599] px-5 py-2.5 text-xs font-semibold text-[#060908] hover:opacity-95 transition-all shadow-md"
              >
                <Download className="h-4 w-4" />
                <span>Export PDF Summary</span>
              </button>
            </div>

            {/* UPDRS Motor Subscale Items */}
            <div className="space-y-3 pt-4 border-t border-[rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between rounded-2xl bg-[#141a17] p-4 border border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="font-semibold text-sm text-white">Item 3.15 — Postural Tremor of Hands</p>
                  <p className="text-xs text-muted-foreground font-mono-tech">Ring Accelerometer Welch PSD Energy (4-7 Hz)</p>
                </div>
                <span className="font-display font-bold text-sm text-[#00e599]">Score: 0 (Normal / Quiescent)</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#141a17] p-4 border border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="font-semibold text-sm text-white">Item 3.16 — Kinetic Tremor of Hands</p>
                  <p className="text-xs text-muted-foreground font-mono-tech">Kinematic Jerk Derivative & Frequency Stability</p>
                </div>
                <span className="font-display font-bold text-sm text-[#00e599]">Score: 0 (Normal)</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#141a17] p-4 border border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="font-semibold text-sm text-white">Item 3.17 — Rest Tremor Amplitude</p>
                  <p className="text-xs text-muted-foreground font-mono-tech">Root Mean Square (RMS) Acceleration: 0.012g</p>
                </div>
                <span className="font-display font-bold text-sm text-[#00e599]">Score: 0 (At Rest / No Tremor)</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#141a17] p-4 border border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="font-semibold text-sm text-white">Item 3.18 — Constancy of Rest Tremor</p>
                  <p className="text-xs text-muted-foreground font-mono-tech">Tremor present 0% of monitored clinical window</p>
                </div>
                <span className="font-display font-bold text-sm text-[#00e599]">Score: 0 (None)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
