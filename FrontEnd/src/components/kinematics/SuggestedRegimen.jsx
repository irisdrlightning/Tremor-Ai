import {
  Activity,
  ArrowRight,
  BarChart2,
  Bell,
  Check,
  ChevronRight,
  Pill,
  Power,
  Radio,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";
import UserProfileModal from "@/components/common/UserProfileModal";
import NotificationsModal from "@/components/kinematics/NotificationsModal";

export default function SuggestedRegimen({
  activeTab = "suggested-regimen",
  setActiveTab = () => {},
  initials = "RS",
  liveData = null,
  bleData = null,
  onSignOut = () => {},
  onNavigate = () => {},
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftMinutes, setShiftMinutes] = useState(30);
  const [nocturnalMg, setNocturnalMg] = useState(100);
  const [activeDoseIdx, setActiveDoseIdx] = useState(null);

  // Derive live telemetry values if active
  const liveImu = bleData?.raw ?? liveData?.rawImu ?? null;
  const liveHz = bleData?.tremorRate ?? liveData?.tremorRate ?? null;

  const handleConfirm = () => {
    setConfirmed(true);
  };

  const handleTabClick = (tabId) => {
    if (setActiveTab) {
      setActiveTab(tabId);
    }
    if (onNavigate) {
      onNavigate(tabId);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#000000] text-white selection:bg-[#10B981]/30 selection:text-[#10B981] font-sans antialiased overflow-hidden">
      {/* Parameter Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#152326] bg-[#0b1112] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#152326] pb-3">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Adjust Titration Parameters</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Modify circadian shift &amp; bedtime dosage</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-[#152326] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-5 text-xs">
              <div>
                <label className="block text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                  Midday Dose Shift (Advance Timing)
                </label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setShiftMinutes(mins)}
                      className={`rounded-xl py-2.5 border font-mono text-xs font-semibold transition-all ${
                        shiftMinutes === mins
                          ? "border-[#10B981] bg-black text-[#10B981]"
                          : "border-[#152326] bg-black text-slate-400 hover:text-white hover:border-[#1e3439]"
                      }`}
                    >
                      -{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                  Bedtime Controlled-Release (CR) Formulation
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[50, 100, 150].map((mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => setNocturnalMg(mg)}
                      className={`rounded-xl py-2.5 border font-mono text-xs font-semibold transition-all ${
                        nocturnalMg === mg
                          ? "border-[#10B981] bg-black text-[#10B981]"
                          : "border-[#152326] bg-black text-slate-400 hover:text-white hover:border-[#1e3439]"
                      }`}
                    >
                      {mg} mg
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#152326] bg-[#080d0e] p-3 text-[11px] text-slate-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Calculated Daily Load:</span>
                  <span className="text-white font-bold">{300 + nocturnalMg} mg / day</span>
                </div>
                <div className="flex justify-between">
                  <span>Wear-off Buffer:</span>
                  <span className="text-[#10B981] font-bold">+{shiftMinutes} min protection</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="w-full rounded-xl bg-[#10B981] py-2.5 text-xs font-bold text-black hover:brightness-110 transition-all shadow-sm"
                >
                  Apply Adjusted Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onSignOut={onSignOut}
      />

      {/* Persistent Left Vertical Dock */}
      <aside className="w-16 md:w-18 shrink-0 flex flex-col items-center justify-between border-r border-[#152326] bg-[#000000] py-5 select-none z-20">
        {/* Top: T+ Emblem */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => handleTabClick("log-medicine")}
            title="TremorAI Emblem"
            className="h-9 w-9 rounded-xl bg-black border border-[#10B981] flex items-center justify-center text-[#10B981] font-bold text-xs tracking-tight hover:brightness-125 transition-colors"
          >
            <span>T<sup className="text-[9px] font-bold">+</sup></span>
          </button>
        </div>

        {/* Center: Navigation Action Stack */}
        <nav className="flex flex-col items-center gap-5 my-auto">
          {/* Pulse / Kinematics Icon */}
          <button
            type="button"
            onClick={() => handleTabClick("kinematics")}
            title="Live Kinematics"
            className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-[#080d0e] transition-colors"
          >
            <Activity className="h-5 w-5 stroke-[2]" />
          </button>

          {/* Active Pill Icon for Suggested Regimen */}
          <button
            type="button"
            title="Suggested Regimen (Titration)"
            className="h-10 w-10 rounded-xl bg-[#10B981] text-black flex items-center justify-center shadow-sm cursor-default"
          >
            <Pill className="h-5 w-5 stroke-[2.2]" />
          </button>
        </nav>

        {/* Bottom: Circular Power Button */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out / Power"
            className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-[#080d0e] transition-colors"
          >
            <Power className="h-4 w-4 stroke-[2]" />
          </button>
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#000000]">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-[#152326] bg-[#000000]">
          {/* Left: Tab Navigation Pills */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-full bg-black border border-[#152326]">
            <button
              type="button"
              onClick={() => handleTabClick("log-medicine")}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Log Medicine &amp; History
            </button>
            <button
              type="button"
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-black border border-[#10B981] shadow-sm cursor-default"
            >
              Suggested Regimen
            </button>
          </div>

          {/* Center: Global Search Bar */}
          <div className="relative w-80 md:w-96 max-w-full hidden sm:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, biomarker, or dose history..."
              className="w-full bg-[#080d0e] border border-[#152326] rounded-full py-1.5 pl-4 pr-9 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#10B981]/60 font-sans"
            />
            <Search className="h-3.5 w-3.5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Right: Notifications & User Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowNotificationsModal(true)}
              title="Notifications"
              className="h-8 w-8 rounded-full bg-black border border-[#152326] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              title="User Profile (RS)"
              className="h-8 w-8 rounded-full bg-black border border-[#10B981] text-[#10B981] font-mono text-xs font-bold flex items-center justify-center hover:border-[#10B981] transition-colors cursor-pointer"
            >
              {initials || "RS"}
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="max-w-[1240px] mx-auto space-y-6">
            {/* Confirmation Banner if confirmed */}
            {confirmed && (
              <div className="rounded-xl border border-[#10B981] bg-black px-4 py-3 flex items-center justify-between text-xs text-[#10B981]">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 stroke-[2.5]" />
                  <span className="font-semibold">
                    Regimen confirmed: Changes written to clinical titration log &amp; transmitted to wearable ring node.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmed(false)}
                  className="text-slate-400 hover:text-white text-[11px]"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 1. Hero Header Card */}
            <section className="border border-[#152326] bg-[#0b1112] rounded-2xl p-6">
              {/* Top Sub-row: Tag Pill + Metadata */}
              <div className="flex items-center gap-2.5">
                <span className="bg-black text-[#10B981] border border-[#10B981] font-mono text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider">
                  AI TITRATION ENGINE
                </span>
                <span className="font-mono text-xs text-slate-400">
                  Case TR-90241-B • <strong className="text-white font-semibold">George Peter</strong> (Stage 2 PD)
                </span>
              </div>

              {/* Primary Content Row */}
              <div className="mt-3 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Suggested Regimen Adjustment: Levodopa / Carbidopa
                  </h1>
                  <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                    Telemetry detects midday wearing-off at 3.5h. Shift midday dose {shiftMinutes} min earlier and introduce
                    bedtime controlled-release (CR) {nocturnalMg}/25 mg formulation to prevent nocturnal rigidity.
                  </p>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(true)}
                    className="border border-slate-700 bg-[#0d1517] hover:bg-[#152326] text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                    <span>Adjust Parameters</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="bg-[#10B981] hover:brightness-110 text-black font-bold px-5 py-2 rounded-xl text-sm flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <span>{confirmed ? "Regimen Confirmed" : "Confirm Regimen"}</span>
                    {confirmed ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : (
                      <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* 2. Section 1: Circadian Regimen Schedule */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-white tracking-tight">Circadian Regimen Schedule</h2>
                <span className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">
                  4 DAILY DOSES
                </span>
              </div>

              <div className="border border-[#152326] bg-[#080d0e] rounded-2xl p-4 space-y-3">
                {/* 4 Dose Row Cards */}

                {/* Dose 01 */}
                <div
                  onClick={() => setActiveDoseIdx(0)}
                  className={`border rounded-xl p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeDoseIdx === 0
                      ? "border-[#10B981] bg-[#0b1112]"
                      : "border-[#152326] bg-[#0b1112] hover:border-[#1e3439]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-lg bg-[#0e1719] border border-[#1c2e32] flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                      01
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          08:00 AM • Morning Dose
                        </span>
                        <span className="bg-black border border-[#1c2e32] text-slate-400 text-[9px] font-mono px-2.5 py-0.5 rounded-full uppercase font-medium">
                          UNCHANGED
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">
                        Levodopa / Carbidopa 100/25 mg IR
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-white block">96.2% Response</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Optimal On-State</span>
                  </div>
                </div>

                {/* Dose 02 */}
                <div
                  onClick={() => setActiveDoseIdx(1)}
                  className={`border rounded-xl p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeDoseIdx === 1
                      ? "border-[#10B981] bg-[#0b1112]"
                      : "border-[#152326] bg-[#0b1112] hover:border-[#1e3439]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-lg bg-[#0e1719] border border-[#1c2e32] flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                      02
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          12:30 PM • Midday Dose
                        </span>
                        <span className="bg-black text-[#10B981] border border-[#10B981] text-[9px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold">
                          SHIFT -{shiftMinutes} MIN
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">
                        Shifted from 13:00 to 12:30 • 100/25 mg IR
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-white block">Preempts Fluctuation</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Prevents 3.5h Wear-Off</span>
                  </div>
                </div>

                {/* Dose 03 */}
                <div
                  onClick={() => setActiveDoseIdx(2)}
                  className={`border rounded-xl p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeDoseIdx === 2
                      ? "border-[#10B981] bg-[#0b1112]"
                      : "border-[#152326] bg-[#0b1112] hover:border-[#1e3439]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-lg bg-[#0e1719] border border-[#1c2e32] flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                      03
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          18:30 PM • Evening Dose
                        </span>
                        <span className="bg-black border border-[#1c2e32] text-slate-400 text-[9px] font-mono px-2.5 py-0.5 rounded-full uppercase font-medium">
                          UNCHANGED
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">
                        Levodopa / Carbidopa 100/25 mg IR
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-white block">89.4% Stability</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Sustained Tremor Control</span>
                  </div>
                </div>

                {/* Dose 04 */}
                <div
                  onClick={() => setActiveDoseIdx(3)}
                  className={`border rounded-xl p-3.5 flex items-center justify-between transition-colors cursor-pointer ${
                    activeDoseIdx === 3
                      ? "border-[#10B981] bg-[#0b1112]"
                      : "border-[#152326] bg-[#0b1112] hover:border-[#1e3439]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-lg bg-[#0e1719] border border-[#1c2e32] flex items-center justify-center font-mono text-xs font-bold text-slate-400">
                      04
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-white">
                          22:00 PM • Nocturnal Dose
                        </span>
                        <span className="bg-black text-[#10B981] border border-[#10B981] text-[9px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold">
                          NEW ADDITION
                        </span>
                      </div>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">
                        Levodopa / Carbidopa {nocturnalMg}/25 mg CR (Controlled Release)
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-white block">Nighttime Coverage</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">Eliminates Morning Rigidity</span>
                  </div>
                </div>

                {/* Footer Row */}
                <div className="pt-2 px-1 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>
                    Total Daily Levodopa:{" "}
                    <strong className="text-white font-bold">{300 + nocturnalMg} mg</strong> (was 300 mg)
                  </span>
                  <span>
                    Therapeutic Ratio:{" "}
                    <strong className="text-white font-bold">4:1 IR/CR</strong>
                  </span>
                </div>
              </div>
            </section>

            {/* 3. Section 2: Pharmacokinetics & Clinical Impact */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold text-white tracking-tight">Pharmacokinetics &amp; Clinical Impact</h2>
                <span className="font-mono text-[10px] uppercase text-slate-500 tracking-wider">
                  SIMULATION MODEL
                </span>
              </div>

              <div className="border border-[#152326] bg-[#080d0e] rounded-2xl p-4 space-y-4">
                {/* 2x2 Metric Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Metric 1 */}
                  <div className="border border-[#152326] bg-[#0b1112] rounded-xl p-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                      BASELINE UPDRS
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono font-bold text-white">
                      <span className="text-2xl">38</span>
                      <span className="text-xs text-slate-500">/ 100</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Current Assessment</p>
                  </div>

                  {/* Metric 2 */}
                  <div className="border border-[#152326] bg-[#0b1112] rounded-xl p-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                      PROJECTED UPDRS
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5 font-mono font-bold text-white">
                      <span className="text-2xl">26</span>
                      <span className="text-xs font-mono text-[#10B981] font-semibold">(-31.5%)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Target Window</p>
                  </div>

                  {/* Metric 3 */}
                  <div className="border border-[#152326] bg-[#0b1112] rounded-xl p-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                      TARGET TREMOR BAND
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono font-bold text-white">
                      <span className="text-2xl">4.0 - 6.0</span>
                      <span className="text-xs font-mono text-slate-500 font-normal">Hz</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Optimal Suppression</p>
                  </div>

                  {/* Metric 4 */}
                  <div className="border border-[#152326] bg-[#0b1112] rounded-xl p-4">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                      DYSKINESIA RISK
                    </span>
                    <div className="mt-1 flex items-baseline gap-1 font-mono font-bold text-white">
                      <span className="text-2xl">3.8%</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Minimal Probability</p>
                  </div>
                </div>

                {/* Dual Progress Bars */}
                <div className="space-y-4 pt-1">
                  {/* Progress Bar 1 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">Risk Threshold Safety Index</span>
                      <span className="font-mono font-bold text-white">Safe (&lt; 5.0%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#152326] rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full w-[24%]" />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                      <span>Postural Hypotension: Normal</span>
                      <span>Tolerance: High</span>
                    </div>
                  </div>

                  {/* Progress Bar 2 */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-white">Risk Threshold Safety Index</span>
                      <span className="font-mono font-bold text-white">Safe (&lt; 5.0%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#152326] rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full w-[19%]" />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                      <span>Postural Hypotension: Normal</span>
                      <span>Tolerance: High</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Section 3: Kinematic Sensor Telemetry Supporting Titration */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Kinematic Sensor Telemetry Supporting Titration
                </h3>
                <span className="font-mono text-[10px] text-slate-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Syncing continuously • 3 data nodes active
                </span>
              </div>

              {/* 3 Column Metric Footers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Card A: Diurnal Curve & Hourly Variance */}
                <div className="border border-[#152326] bg-[#080d0e] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#0e1719] border border-[#1c2e32] flex items-center justify-center text-[#10B981]">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                        DIURNAL CURVE
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5">Hourly Variance</h4>
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                        08:00 - 20:00 (12h)
                      </span>
                    </div>
                  </div>

                  {/* Waveform sparkline SVG */}
                  <svg className="w-20 h-6 text-slate-300" viewBox="0 0 80 24" fill="none">
                    <path
                      d="M0 12 C 16 3, 28 21, 44 12 C 60 3, 68 20, 80 12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                {/* Card B: Hardware Sync */}
                <div className="border border-[#152326] bg-[#080d0e] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#0e1719] border border-[#1c2e32] flex items-center justify-center text-[#10B981]">
                      <Radio className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                        MPU6050 100 HZ
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5">Hardware Sync</h4>
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                        Zero Drift Calibrated
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[10px] font-bold text-[#10B981] tracking-wider uppercase block">
                      ACTIVE
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 block mt-0.5">0.02ms lag</span>
                  </div>
                </div>

                {/* Card C: Frequency Tracking */}
                <div className="border border-[#152326] bg-[#080d0e] rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#0e1719] border border-[#1c2e32] flex items-center justify-center text-[#10B981]">
                      <BarChart2 className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                        FFT SPECTRUM
                      </span>
                      <h4 className="text-xs font-bold text-white mt-0.5">Frequency Tracking</h4>
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                        Peak: 4.88 Hz (Suppressed)
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 block">
                      SPECTRAL Q
                    </span>
                    <span className="font-mono text-xs font-bold text-white block mt-0.5">0.82 ratio</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
