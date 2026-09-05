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
  Search,
  Sliders,
  TrendingDown,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { medicationAnalyticsData as initialMedicationData } from "@/data/mockMedicationAnalytics";
import api from "@/services/api";

export default function MedicationAnalytics({
  activeTab = "analytics",
  setActiveTab = () => {},
  initials = "RS",
}) {
  const [data, setData] = useState(initialMedicationData);

  useEffect(() => {
    let active = true;
    api.getMedicationAnalytics().then((res) => {
      if (active && res) {
        setData(res);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const [doseLogged, setDoseLogged] = useState(false);
  const [activeChannel, setActiveChannel] = useState(2);
  const [timeIndex, setTimeIndex] = useState(0);
  const [filterActive, setFilterActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);

  // UPDRS gauge geometry
  const updrsVal = data.subject.updrsScore;
  const updrsMax = data.subject.updrsMax;
  const percentage = Math.min(Math.max(updrsVal / updrsMax, 0), 1);

  const handleExportPDF = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      window.open("http://localhost:8501", "_blank");
    }, 800);
  };

  const handleLogDose = () => {
    setDoseLogged(true);
    setTimeout(() => setDoseLogged(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1440px]">
      {/* Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h4 className="text-sm font-bold text-[#ededed]">Clinical Alerts (2)</h4>
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="text-[#8a9992] hover:text-[#ededed]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] p-3">
                <p className="font-semibold text-[#ededed]">Midday Wear-Off Approaching</p>
                <p className="text-[#8a9992] mt-0.5">
                  Subject TR-90241 kinetic band variance increased 12% in last 30m.
                </p>
              </div>
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] p-3">
                <p className="font-semibold text-[#ededed]">Hardware Calibration Validated</p>
                <p className="text-[#8a9992] mt-0.5">
                  MPU6050 zero-drift sync achieved with 0.02ms latency.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00e599] animate-pulse" />
          <h1 className="font-display text-xl font-bold tracking-tight text-[#ededed] flex items-baseline gap-1.5">
            <span>Tremor</span>
            <span className="font-mono-tech text-xs font-bold text-[#00e599] tracking-widest uppercase">
              AI
            </span>
          </h1>
        </div>

        {/* Global Search Bar */}
        <div className="order-last col-span-2 flex min-w-0 items-center gap-3 rounded-full bg-[#0c100e] border border-[rgba(255,255,255,0.08)] px-5 py-2.5 md:order-none md:col-span-1 max-w-xl mx-auto w-full focus-within:border-[#00e599]/50 transition-colors">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, biomarker, or dose history..."
            className="w-full min-w-0 bg-transparent text-sm text-[#ededed] placeholder:text-[#8a9992] focus:outline-none"
          />
          <Search className="h-4 w-4 shrink-0 text-[#8a9992]" />
        </div>

        {/* Action Buttons & Profile */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={handleLogDose}
            className="flex items-center gap-1.5 rounded-full bg-[#00e599] px-3.5 py-2 text-xs font-bold text-[#021a11] transition-transform active:scale-95 shadow-sm"
          >
            {doseLogged ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            )}
            <span className="hidden sm:inline">{doseLogged ? "Dose Logged" : "Log Dose"}</span>
          </button>

          <button
            type="button"
            aria-label="Call clinician"
            title="Call Clinician"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#00e599] text-[#021a11] transition-transform hover:scale-105 active:scale-95 shadow-sm"
          >
            <Phone className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowNotificationModal(true)}
            aria-label="Notifications"
            title="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-full bg-[#0c100e] border border-[rgba(255,255,255,0.08)] text-[#8a9992] hover:text-[#ededed] transition-transform hover:scale-105 active:scale-95"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#ef4444] animate-pulse" />
          </button>

          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#00e599]/50 bg-[#0c100e] font-mono-tech text-xs font-bold text-[#00e599] shadow-sm">
            {initials}
          </span>
        </div>
      </header>

      {/* Main Grid Content Layout: 12-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-stretch">
        {/* LEFT COLUMN: Kinematic Response (Cols 1-4) */}
        <section className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-wider uppercase text-[#8a9992]">
                KINEMATIC RESPONSE
              </span>
              <span className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-2 py-0.5 font-mono text-[9px] font-bold text-[#00e599] tracking-wider">
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
                  stroke="#141a17"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 25 105 A 85 85 0 0 1 195 105"
                  fill="none"
                  stroke="#00e599"
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
                  ? "border-[#00e599] bg-[#141a17] text-[#00e599]"
                  : "border-[rgba(255,255,255,0.08)] bg-[#141a17] text-[#00e599]"
              }`}
            >
              <span className="font-mono text-[10px] font-bold tracking-wide">
                {data.subject.confidenceText}
              </span>
            </button>
          </div>

          {/* Bottom Biomarker Summary */}
          <div className="mt-8 border-t border-[rgba(255,255,255,0.08)] pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                  Mean Rest Tremor
                </p>
                <p className="mt-1 font-bold text-sm text-[#ededed]">
                  {data.subject.meanRestTremor}{" "}
                  <span className="text-xs font-medium text-[#00e599]">
                    {data.subject.meanRestDelta}
                  </span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                  On-State Stability
                </p>
                <p className="mt-1 font-bold text-sm text-[#00e599]">
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
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
              <h3 className="text-sm font-semibold text-[#ededed]">Titration Metrics</h3>
            </div>
            <span className="font-mono text-[10px] text-[#8a9992]">
              UPDATED {data.titration.updatedTime}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {/* Card 1: Spectral Power */}
            <article className="flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                    SPECTRAL POWER
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
                </div>
                <p className="mt-3 font-mono text-[10px] text-[#8a9992]">Tremor Reduction</p>
                <p className="mt-1 font-bold text-2xl text-[#ededed]">
                  -42.8<span className="text-sm font-normal text-[#00e599]">%</span>
                </p>
              </div>

              <div className="mt-4">
                <svg viewBox="0 0 100 24" className="w-full h-6 text-[#00e599]">
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
              className="flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4 cursor-pointer hover:border-[rgba(255,255,255,0.18)] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                    DOSAGE STATUS
                  </span>
                  <span className="rounded border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-1.5 py-0.2 font-mono text-[8px] font-bold text-[#00e599]">
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
                <p className="text-[#00e599]">{data.titration.dosageStatus.nextDose}</p>
                <p className="text-[#8a9992]">{data.titration.dosageStatus.window}</p>
              </div>
            </article>

            {/* Card 3: Kinetic Band */}
            <article className="flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4">
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
                      activeChannel === idx ? "bg-[#00e599]" : "bg-[#141a17] hover:bg-[#1f2824]"
                    }`}
                    style={{ height: `${ch.level}%` }}
                  />
                ))}
              </div>
            </article>

            {/* Card 4: Compliance */}
            <article className="flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                    COMPLIANCE
                  </span>
                  <span className="font-mono text-[9px] font-bold text-[#00e599]">
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
                <div className="h-1.5 w-full rounded-full bg-[#141a17] overflow-hidden">
                  <div className="h-full w-full rounded-full bg-[#00e599]" />
                </div>
                <p className="mt-2 font-mono text-[9px] text-[#8a9992]">
                  {data.titration.compliance.skippedText}
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* RIGHT COLUMN: 30-Day Response Timeline (Cols 9-12) */}
        <section className="lg:col-span-4 flex flex-col justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
                <h3 className="text-base font-bold text-[#ededed]">30-Day Response Timeline</h3>
              </div>
              <span className="font-mono text-[10px] font-semibold text-[#8a9992]">
                {data.timeline.rangeLabel}
              </span>
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
                    className="flex-1 flex flex-col items-center justify-end h-full group relative focus:outline-none"
                  >
                    <div
                      style={{ height: `${item.val}%` }}
                      className={`w-full rounded-xs transition-colors ${
                        item.isFlare
                          ? "bg-[#00e599]"
                          : selectedDay?.day === item.day
                            ? "bg-[#ededed]"
                            : "bg-[#141a17] group-hover:bg-[#202924]"
                      }`}
                    />
                    <div className="absolute -top-6 hidden group-hover:flex px-1.5 py-0.5 rounded bg-[#141a17] border border-[rgba(255,255,255,0.08)] text-[9px] font-mono text-[#00e599] whitespace-nowrap z-10 pointer-events-none">
                      Day {item.day}: {item.val}% {item.isFlare ? "(Flare)" : ""}
                    </div>
                  </button>
                ))}
              </div>

              {/* Timeline Axis Labels and Legend */}
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-[#8a9992] border-t border-[rgba(255,255,255,0.08)] pt-2">
                <span>Oct 01</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-[#141a17]" />
                    <span>Controlled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-xs bg-[#00e599]" />
                    <span className="text-[#00e599]">Flare Window</span>
                  </div>
                </div>
                <span>Oct 30</span>
              </div>
            </div>
          </div>

          {/* Export Action & Verification Footer */}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#00e599] py-3 text-xs font-bold text-[#021a11] transition-transform active:scale-[0.99]"
            >
              <span>
                {exporting ? "Generating PDF Stream..." : "Export Neurologist PDF Report"}
              </span>
              <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
            </button>

            <div className="flex items-center justify-between font-mono text-[9px] text-[#8a9992]">
              <span>{data.timeline.footer.format}</span>
              <span className="text-[#00e599]">{data.timeline.footer.hash}</span>
            </div>
          </div>
        </section>
      </div>

      {/* BOTTOM SECTION: Sensor Channels & Validation Nodes */}
      <section className="space-y-3 border-t border-[rgba(255,255,255,0.08)] pt-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
            <h3 className="text-xs font-semibold text-[#ededed]">
              Sensor Channels &amp; Validation Nodes
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTimeIndex(Math.max(0, timeIndex - 1))}
              className="grid h-7 w-7 place-items-center rounded-lg bg-[#0c100e] border border-[rgba(255,255,255,0.08)] text-[#8a9992] hover:text-[#ededed] transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTimeIndex(timeIndex + 1)}
              className="grid h-7 w-7 place-items-center rounded-lg bg-[#0c100e] border border-[rgba(255,255,255,0.08)] text-[#8a9992] hover:text-[#ededed] transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Bottom Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card 1: Diurnal Curve */}
          <article className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#141a17] text-[#00e599]">
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

            <svg viewBox="0 0 60 20" className="w-16 h-6 text-[#00e599]">
              <path
                d="M0,10 Q15,0 30,10 T60,10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </article>

          {/* Card 2: Hardware Sync */}
          <article className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#141a17] text-[#00e599]">
                <Radio className="h-4 w-4" />
              </div>
              <div>
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
                  MPU6050 100 HZ
                </p>
                <p className="text-xs font-bold text-[#ededed]">Hardware Sync</p>
                <p className="font-mono text-[10px] text-[#8a9992]">Zero Drift Calibration</p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-[9px] font-bold text-[#00e599] tracking-wider block">
                ACTIVE
              </span>
              <span className="font-mono text-[10px] text-[#8a9992]">0.02ms lag</span>
            </div>
          </article>

          {/* Card 3: FFT Spectrum */}
          <article className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#141a17] text-[#00e599]">
                <BarChart2 className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992]">
                  FFT SPECTRUM
                </p>
                <p className="text-xs font-bold text-[#ededed]">Frequency Tracking</p>
                <p className="font-mono text-[10px] text-[#8a9992]">Peak: 4.88 Hz (Suppressed)</p>
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
