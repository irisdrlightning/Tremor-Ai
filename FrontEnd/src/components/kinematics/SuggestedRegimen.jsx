import {
  ArrowRight,
  BarChart2,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Phone,
  Radio,
  Search,
  SlidersHorizontal,
  TrendingDown,
  X,
} from "lucide-react";
import { useState } from "react";

export default function SuggestedRegimen({
  activeTab = "suggested-regimen",
  setActiveTab = () => {},
  initials = "RS",
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [shiftMinutes, setShiftMinutes] = useState(30);
  const [nocturnalMg, setNocturnalMg] = useState(100);
  const [activeDoseIdx, setActiveDoseIdx] = useState(null);
  const [timeIndex, setTimeIndex] = useState(0);

  const handleSaveParameters = () => {
    setShowAdjustModal(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1440px]">
      {/* Parameter Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h4 className="text-sm font-bold text-[#ededed]">Adjust Titration Parameters</h4>
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="text-[#8a9992] hover:text-[#ededed]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[#8a9992] font-mono uppercase text-[10px]">
                  Midday Dose Shift (Minutes)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setShiftMinutes(mins)}
                      className={`flex-1 rounded-lg py-2 border font-mono text-xs transition-colors ${
                        shiftMinutes === mins
                          ? "border-[#00e599] bg-[#141a17] text-[#00e599]"
                          : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992]"
                      }`}
                    >
                      -{mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[#8a9992] font-mono uppercase text-[10px]">
                  Nocturnal CR Dosage (mg)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  {[50, 100, 150].map((mg) => (
                    <button
                      key={mg}
                      type="button"
                      onClick={() => setNocturnalMg(mg)}
                      className={`flex-1 rounded-lg py-2 border font-mono text-xs transition-colors ${
                        nocturnalMg === mg
                          ? "border-[#00e599] bg-[#141a17] text-[#00e599]"
                          : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992]"
                      }`}
                    >
                      {mg} mg
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveParameters}
                  className="w-full rounded-xl bg-[#00e599] py-2.5 text-xs font-bold text-[#021a11]"
                >
                  Apply Adjusted Plan
                </button>
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
            placeholder="Search patient, biomarker, or dose history..."
            className="w-full min-w-0 bg-transparent text-sm text-[#ededed] placeholder:text-[#8a9992] focus:outline-none"
          />
          <Search className="h-4 w-4 shrink-0 text-[#8a9992]" />
        </div>

        {/* Action Buttons & Profile */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            aria-label="Call clinic"
            title="Call Clinic"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#00e599] text-[#021a11] transition-transform hover:scale-105 active:scale-95 shadow-sm"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
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

      {/* Hero Header Card: AI Titration Engine Suggestion */}
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2.5">
              <span className="rounded border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-2 py-0.5 font-mono text-[9px] font-bold text-[#00e599] tracking-wider">
                AI TITRATION ENGINE
              </span>
              <span className="font-mono text-xs text-[#8a9992]">
                Case TR-90241-B •{" "}
                <strong className="text-[#ededed] font-semibold">George Peter</strong> (Stage 2 PD)
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-[#ededed]">
              Suggested Regimen Adjustment: Levodopa / Carbidopa
            </h1>

            <p className="mt-2 text-xs leading-relaxed text-[#8a9992]">
              Telemetry detects midday wearing-off at 3.5h. Shift midday dose {shiftMinutes} min
              earlier and introduce bedtime controlled-release (CR) {nocturnalMg}/25 mg formulation
              to prevent nocturnal rigidity.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <button
              type="button"
              onClick={() => setShowAdjustModal(true)}
              className="flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] px-4 py-2.5 text-xs font-semibold text-[#ededed] transition-colors hover:bg-[#141a17] hover:border-[rgba(255,255,255,0.18)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-[#8a9992]" />
              <span>Adjust Parameters</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmed(true)}
              className="flex items-center gap-2 rounded-xl bg-[#00e599] px-4 py-2.5 text-xs font-bold text-[#021a11] transition-transform active:scale-95"
            >
              <span>{confirmed ? "Regimen Confirmed" : "Confirm Regimen"}</span>
              {confirmed ? (
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 1: Circadian Regimen Schedule */}
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(255,255,255,0.08)]">
          <h2 className="text-sm font-bold tracking-tight text-[#ededed]">
            Circadian Regimen Schedule
          </h2>
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#8a9992]">
            4 DAILY DOSES
          </span>
        </div>

        {/* 4 Doses Timeline List */}
        <div className="mt-4 space-y-3">
          {/* Dose 01 */}
          <div
            onClick={() => setActiveDoseIdx(0)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
              activeDoseIdx === 0
                ? "border-[#00e599] bg-[#141a17]"
                : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] hover:border-[rgba(255,255,255,0.18)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#141a17] font-mono text-xs font-bold text-[#8a9992]">
                01
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs font-bold text-[#ededed]">
                    08:00 AM • Morning Dose
                  </p>
                  <span className="rounded border border-[rgba(255,255,255,0.08)] bg-[#0c100e] px-1.5 py-0.2 font-mono text-[8px] uppercase tracking-wider text-[#8a9992]">
                    UNCHANGED
                  </span>
                </div>
                <p className="font-mono text-[11px] text-[#8a9992] mt-0.5">
                  Levodopa / Carbidopa 100/25 mg IR
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#00e599] block">
                96.2% Response
              </span>
              <span className="font-mono text-[10px] text-[#8a9992]">Optimal On-State</span>
            </div>
          </div>

          {/* Dose 02 */}
          <div
            onClick={() => setActiveDoseIdx(1)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
              activeDoseIdx === 1
                ? "border-[#00e599] bg-[#141a17]"
                : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] hover:border-[rgba(255,255,255,0.18)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#141a17] font-mono text-xs font-bold text-[#8a9992]">
                02
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs font-bold text-[#ededed]">
                    {shiftMinutes === 30 ? "12:30 PM" : `13:00 - ${shiftMinutes}m`} • Midday Dose
                  </p>
                  <span className="rounded border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-1.5 py-0.2 font-mono text-[8px] uppercase tracking-wider text-[#00e599]">
                    SHIFT -{shiftMinutes} MIN
                  </span>
                </div>
                <p className="font-mono text-[11px] text-[#8a9992] mt-0.5">
                  Shifted from 13:00 to 12:30 • 100/25 mg IR
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#00e599] block">
                Preempts Fluctuation
              </span>
              <span className="font-mono text-[10px] text-[#8a9992]">Prevents 3.5h Wear-Off</span>
            </div>
          </div>

          {/* Dose 03 */}
          <div
            onClick={() => setActiveDoseIdx(2)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
              activeDoseIdx === 2
                ? "border-[#00e599] bg-[#141a17]"
                : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] hover:border-[rgba(255,255,255,0.18)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#141a17] font-mono text-xs font-bold text-[#8a9992]">
                03
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs font-bold text-[#ededed]">
                    18:30 PM • Evening Dose
                  </p>
                  <span className="rounded border border-[rgba(255,255,255,0.08)] bg-[#0c100e] px-1.5 py-0.2 font-mono text-[8px] uppercase tracking-wider text-[#8a9992]">
                    UNCHANGED
                  </span>
                </div>
                <p className="font-mono text-[11px] text-[#8a9992] mt-0.5">
                  Levodopa / Carbidopa 100/25 mg IR
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#00e599] block">
                89.4% Stability
              </span>
              <span className="font-mono text-[10px] text-[#8a9992]">Sustained Tremor Control</span>
            </div>
          </div>

          {/* Dose 04 */}
          <div
            onClick={() => setActiveDoseIdx(3)}
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
              activeDoseIdx === 3
                ? "border-[#00e599] bg-[#141a17]"
                : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] hover:border-[rgba(255,255,255,0.18)]"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#141a17] font-mono text-xs font-bold text-[#8a9992]">
                04
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs font-bold text-[#ededed]">
                    22:00 PM • Nocturnal Dose
                  </p>
                  <span className="rounded border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-1.5 py-0.2 font-mono text-[8px] uppercase tracking-wider text-[#00e599]">
                    NEW ADDITION
                  </span>
                </div>
                <p className="font-mono text-[11px] text-[#8a9992] mt-0.5">
                  Levodopa / Carbidopa {nocturnalMg}/25 mg CR (Controlled Release)
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-[#00e599] block">
                Nighttime Coverage
              </span>
              <span className="font-mono text-[10px] text-[#8a9992]">
                Eliminates Morning Rigidity
              </span>
            </div>
          </div>
        </div>

        {/* Subfooter */}
        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between font-mono text-[10px] text-[#8a9992]">
          <span>
            Total Daily Levodopa: <strong className="text-[#ededed]">{300 + nocturnalMg} mg</strong>{" "}
            (was 300 mg)
          </span>
          <span>
            Therapeutic Ratio: <strong className="text-[#ededed]">4:1 IR/CR</strong>
          </span>
        </div>
      </section>

      {/* SECTION 2: Pharmacokinetics & Clinical Impact */}
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[rgba(255,255,255,0.08)]">
          <h2 className="text-sm font-bold tracking-tight text-[#ededed]">
            Pharmacokinetics &amp; Clinical Impact
          </h2>
          <span className="font-mono text-[10px] tracking-wider uppercase text-[#8a9992]">
            SIMULATION MODEL
          </span>
        </div>

        {/* 2x2 Grid of Simulation Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e]">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992] block">
              BASELINE UPDRS
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono font-bold text-[#ededed]">
              <span className="text-2xl">38</span>
              <span className="text-xs text-[#8a9992]">/ 100</span>
            </div>
            <p className="font-mono text-[10px] text-[#8a9992] mt-0.5">Current Assessment</p>
          </div>

          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e]">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992] block">
              PROJECTED UPDRS
            </span>
            <div className="mt-1 flex items-baseline gap-1.5 font-mono font-bold text-[#00e599]">
              <span className="text-2xl">26</span>
              <span className="text-xs">(-31.5%)</span>
            </div>
            <p className="font-mono text-[10px] text-[#8a9992] mt-0.5">Target Window</p>
          </div>

          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e]">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992] block">
              TARGET TREMOR BAND
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono font-bold text-[#ededed]">
              <span className="text-2xl">4.0 - 6.0</span>
              <span className="text-xs text-[#8a9992]">Hz</span>
            </div>
            <p className="font-mono text-[10px] text-[#8a9992] mt-0.5">Optimal Suppression</p>
          </div>

          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e]">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#8a9992] block">
              DYSKINESIA RISK
            </span>
            <div className="mt-1 flex items-baseline gap-1 font-mono font-bold text-[#00e599]">
              <span className="text-2xl">3.8%</span>
            </div>
            <p className="font-mono text-[10px] text-[#8a9992] mt-0.5">Minimal Probability</p>
          </div>
        </div>

        {/* Risk Threshold Safety Index */}
        <div className="space-y-2 pt-2 border-t border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-[#8a9992]">Risk Threshold Safety Index</span>
            <span className="font-bold text-[#00e599]">Safe (&lt; 5.0%)</span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-[#141a17] overflow-hidden">
            <div className="h-full w-[28%] rounded-full bg-[#00e599]" />
          </div>

          <div className="flex items-center justify-between font-mono text-[9px] text-[#8a9992]">
            <span>Postural Hypotension: Normal</span>
            <span>Tolerance: High</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: Bottom Kinematic Sensor Telemetry Supporting Titration */}
      <section className="space-y-3 border-t border-[rgba(255,255,255,0.08)] pt-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-[#ededed]">
            Kinematic Sensor Telemetry Supporting Titration
          </h3>
          <span className="font-mono text-[10px] text-[#8a9992]">
            Syncing continuously • 3 data nodes active
          </span>
        </div>

        {/* 3 Telemetry Cards */}
        <div className="grid gap-4 md:grid-cols-3">
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
                <p className="font-mono text-[10px] text-[#8a9992]">Zero Drift Calibrated</p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-[9px] font-bold text-[#00e599] tracking-wider block">
                ACTIVE
              </span>
              <span className="font-mono text-[10px] text-[#8a9992]">0.02ms lag</span>
            </div>
          </article>

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
