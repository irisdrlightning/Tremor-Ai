import React, { useState } from "react";
import {
  BarChart2,
  Bluetooth,
  Check,
  ChevronDown,
  FileDown,
  Pill,
  Search,
  Users,
} from "lucide-react";
import TopActionCluster from "@/components/common/TopActionCluster";

/**
 * DoctorTopBar
 * Enforces 1:1 parity with the Patient Module top navigation shell:
 * - Persistent Top Bar:
 *   * Left Meta: "Doctor Neurologist Portal" + [ CLINICAL ANALYTICS ] pill + "Supervising Clinician: Dr. Rita Sharma"
 *   * Right Action Cluster: Patient Selector Dropdown + Canonical 3-circle TopActionCluster (Bluetooth, Bell, User)
 * - Secondary Route Sub-Tab Bar:
 *   * Exact rounded-full pill styling:
 *     - Active: bg-[#10B981] text-black font-semibold rounded-full px-4 py-1.5 text-xs
 *     - Inactive: bg-black border border-slate-800 text-slate-300 hover:text-white rounded-full px-4 py-1.5 text-xs
 *     - 4 Sub-Tabs: Trend Analyser, Device Sync, Period Reports, Suggested Regimen
 *     - Right: Selected Patient tag
 */
export default function DoctorTopBar({
  activeTab = "analyser",
  onSelectTab = () => {},
  selectedPatient,
  patients = [],
  selectPatient = () => {},
  clinicianName = "Dr. Rita Sharma",
  onOpenBluetooth = () => {},
  onOpenNotifications = () => {},
  onOpenProfile = () => {},
}) {
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const subTabs = [
    { id: "analyser", label: "Trend Analyser & Summary", icon: BarChart2 },
    { id: "sync", label: "Device Sync & Ingestion", icon: Bluetooth },
    { id: "reports", label: "Period Reports & Export", icon: FileDown },
    { id: "suggested-regimen", label: "Suggested Regimen", icon: Pill },
  ];

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.stage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-[#152326] bg-[#000000]">
      {/* Primary Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-[#152326]">
        {/* Left Meta Information */}
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>Doctor Neurologist Portal</span>
            <span className="bg-black border border-[#10B981] text-[#10B981] text-xs font-semibold px-2.5 py-0.5 rounded-full">
              CLINICAL ANALYTICS
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Supervising Clinician:{" "}
            <span className="text-slate-200 font-semibold">{clinicianName}</span>
          </p>
        </div>

        {/* Right Action Controls: Patient Selector + Canonical 3-Circle Action Cluster */}
        <div className="flex items-center gap-3">
          {/* Patient Selector Dropdown */}
          <div className="relative">
            <button
              id="patient-selector-btn"
              type="button"
              onClick={() => setPatientDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl border border-[#152326] bg-black px-3.5 py-2 text-xs font-medium text-slate-200 transition-all hover:border-[#10B981] cursor-pointer"
            >
              <Users className="h-4 w-4 text-[#10B981]" />
              <span className="font-semibold text-white">
                {selectedPatient?.name || "Biromon Jr."}
              </span>
              <span className="text-slate-400 font-mono">
                ({selectedPatient?.id || "TR-90242"})
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
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
                    className="w-full rounded-xl border border-[#152326] bg-black py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-[#10B981] focus:outline-none"
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
                          <div className="font-semibold text-xs text-white flex items-center gap-1.5">
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

          {/* Canonical 3-Circle Header Action Cluster */}
          <TopActionCluster
            onOpenBluetooth={onOpenBluetooth}
            onOpenNotifications={onOpenNotifications}
            onOpenProfile={onOpenProfile}
          />
        </div>
      </div>

      {/* Secondary Route Sub-Tab Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 bg-black">
        {/* Rounded-full Sub-Tab Pills */}
        <nav className="flex flex-wrap items-center gap-2">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#10B981] text-black font-semibold shadow-sm"
                    : "bg-black border border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Patient Context Tag */}
        {selectedPatient && (
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span>Selected Patient:</span>
            <span className="font-bold text-white font-mono bg-black px-2.5 py-1 rounded-full border border-[#152326]">
              {selectedPatient.name} ({selectedPatient.id})
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
