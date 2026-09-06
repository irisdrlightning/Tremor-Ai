import {
  Activity,
  ArrowRight,
  BarChart2,
  Bell,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Sliders,
  TrendingDown,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { medicationAnalyticsData as initialMedicationData } from "@/data/mockMedicationAnalytics";
import api from "@/services/api";
import NotificationsModal from "@/components/kinematics/NotificationsModal";
import WearableConnectModal from "@/components/kinematics/WearableConnectModal";
import UserProfileModal from "@/components/common/UserProfileModal";
import TremorHeaderBrand from "@/components/common/TremorHeaderBrand";
import TopActionCluster from "@/components/common/TopActionCluster";

export default function MedicationAnalytics({
  activeTab = "analytics",
  setActiveTab = () => {},
  initials = "RS",
  liveData = null,
  bleData = null,
  bleState = null,
  deviceName = null,
  syncHistoryFromDevice = null,
}) {
  const [data, setData] = useState(initialMedicationData);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await api.getMedicationAnalytics();
      if (res) setData(res);
    } catch (err) {
      console.warn("Error fetching analytics", err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Listen for hardware telemetry & dose sync events from Ring
  useEffect(() => {
    const handleSyncEvent = () => {
      fetchAnalytics();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("tremor:dose-synced", handleSyncEvent);
      window.addEventListener("tremor:day-synced", handleSyncEvent);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("tremor:dose-synced", handleSyncEvent);
        window.removeEventListener("tremor:day-synced", handleSyncEvent);
      }
    };
  }, []);

  // Periodic Auto-Sync from backend / hardware
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 6000);
    return () => clearInterval(interval);
  }, [autoSync]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    if (typeof syncHistoryFromDevice === "function") {
      try {
        await syncHistoryFromDevice();
      } catch (err) {
        console.warn("Hardware sync trigger error:", err);
      }
    }
    await fetchAnalytics();
    setTimeout(() => setIsSyncing(false), 700);
  };

  // Derive live values (BLE priority > WebSocket)
  const liveImu  = bleData?.raw ?? liveData?.rawImu ?? null;
  const liveHz   = bleData?.tremorRate ?? liveData?.tremorRate ?? null;
  const liveRms  = bleData?.rms ?? liveData?.rms ?? null;

  const [doseLogged, setDoseLogged] = useState(false);
  const [activeChannel, setActiveChannel] = useState(2);
  const [timeIndex, setTimeIndex] = useState(0);
  const [filterActive, setFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWearableModal, setShowWearableModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // UPDRS gauge geometry
  const updrsVal = data.subject.updrsScore;
  const updrsMax = data.subject.updrsMax;
  const percentage = Math.min(Math.max(updrsVal / updrsMax, 0), 1);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await api.downloadDoctorReportPdf(data.subject.id || "TR-90241");
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error("PDF export error", err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportDaySessionPDF = async () => {
    if (!selectedDay) return;
    try {
      await api.downloadSessionReportPdf(data.subject.id || "TR-90241");
    } catch (err) {
      console.error("Day session PDF export error", err);
    }
  };

  const handleLogDose = () => {
    setDoseLogged(true);
    setTimeout(() => setDoseLogged(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1440px]">
      {/* Notification Modal (Image 6 design) */}
      <NotificationsModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        {/* Universal Tremor AI Brand Header */}
        <TremorHeaderBrand title="Medication Analytics" subtitle="Longitudinal" />

        {/* Canonical 3-Circle Header Action Cluster */}
        <TopActionCluster
          onOpenBluetooth={() => setShowWearableModal(true)}
          onOpenNotifications={() => setShowNotificationModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
      </header>

      {/* Hardware BLE Wearable Modal */}
      <WearableConnectModal
        isOpen={showWearableModal}
        onClose={() => setShowWearableModal(false)}
      />

      {/* User Profile & Demographic Editing Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Main Grid Content Layout: 12-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        {/* LEFT COLUMN: Kinematic Response (Cols 1-4) */}
        <section className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-[#152326] bg-black p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[#8a9992]">
                KINEMATIC RESPONSE
              </span>
              <span className="rounded-full border border-[#10B981] bg-black px-2.5 py-0.5 font-mono text-[9px] font-bold text-[#10B981] tracking-wider">
                {data.subject.status}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#ededed]">
              Longitudinal Profile
            </h2>
            <p className="mt-1 font-mono text-xs text-[#8a9992]">
              Subject: {data.subject.name} ({data.subject.id})
            </p>

            {/* UPDRS Semi-Circular Gauge */}
            <div className="relative mt-8 mb-4 flex flex-col items-center justify-center">
              <svg width="220" height="120" viewBox="0 0 220 120" className="overflow-visible">
                <path
                  d="M 25 105 A 85 85 0 0 1 195 105"
                  fill="none"
                  stroke="#152326"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 25 105 A 85 85 0 0 1 195 105"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray="267"
                  strokeDashoffset={267 * (1 - percentage)}
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              <div className="absolute bottom-1 flex flex-col items-center text-center">
                <span className="font-mono text-[9px] font-semibold tracking-wider text-[#8a9992] uppercase">
                  MDS-UPDRS SCORE
                </span>
                <div className="mt-1 flex items-baseline gap-1 font-bold text-[#ededed]">
                  <span className="text-3xl font-extrabold">{updrsVal}</span>
                  <span className="text-sm font-normal text-[#8a9992]">/ {updrsMax}</span>
                </div>
              </div>
            </div>

            {/* Confidence Pill Button */}
            <button
              type="button"
              onClick={() => setFilterActive(!filterActive)}
              className={`mx-auto mt-3 block rounded-full border px-4 py-2 text-center transition-colors ${
                filterActive
                  ? "border-[#10B981] bg-black text-[#10B981]"
                  : "border-[#152326] bg-black text-[#10B981]"
              }`}
            >
              <span className="font-mono text-[10px] font-bold tracking-wide">
                {data.subject.confidenceText}
              </span>
            </button>
          </div>

          {/* Bottom Biomarker Summary */}
          <div className="mt-8 border-t border-[#152326] pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                  Mean Rest Tremor
                </p>
                <p className="mt-1 font-bold text-sm text-[#ededed]">
                  {data.subject.meanRestTremor}{" "}
                  <span className="text-xs font-medium text-[#10B981]">
                    {data.subject.meanRestDelta}
                  </span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                  On-State Stability
                </p>
                <p className="mt-1 font-bold text-sm text-[#10B981]">
                  {data.subject.onStateStability}{" "}
                  <span className="text-xs font-normal text-[#8a9992]">
                    {data.subject.onStateLabel}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: Titration Metrics (Cols 5-8) */}
        <section className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#ededed]">Titration Metrics</h3>
            </div>
            <span className="font-mono text-[10px] text-[#8a9992]">
              UPDATED {data.titration.updatedTime}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {/* Card 1: Spectral Power */}
            <article className="flex flex-col justify-between rounded-2xl border border-[#152326] bg-black p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                    SPECTRAL POWER
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                </div>
                <p className="mt-3 font-mono text-[10px] text-[#8a9992]">Tremor Reduction</p>
                <p className="mt-1 font-bold text-2xl text-[#ededed]">
                  -42.8<span className="text-sm font-normal text-[#10B981]">%</span>
                </p>
              </div>

              <div className="mt-4">
                <svg viewBox="0 0 100 24" className="w-full h-6 text-[#10B981]">
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="0,20 15,19 30,17 45,18 60,14 75,16 90,10 100,8"
                  />
                </svg>
                <p className="mt-2 font-mono text-[9px] text-[#8a9992]">
                  {data.titration.spectralPower.status}
                </p>
              </div>
            </article>

            {/* Card 2: Dosage Status */}
            <article
              onClick={() => setActiveTab("log-medicine")}
              className="flex flex-col justify-between rounded-2xl border border-[#152326] bg-black p-4 cursor-pointer hover:border-[#10B981] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                    DOSAGE STATUS
                  </span>
                  <span className="rounded-full border border-[#10B981] bg-black px-2 py-0.5 font-mono text-[8px] font-bold text-[#10B981]">
                    {data.titration.dosageStatus.tag}
                  </span>
                </div>
                <p className="mt-3 font-mono text-[10px] text-[#8a9992]">
                  {data.titration.dosageStatus.medication}
                </p>
                <p className="mt-1 font-bold text-2xl text-[#ededed]">
                  {data.titration.dosageStatus.dosage}
                  <span className="text-xs font-normal text-[#8a9992] ml-1">
                    {data.titration.dosageStatus.unit}
                  </span>
                </p>
              </div>

              <div className="mt-4 font-mono text-[9px] space-y-1">
                <p className="text-[#10B981]">{data.titration.dosageStatus.nextDose}</p>
                <p className="text-[#8a9992]">{data.titration.dosageStatus.window}</p>
              </div>
            </article>

            {/* Card 3: Kinetic Band */}
            <article className="flex flex-col justify-between rounded-2xl border border-[#152326] bg-black p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                    KINETIC BAND
                  </span>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-[#8a9992]">
                    {data.titration.kineticBand.tag}
                  </span>
                </div>
                <p className="mt-3 font-mono text-[10px] text-[#8a9992]">
                  {data.titration.kineticBand.label}
                </p>
                <p className="mt-1 font-bold text-2xl text-[#ededed]">
                  {data.titration.kineticBand.value}
                  <span className="text-xs font-normal text-[#8a9992] ml-1">
                    {data.titration.kineticBand.unit}
                  </span>
                </p>
              </div>

              {/* Channel Selector Bars */}
              <div className="mt-4 flex items-end gap-1.5 h-6">
                {data.titration.kineticBand.channels.map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveChannel(idx)}
                    title={`Channel ${idx + 1}`}
                    className={`flex-1 rounded-xs transition-colors ${
                      activeChannel === idx ? "bg-[#10B981]" : "bg-[#152326] hover:bg-[#1e3439]"
                    }`}
                    style={{ height: `${ch.level}%` }}
                  />
                ))}
              </div>
            </article>

            {/* Card 4: Compliance */}
            <article className="flex flex-col justify-between rounded-2xl border border-[#152326] bg-black p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                    COMPLIANCE
                  </span>
                  <span className="font-mono text-[9px] font-bold text-[#10B981]">
                    {data.titration.compliance.rate}
                  </span>
                </div>
                <p className="mt-3 font-mono text-[10px] text-[#8a9992]">
                  {data.titration.compliance.label}
                </p>
                <p className="mt-1 font-bold text-2xl text-[#ededed]">
                  {data.titration.compliance.taken}{" "}
                  <span className="text-sm font-normal text-[#8a9992]">
                    / {data.titration.compliance.total}
                  </span>
                </p>
              </div>

              <div className="mt-4">
                <div className="h-1.5 w-full rounded-full bg-[#152326] overflow-hidden">
                  <div className="h-full w-full rounded-full bg-[#10B981]" />
                </div>
                <p className="mt-2 font-mono text-[9px] text-[#8a9992]">
                  {data.titration.compliance.skippedText}
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* RIGHT COLUMN: 30-Day Response Timeline (Cols 9-12) */}
        <section className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-[#152326] bg-black p-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                <h3 className="text-base font-bold text-[#ededed]">30-Day Response Timeline</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoSync(!autoSync)}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-0.5 font-mono text-[9px] font-bold border transition-colors cursor-pointer ${
                    autoSync
                      ? "border-[#10B981] bg-black text-[#10B981]"
                      : "border-[#152326] bg-black text-slate-400"
                  }`}
                  title={autoSync ? "Auto-sync enabled (updating real-time)" : "Auto-sync disabled (click to enable)"}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${autoSync ? "bg-[#10B981] animate-pulse" : "bg-[#8a9992]"}`} />
                  <span>{autoSync ? "AUTO SYNC" : "MANUAL"}</span>
                </button>
                <span className="font-mono text-[10px] font-semibold text-[#8a9992]">
                  {data.timeline.rangeLabel}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-[#8a9992]">{data.timeline.subtitle}</p>

            {/* Bar Chart Representation with clickable days */}
            <div className="mt-6">
              <div className="flex items-end justify-between gap-[3px] h-36 pt-2">
                {data.timeline.days.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDay(item)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative focus:outline-none cursor-pointer"
                  >
                    <div
                      style={{ height: `${item.val}%` }}
                      className={`w-full rounded-xs transition-colors ${
                        item.isFlare
                          ? "bg-[#10B981]"
                          : selectedDay?.day === item.day
                            ? "bg-[#ededed]"
                            : "bg-[#152326] group-hover:bg-[#1e3439]"
                      }`}
                    />
                    <div className="absolute -top-6 hidden group-hover:flex px-1.5 py-0.5 rounded bg-black border border-[#152326] text-[9px] font-mono text-[#10B981] whitespace-nowrap z-10 pointer-events-none">
                      Day {item.day}: {item.val}% {item.isFlare ? "(Flare)" : ""}
                    </div>
                  </button>
                ))}
              </div>

              {/* Timeline Axis Labels and Legend */}
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-[#8a9992] border-t border-[#152326] pt-2">
                <span>Oct 01</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-[#152326]" />
                    <span>Controlled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-[#10B981]" />
                    <span className="text-[#10B981]">Flare Window</span>
                  </div>
                </div>
                <span>Oct 30</span>
              </div>
            </div>
          </div>

            {/* Selected Day Telemetry Inspector */}
            {selectedDay ? (
              <div className="mt-4 rounded-xl border border-[#152326] bg-black p-3 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-[#152326] pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                    <span className="font-bold text-[#ededed]">Day {selectedDay.day} Telemetry</span>
                    <span className="text-[10px] text-[#8a9992]">({selectedDay.dateStr || `Day ${selectedDay.day}`})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="text-[#8a9992] hover:text-[#ededed] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div className="rounded-lg bg-black p-1.5 border border-[#152326]">
                    <span className="text-[#8a9992] block text-[8px]">SEVERITY</span>
                    <span className="font-bold text-[#ededed]">{selectedDay.severityScore || selectedDay.val}/100</span>
                  </div>
                  <div className="rounded-lg bg-black p-1.5 border border-[#152326]">
                    <span className="text-[#8a9992] block text-[8px]">PEAK FREQ</span>
                    <span className="font-bold text-[#10B981]">{selectedDay.peakHz || 4.88} Hz</span>
                  </div>
                  <div className="rounded-lg bg-black p-1.5 border border-[#152326]">
                    <span className="text-[#8a9992] block text-[8px]">RMS AMP</span>
                    <span className="font-bold text-[#ededed]">{selectedDay.rms || "0.142"}g</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] pt-1">
                  <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${selectedDay.isFlare ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-black border border-[#10B981] text-[#10B981]"}`}>
                    {selectedDay.status || "Controlled"}
                  </span>
                  <button
                    type="button"
                    onClick={handleExportDaySessionPDF}
                    className="flex items-center gap-1 text-[#10B981] hover:underline font-mono text-[9px] cursor-pointer"
                  >
                    <Download className="h-3 w-3" /> Day PDF Report
                  </button>
                </div>
              </div>
            ) : null}

            {/* Export Action & Verification Footer */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={exporting}
                onClick={handleExportPDF}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] py-3 text-xs font-bold text-black transition-transform active:scale-[0.99] disabled:opacity-75 hover:brightness-110 cursor-pointer"
              >
                <span>
                  {exporting
                    ? "Compiling Neurologist PDF..."
                    : exportSuccess
                    ? "PDF Report Downloaded!"
                    : "Export Neurologist PDF Report"}
                </span>
                {exportSuccess ? (
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                )}
              </button>

              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] text-[#8a9992]">
                  SHA-256 Checksum:{" "}
                  <span className="text-[#10B981]">{data.timeline.footer.hash}</span>
                </p>
              </div>
            </div>
        </section>
      </div>

      {/* BOTTOM SECTION: Sensor Channels & Validation Nodes */}
      <section className="space-y-3 border-t border-[#152326] pt-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <h3 className="text-xs font-semibold text-[#ededed]">
              Sensor Channels &amp; Validation Nodes
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))}
              className="grid h-7 w-7 place-items-center rounded-lg bg-black border border-[#152326] text-[#8a9992] hover:text-[#ededed] transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTimeIndex(timeIndex + 1)}
              className="grid h-7 w-7 place-items-center rounded-lg bg-black border border-[#152326] text-[#8a9992] hover:text-[#ededed] transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Bottom Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card 1: Diurnal Curve */}
          <article className="flex items-center justify-between rounded-xl border border-[#152326] bg-black p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-black border border-[#10B981] text-[#10B981]">
                <TrendingDown className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                  DIURNAL CURVE
                </p>
                <p className="text-xs font-bold text-[#ededed]">Hourly Variance</p>
                <p className="font-mono text-[10px] text-[#8a9992]">
                  {timeIndex % 2 === 0 ? "08:00 - 20:00 (12h)" : "20:00 - 08:00 (12h)"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992] block">RMS</span>
              <span className="font-mono text-[11px] font-bold text-[#ededed]">
                {liveRms ?? "—"}
              </span>
            </div>
          </article>

          {/* Card 2: Hardware Sync */}
          <article className="flex items-center justify-between rounded-xl border border-[#152326] bg-black p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-black border border-[#10B981] text-[#10B981]">
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  MPU6050 100 HZ
                </p>
                <p className="text-xs font-bold text-[#ededed]">Hardware Sync</p>
                <p className="font-mono text-[10px] text-[#8a9992]">
                  {liveImu
                    ? `X ${(liveImu.ax ?? liveImu.accelX ?? 0).toFixed(3)}g  Y ${(liveImu.ay ?? liveImu.accelY ?? 0).toFixed(3)}g  Z ${(liveImu.az ?? liveImu.accelZ ?? 0).toFixed(3)}g`
                    : "Zero Drift Calibration"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-[9px] font-bold text-[#10B981] tracking-wider block">
                {liveImu ? "LIVE" : "ACTIVE"}
              </span>
              <span className="font-mono text-[10px] text-[#8a9992]">0.02ms lag</span>
            </div>
          </article>

          {/* Card 3: FFT Spectrum */}
          <article className="flex items-center justify-between rounded-xl border border-[#152326] bg-black p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-black border border-[#10B981] text-[#10B981]">
                <BarChart2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                  FFT SPECTRUM
                </p>
                <p className="text-xs font-bold text-[#ededed]">Frequency Tracking</p>
                <p className="font-mono text-[10px] text-[#8a9992]">
                  {liveHz ? `Live: ${liveHz} Hz` : "Peak: 4.88 Hz (Suppressed)"}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992] block">
                SPECTRAL Q
              </span>
              <span className="font-mono text-[11px] font-bold text-[#ededed]">0.82 ratio</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
