import React, { useState } from "react";
import { Check, ChevronDown, Search, Users } from "lucide-react";
import TopActionCluster from "@/components/common/TopActionCluster";

/**
 * DoctorTopBar
 * Ultra-clean, single-tier horizontal top bar matching the Patient Dashboard pattern:
 * - Single-tier: h-16 flex items-center justify-between px-6 bg-transparent border-b border-[#152326]
 * - Left: Solid small emerald green dot (w-2 h-2 bg-[#10B981]) + Clean white title + Solid black category pill
 * - Right: Compact patient selector pill (rounded-full bg-black border border-zinc-800) + Canonical 3-action cluster
 * - Strictly strips out second-tier sub-tabs, clinician sub-labels, and redundant text.
 */
export default function DoctorTopBar({
  activeTab = "analyser",
  title = null,
  category = null,
  selectedPatient,
  patients = [],
  selectPatient = () => {},
  onOpenBluetooth = () => {},
  onOpenNotifications = () => {},
  onOpenProfile = () => {},
  className = "",
}) {
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const tabMeta = {
    analyser: {
      title: "Doctor Neurologist Portal",
      category: "CLINICAL ANALYTICS",
    },
    sync: {
      title: "Device Sync & Ingestion",
      category: "RING TELEMETRY",
    },
    reports: {
      title: "Period Reports & Export",
      category: "TELEMETRY REPORT",
    },
    "suggested-regimen": {
      title: "Suggested Regimen",
      category: "TITRATION ENGINE",
    },
  };

  const currentMeta = tabMeta[activeTab] || tabMeta.analyser;
  const displayTitle = title || currentMeta.title;
  const displayCategory = category || currentMeta.category;

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.stage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header
      className={`h-14 sm:h-16 shrink-0 flex items-center justify-between px-3 xs:px-4 sm:px-6 border-b border-[#152326] bg-transparent select-none z-30 ${className}`}
    >
      {/* Left Section: Status Dot + Title + Category Tag Pill (Matches Patient Dashboard Pattern in Image 2) */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="w-2 h-2 shrink-0 rounded-full bg-[#10B981]" />
        <h1 className="text-sm xs:text-base md:text-lg font-semibold text-white tracking-tight truncate">
          {displayTitle}
        </h1>
        <span className="hidden sm-compact:inline-block bg-black border border-[#152326] text-slate-400 text-[10px] sm:text-[11px] font-mono uppercase tracking-widest px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
          {displayCategory}
        </span>
      </div>

      {/* Right Section: Compact Patient Selector + Canonical 3-Circle Action Cluster */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Compact Patient Selector Pill */}
        {selectedPatient && (
          <div className="relative">
            <button
              id="patient-selector-btn"
              type="button"
              onClick={() => setPatientDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black border border-zinc-800 text-xs font-mono text-white hover:border-zinc-600 transition-colors cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-[#10B981]" />
              <span className="font-semibold text-white font-sans truncate max-w-[120px] md:max-w-[160px]">
                {selectedPatient.name}
              </span>
              <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                ({selectedPatient.id})
              </span>
              <ChevronDown
                className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${
                  patientDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {patientDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-[#152326] bg-black p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search patient or ID…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[#152326] bg-black py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none font-sans"
                  />
                </div>

                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredPatients.map((p) => {
                    const isSelected = p.id === selectedPatient?.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          selectPatient(p.id);
                          setPatientDropdownOpen(false);
                        }}
                        className={`w-full flex items-start justify-between rounded-xl p-2.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-black border border-[#10B981] text-white"
                            : "hover:bg-[#0b1112] text-slate-300"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-white flex items-center gap-1.5 font-sans">
                            {p.name}
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-[#10B981]" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {p.stage} • {p.id}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] font-mono text-[#10B981] font-bold">
                            {p.tremorRate} Hz
                          </span>
                          <div className="text-[10px] text-slate-400">
                            UPDRS: {p.updrs}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Canonical 3-Circle Header Action Cluster */}
        <TopActionCluster
          onOpenBluetooth={onOpenBluetooth}
          onOpenNotifications={onOpenNotifications}
          onOpenProfile={onOpenProfile}
        />
      </div>
    </header>
  );
}
