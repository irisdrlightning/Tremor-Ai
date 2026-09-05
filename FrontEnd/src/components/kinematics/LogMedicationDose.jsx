import { Bell, Check, CheckCircle2, Clock, Info, Phone, Search, User, X } from "lucide-react";
import { useState } from "react";
import api from "@/services/api";
import TremorHeaderBrand from "@/components/common/TremorHeaderBrand";

export default function LogMedicationDose({
  activeTab = "log-medicine",
  setActiveTab = () => {},
  initials = "RS",
  liveData = null,
  bleData = null,
}) {

  const [quickTime, setQuickTime] = useState("just-now");
  const [motorState, setMotorState] = useState("on-state");
  const [doseLogged, setDoseLogged] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetDose, setTargetDose] = useState({ levodopa: 100, carbidopa: 25 });
  const [dosesTaken, setDosesTaken] = useState(1);
  const [doseLog, setDoseLog] = useState([]);

  // Free-form medication fields
  const [medicationName, setMedicationName] = useState("");
  const [dosageQty, setDosageQty] = useState("");
  const [dosageUnit, setDosageUnit] = useState("mg");

  const timingLabel = { "just-now": "Just Now", "15m": "15 min ago", "30m": "30 min ago" };
  const UNITS = ["mg", "mcg", "ml", "units"];

  const handleLogDose = () => {
    const now = new Date();
    const med = medicationName.trim() || "Levodopa / Carbidopa";
    const qty = dosageQty.trim() || `${targetDose.levodopa}/${targetDose.carbidopa}`;
    const record = {
      id: Date.now(),
      medicationName: med,
      dosageQty: qty,
      dosageUnit,
      levodopa: targetDose.levodopa,
      carbidopa: targetDose.carbidopa,
      timing: quickTime,
      timingLabel: timingLabel[quickTime] ?? quickTime,
      motorState,
      loggedAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      loggedDate: now.toLocaleDateString([], { month: "short", day: "numeric" }),
      tremorHz: bleData?.tremorRate ?? liveData?.tremorRate ?? null,
    };
    setDoseLog((prev) => [record, ...prev]);
    setDoseLogged(true);
    setDosesTaken((prev) => Math.min(3, prev + 1));
    api.logDose({
      patientId: "TR-90241",
      levodopa: targetDose.levodopa,
      carbidopa: targetDose.carbidopa,
      timing: quickTime,
      motorState,
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
      <header className="flex flex-wrap items-center justify-between gap-4">
        {/* Universal Tremor AI Brand Header */}
        <TremorHeaderBrand title="Log Medication Dose" subtitle="Clinical Rx" />

        {/* Action Buttons: Bluetooth, Notifications, and Profile avatar */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <button
            type="button"
            title="Bluetooth Status"
            className="grid h-10 w-10 place-items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.18)] transition-colors"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => alert("No critical medication alerts at this time. Telemetry within normal limits.")}
            aria-label="Notifications"
            title="Notifications & Alerts"
            className="relative grid h-10 w-10 place-items-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992] hover:text-[#ededed] transition-transform hover:scale-105 active:scale-95"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#00e599]" />
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
          {/* Card 1: Rx Formulation — interactive medication entry */}
          <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="uppercase text-[#8a9992]">Rx Formulation</span>
              <span className="text-[#00e599] font-medium">Prescribed 3x/Day</span>
            </div>

            {/* Medication Name Input with Suggestions */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="med-name-input"
                  className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]"
                >
                  MEDICATION NAME
                </label>
                <span className="font-mono text-[9px] text-[#00e599]">Type custom or pick suggestion</span>
              </div>
              
              <div className="relative">
                <input
                  id="med-name-input"
                  type="text"
                  list="medication-suggestions"
                  value={medicationName}
                  onChange={(e) => setMedicationName(e.target.value)}
                  placeholder="e.g. Ropinirole (Requip), Sinemet, or enter custom name"
                  className="w-full rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#141a17] px-4 py-3 text-sm font-semibold text-[#ededed] placeholder:text-[#8a9992]/60 focus:border-[#00e599] focus:outline-none transition-colors"
                />
                <datalist id="medication-suggestions">
                  <option value="Ropinirole (Requip)" />
                  <option value="Levodopa / Carbidopa (Sinemet)" />
                  <option value="Pramipexole (Mirapex)" />
                  <option value="Rasagiline (Azilect)" />
                  <option value="Entacapone (Comtan)" />
                  <option value="Amantadine" />
                  <option value="Rotigotine (Neupro patch)" />
                  <option value="Selegiline (Eldepryl)" />
                  <option value="Trihexyphenidyl (Artane)" />
                </datalist>
              </div>

              {/* Medication Suggestion Quick Pills */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[9px] text-[#8a9992] mr-1">Suggestions:</span>
                {[
                  "Ropinirole (Requip)",
                  "Levodopa / Carbidopa",
                  "Pramipexole",
                  "Rasagiline",
                  "Amantadine",
                ].map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setMedicationName(sugg)}
                    className={`rounded-md px-2 py-0.5 font-mono text-[9px] transition-colors border ${
                      medicationName === sugg
                        ? "border-[#00e599] bg-[#00e599]/15 text-[#00e599] font-bold"
                        : "border-[rgba(255,255,255,0.08)] bg-[#0c100e] text-[#8a9992] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.16)]"
                    }`}
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* Dose Quantity + Unit */}
            <div className="mt-4">
              <label
                htmlFor="med-qty-input"
                className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992] mb-2"
              >
                DOSE QUANTITY
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  id="med-qty-input"
                  type="number"
                  min="0"
                  step="any"
                  value={dosageQty}
                  onChange={(e) => setDosageQty(e.target.value)}
                  placeholder="e.g. 100"
                  className="flex-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-4 py-3 text-sm font-bold text-[#ededed] placeholder:text-[#8a9992] focus:border-[#00e599]/60 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                {/* Unit toggle pills */}
                <div className="flex items-center gap-1 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-2">
                  {UNITS.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setDosageUnit(u)}
                      className={`rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold transition-colors ${
                        dosageUnit === u
                          ? "bg-[#00e599] text-[#021a11]"
                          : "text-[#8a9992] hover:text-[#ededed]"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Will Log tag */}
            <div className="mt-4 flex items-center justify-between pt-2 border-t border-[rgba(255,255,255,0.06)] font-mono text-xs">
              <span className="text-[10px] uppercase tracking-wider text-[#8a9992]">WILL LOG</span>
              <span className="font-semibold text-[#00e599]">
                {medicationName || "Ropinirole (Requip)"}
                {dosageQty ? ` (${dosageQty} ${dosageUnit})` : ""}
              </span>
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

            {/* Log Dose Button matching Image 5 */}
            <button
              type="button"
              onClick={handleLogDose}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#00e599] py-3.5 text-sm font-bold text-[#021a11] transition-transform active:scale-[0.99] shadow-[0_4px_16px_rgba(0,229,153,0.25)]"
            >
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>
                {doseLogged
                  ? "Dose Recorded Successfully!"
                  : `Log Dose — ${medicationName || "Ropinirole (Requip)"}`}
              </span>
            </button>
          </article>
        </div>

        {/* RIGHT COLUMN: Today's Regimen, Safety Protocol & Side-Effect Watchlist (Cols 7-12) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Card 3: Today's Regimen */}
          <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <div className="flex items-center gap-2">
                <span className="uppercase tracking-wider font-bold text-[#ededed]">
                  TODAY'S REGIMEN
                </span>
                <span className="rounded-full bg-[#00e599]/15 border border-[#00e599]/30 px-2 py-0.5 text-[#00e599] font-bold">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#8a9992]">{dosesTaken} of 3 Taken</span>
                <div className="flex items-center gap-1 text-[#8a9992]">
                  <button
                    type="button"
                    onClick={() => setDosesTaken((p) => Math.max(0, p - 1))}
                    className="hover:text-white"
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    onClick={() => setDosesTaken((p) => Math.min(3, p + 1))}
                    className="hover:text-white"
                  >
                    &gt;
                  </button>
                </div>
              </div>
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
                  Target Dose (Active Regimen)
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2 text-xs text-[#00e599]">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Current baseline</span>
            </div>
          </article>

          {/* Card 4: Safety Protocol Notice */}
          <article className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-4 flex items-start gap-3">
            <Info className="h-4 w-4 text-[#00e599] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-[#8a9992]">
              <strong className="text-[#ededed]">Safety Protocol:</strong> Take with a full glass of water. If a dose is missed by over 2 hours, proceed directly with normal titration without doubling up. Kinematics stream syncs automatically at next calibration checkpoint.
            </p>
          </article>

          {/* Card 5: Clinical Side-Effect Watchlist (Matching Image 5) */}
          <article className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-[#ededed]">
                CLINICAL SIDE-EFFECT WATCHLIST
              </span>
              <span className="font-mono text-[9px] text-[#8a9992] bg-[#141a17] border border-[rgba(255,255,255,0.08)] px-2 py-0.5 rounded">
                Levodopa / Carbidopa (100/25 mg)
              </span>
            </div>

            {/* 4 Clinical Watchlist Cards in 2x2 Grid */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Peak Dyskinesia */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#070b09] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ededed]">Peak Dyskinesia</span>
                  <span className="text-[#f59e0b] font-mono text-sm">⚠</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#8a9992]">
                  Involuntary choreic writhing or swaying at maximum Levodopa saturation.
                </p>
              </div>

              {/* Postural Dizziness */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#070b09] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ededed]">Postural Dizziness</span>
                  <span className="text-[#38bdf8] font-mono text-sm">🌀</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#8a9992]">
                  Orthostatic drops in blood pressure when rising from sitting/lying positions.
                </p>
              </div>

              {/* Nausea / GI Upset */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#070b09] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ededed]">Nausea / GI Upset</span>
                  <span className="text-[#00e599] font-mono text-sm">〰</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#8a9992]">
                  Gastric sensitivity from peripheral dopamine receptor conversion.
                </p>
              </div>

              {/* Sudden Somnolence */}
              <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#070b09] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ededed]">Sudden Somnolence</span>
                  <span className="text-[#a855f7] font-mono text-sm">🌙</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-[#8a9992]">
                  Abrupt daytime sleep attacks during active peak drug concentration.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

      {/* Dose History Log */}
      {doseLog.length > 0 && (
        <section className="space-y-3 border-t border-[rgba(255,255,255,0.08)] pt-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e599]" />
              <h3 className="text-xs font-semibold text-[#ededed]">Dose History — This Session</h3>
            </div>
            <span className="font-mono text-[10px] text-[#8a9992]">{doseLog.length} logged</span>
          </div>

          <div className="space-y-2">
            {doseLog.map((entry) => {
              const motorColor =
                entry.motorState === "on-state"
                  ? "#00e599"
                  : entry.motorState === "wearing-off"
                  ? "#f59e0b"
                  : "#ef4444";
              return (
                <article
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#141a17]">
                      <Clock className="h-3.5 w-3.5 text-[#00e599]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#ededed]">
                        {entry.medicationName || `${entry.levodopa} / ${entry.carbidopa} mg`}
                        {entry.dosageQty ? (
                          <span className="ml-2 font-mono text-[10px] font-normal text-[#8a9992]">
                            {entry.dosageQty} {entry.dosageUnit}
                          </span>
                        ) : (
                          <span className="ml-2 font-mono text-[10px] font-normal text-[#8a9992]">
                            Levodopa / Carbidopa
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[10px] text-[#8a9992] mt-0.5">
                        {entry.timingLabel} &nbsp;•&nbsp; {entry.loggedDate} {entry.loggedAt}
                        {entry.tremorHz ? ` · ${entry.tremorHz} Hz at log` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="font-mono text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: motorColor }}
                    >
                      {entry.motorState.replace("-", " ")}
                    </span>
                    <div className="mt-0.5">
                      <Check className="h-3 w-3 text-[#00e599] ml-auto" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
