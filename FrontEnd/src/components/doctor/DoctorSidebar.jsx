import React from "react";
import { BarChart2, Bluetooth, FileDown, Pill, Power } from "lucide-react";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import tremorIcon from "@/assets/tremor-icon.png";

/**
 * DoctorSidebar
 * Enforces 1:1 parity with the Patient Module capsule sidebar:
 * - Vertical capsule pill: border border-[#152326] bg-[#000000] rounded-[2.5rem] py-6 px-3 flex flex-col items-center justify-between w-20 min-h-[96vh] my-3 ml-3
 * - Top Logo: Inset solid black squircle w-12 h-12 rounded-2xl bg-black border border-[#152326] with solid emerald T mark
 * - Center Navigation: 20px (strokeWidth=1.8) icons for Trends, Sync, Reports, and Suggested Regimen
 * - Bottom: Minimal line-art power icon (no circular border ring)
 */
export default function DoctorSidebar({
  activeTab = "analyser",
  onSelectTab = () => {},
  onSignOut = () => {},
  className = "",
}) {
  const iconSrc = tremorIconBase64 || tremorIcon || "/tremor-icon.png";

  const navItems = [
    {
      id: "analyser",
      label: "Trend Analyser & Summary",
      icon: BarChart2,
    },
    {
      id: "sync",
      label: "Device Sync & Ingestion",
      icon: Bluetooth,
    },
    {
      id: "reports",
      label: "Period Reports & Export",
      icon: FileDown,
    },
    {
      id: "suggested-regimen",
      label: "Suggested Regimen (Titration)",
      icon: Pill,
    },
  ];

  return (
    <aside
      className={`border border-[#152326] bg-[#000000] rounded-[2.5rem] py-6 px-3 flex flex-col items-center justify-between w-20 min-h-[96vh] my-3 ml-3 shrink-0 select-none shadow-2xl z-20 ${className}`}
    >
      {/* Top Logo Block: Inset solid black squircle with solid emerald T mark */}
      <div className="flex flex-col items-center pt-1">
        <button
          type="button"
          onClick={() => onSelectTab("analyser")}
          title="Tremor AI Clinical Dashboard"
          aria-label="Tremor AI Clinical Dashboard"
          className="w-12 h-12 rounded-2xl bg-black border border-[#152326] flex items-center justify-center p-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <img
            src={iconSrc}
            alt="Tremor AI"
            className="h-full w-full object-contain"
          />
        </button>
      </div>

      {/* Centered Navigation Icon Group */}
      <nav className="flex flex-col items-center gap-4 my-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative group">
              <button
                type="button"
                onClick={() => onSelectTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#10B981] text-black shadow-md p-3.5"
                    : "text-slate-400 hover:text-white p-3.5 hover:bg-black/60"
                }`}
              >
                <Icon size={20} strokeWidth={1.8} />
              </button>

              {/* Tooltip HUD */}
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:block rounded-lg bg-black border border-[#152326] px-2.5 py-1 text-xs font-semibold text-[#10B981] whitespace-nowrap shadow-xl z-50">
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Bottom Power / Exit Trigger: Single minimal line-art power icon */}
      <div className="flex flex-col items-center pb-1">
        <button
          type="button"
          onClick={onSignOut}
          title="Sign Out"
          aria-label="Sign Out"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-white mb-2 transition-colors cursor-pointer"
        >
          <Power size={20} strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}
