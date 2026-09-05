import { Bell, Check, CheckCircle2, Info, Phone, Search, User, X } from "lucide-react";
import { useState } from "react";
import api from "@/services/api";

export default function LogMedicationDose({
  activeTab = "log-medicine",
  setActiveTab = () => {},
  initials = "RS",
}) {

  const [quickTime, setQuickTime] = useState("just-now");
  const [motorState, setMotorState] = useState("on-state");
  const [doseLogged, setDoseLogged] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetDose, setTargetDose] = useState({ levodopa: 100, carbidopa: 25 });
  const [dosesTaken, setDosesTaken] = useState(1);

  const handleLogDose = () => {
    setDoseLogged(true);
    setDosesTaken((prev) => Math.min(3, prev + 1));
    api.logDose({
      patientId: "TR-90241",
      levodopa: targetDose.levodopa,
      carbidopa: targetDose.carbidopa,
      timing: quickTime,
      motorState: motorState,
    }).catch((err) => console.warn("Failed to post dose log:", err));
    setTimeout(() => setDoseLogged(false), 3000);
  };


  return (
    <div className="flex flex-col gap-6 max-w-[1440px]">
      {/* Clinician Direct Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-3">
              <h4 className="text-sm font-bold text-[#ededed]">Connect to Attending Physician</h4>
              <button
                type="button"
                onClick={() => setShowCallModal(false)}
                className="text-[#8a9992] hover:text-[#ededed]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] p-3 text-xs">
                <p className="font-semibold text-[#ededed]">Dr. Emily Rochers</p>
                <p className="text-[#8a9992] mt-0.5">Movement Disorder Specialist • On Call</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  alert("Calling attending clinic at +1 (555) 019-2834...");
                  setShowCallModal(false);
                }}
                className="w-full rounded-xl bg-[#00e599] py-2.5 text-xs font-bold text-[#021a11]"
              >
                Initiate Tele-consult
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar Header */}
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
            onClick={() => setShowCallModal(true)}
            aria-label="Call Attending Physician"
            title="Call Clinician"
            className="grid h-10 w-10 place-items-center rounded-full bg-[#00e599] text-[#021a11] transition-transform hover:scale-105 active:scale-95 shadow-sm"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("suggested-regimen")}
            aria-label="Notifications"
            title="View Suggestions"
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

      {/* Page Title & Patient Metadata - Asymmetric Columns 2-8 sitting */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 border-b border-[rgba(255,255,255,0.08)] pb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#00e599]">
            PATIENT TR-90241 • GEORGE PETER
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#ededed] mt-1">
            Log Medication Dose
          </h1>
        </div>
        <p className="font-mono text-xs text-[#8a9992]">Schedule: LD-CD 100/25 mg • TID</p>
      </div>

      {/* Main Grid Content Layout: 12-Column Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Formulation & Quick Adjuster (Cols 1-6) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 1: Rx Formulation */}
          <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="uppercase text-[#8a9992]">Rx Formulation</span>
              <span className="text-[#00e599] font-medium">Prescribed 3x/Day</span>
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#ededed]">Levodopa / Carbidopa</h3>
                <p className="mt-1 text-xs text-[#8a9992]">Oral Absorption • Fast-Release</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-black text-[#ededed]">
                  {targetDose.levodopa} <span className="text-base text-[#8a9992]">/</span>{" "}
                  {targetDose.carbidopa}{" "}
                  <span className="text-xs font-normal text-[#8a9992]">mg</span>
                </p>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#00e599] block mt-0.5">
                  Target Dose
                </span>
              </div>
            </div>
          </article>

          {/* Card 2: Quick Time Adjuster & Action */}
          <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#ededed]">Quick Time Adjuster</span>
              <span className="font-mono text-[10px] text-[#8a9992]">Next scheduled 13:00</span>
            </div>

            {/* Time Pills */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setQuickTime("just-now")}
                className={`rounded-xl py-3 text-xs font-semibold transition-colors border ${
                  quickTime === "just-now"
                    ? "border-[#00e599] bg-[#141a17] text-[#00e599]"
                    : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992] hover:text-[#ededed]"
                }`}
              >
                Just Now
              </button>
              <button
                type="button"
                onClick={() => setQuickTime("15m")}
                className={`rounded-xl py-3 text-xs font-semibold transition-colors border ${
                  quickTime === "15m"
                    ? "border-[#00e599] bg-[#141a17] text-[#00e599]"
                    : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992] hover:text-[#ededed]"
                }`}
              >
                15m ago
              </button>
              <button
                type="button"
                onClick={() => setQuickTime("30m")}
                className={`rounded-xl py-3 text-xs font-semibold transition-colors border ${
                  quickTime === "30m"
                    ? "border-[#00e599] bg-[#141a17] text-[#00e599]"
                    : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992] hover:text-[#ededed]"
                }`}
              >
                30m ago
              </button>
            </div>

            {/* Log Dose Button */}
            <button
              type="button"
              onClick={handleLogDose}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00e599] py-3.5 text-sm font-bold text-[#021a11] transition-transform active:scale-[0.99]"
            >
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>
                {doseLogged
                  ? "Dose Recorded Successfully!"
                  : `Log Dose (${targetDose.levodopa} / ${targetDose.carbidopa} mg)`}
              </span>
            </button>
          </article>
        </div>

        {/* RIGHT COLUMN: Today's Regimen & Motor State (Cols 7-12) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 3: Today's Regimen */}
          <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="uppercase tracking-wider font-bold text-[#ededed]">
                TODAY'S REGIMEN
              </span>
              <span className="text-[#8a9992]">{dosesTaken} of 3 Taken</span>
            </div>

            <div className="mt-5 flex items-baseline justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#ededed]">Levodopa / Carbidopa</h3>
                <p className="mt-1 text-xs text-[#8a9992]">Oral Absorption • Fast-Release</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-black text-[#ededed]">
                  {targetDose.levodopa} <span className="text-base text-[#8a9992]">/</span>{" "}
                  {targetDose.carbidopa}{" "}
                  <span className="text-xs font-normal text-[#8a9992]">mg</span>
                </p>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#00e599] block mt-0.5">
                  Target Dose
                </span>
              </div>
            </div>
          </article>

          {/* Card 4: Current Motor State */}
          <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#ededed]">
                CURRENT MOTOR STATE
              </span>
              <span className="text-[11px] text-[#8a9992]">Tap to update</span>
            </div>

            {/* 3 Motor State Selection Cards */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {/* On-State */}
              <button
                type="button"
                onClick={() => setMotorState("on-state")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-colors ${
                  motorState === "on-state"
                    ? "border-[#00e599] bg-[#141a17]"
                    : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] hover:border-[rgba(255,255,255,0.18)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#00e599] mb-2.5" />
                <span className="text-xs font-bold text-[#ededed]">On-State</span>
                <span className="text-[10px] text-[#8a9992] mt-0.5">Minimal tremor</span>
              </button>

              {/* Wearing-Off */}
              <button
                type="button"
                onClick={() => setMotorState("wearing-off")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-colors ${
                  motorState === "wearing-off"
                    ? "border-[#f59e0b] bg-[#1a160c]"
                    : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] hover:border-[rgba(255,255,255,0.18)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#f59e0b] mb-2.5" />
                <span className="text-xs font-bold text-[#ededed]">Wearing-Off</span>
                <span className="text-[10px] text-[#8a9992] mt-0.5">Slight stiffness</span>
              </button>

              {/* Off-State */}
              <button
                type="button"
                onClick={() => setMotorState("off-state")}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-colors ${
                  motorState === "off-state"
                    ? "border-[#ef4444] bg-[#1f1010]"
                    : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] hover:border-[rgba(255,255,255,0.18)]"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-[#ef4444] mb-2.5" />
                <span className="text-xs font-bold text-[#ededed]">Off-State</span>
                <span className="text-[10px] text-[#8a9992] mt-0.5">Tremor active</span>
              </button>
            </div>
          </article>

          {/* Card 5: Safety Protocol Notice */}
          <article className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-[#00e599] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-[#8a9992]">
              <strong className="text-[#ededed]">Safety Protocol:</strong> Take with a full glass of
              water. If a dose is missed by over 2 hours, proceed directly with normal titration
              without doubling up. Kinematics stream syncs automatically at next calibration
              checkpoint.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
