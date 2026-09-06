import React from "react";
import { Power } from "lucide-react";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import tremorIcon from "@/assets/tremor-icon.png";

/**
 * Custom Minimalist SVG Icons precisely matching the reference design:
 * 1. PulseWaveformIcon: Minimal Parkinson's kinematic tremor pulse wave
 * 2. BarChartIcon: 3 vertical discrete level bars
 * 3. PillMedicationIcon: Minimal Parkinson's medication capsule
 */
function PulseWaveformIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 12h3.5l2.2-4.5 3.6 9 2.5-6.5 1.7 3.5H20" />
    </svg>
  );
}

function BarChartIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <rect x="5" y="13" width="3" height="7" rx="1" />
      <rect x="10.5" y="9" width="3" height="11" rx="1" />
      <rect x="16" y="5" width="3" height="15" rx="1" />
    </svg>
  );
}

function PillMedicationIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

/**
 * Universal Tremor AI Navigation Sidebar Component
 * - Static Vertical Anchoring: Fixed height capsule sticky in viewport
 * - Standardized Button Box Models: Inactive and active states maintain identical 48x48px dimensions
 * - Prevents layout regressions across all routes (Kinematics, Analytics, Log Medication)
 */
export default function TremorSidebar({
  activeTab = "kinematics",
  setActiveTab = () => {},
  onSignOut = () => {},
  className = "",
}) {
  const iconSrc = tremorIconBase64 || tremorIcon || "/tremor-icon.png";

  const navItems = [
    {
      id: "kinematics",
      label: "Live Kinematics",
      icon: PulseWaveformIcon,
    },
    {
      id: "analytics",
      label: "Medication Analytics",
      icon: BarChartIcon,
    },
    {
      id: "log-medicine",
      label: "Log Medication Dose",
      icon: PillMedicationIcon,
    },
  ];

  return (
    <>
    <aside
      className={`hidden lg:flex w-16 md:w-20 h-[calc(100vh-2rem)] sticky top-4 self-start shrink-0 flex-col items-center justify-between rounded-full bg-[#000000] border border-[#152326] py-6 px-2 shadow-2xl z-20 select-none ${className}`}
    >
      {/* Top Zone: Fixed Container for Logo */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("kinematics")}
          title="Tremor AI Overview"
          aria-label="Tremor AI Overview"
          className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-black border border-[#10B981] p-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
        >
          <img
            src={iconSrc}
            alt="Tremor AI emblem"
            className="h-full w-full object-contain"
          />
        </button>
      </div>

      {/* Center Navigation Zone: Statically Centered with Strict Uniform Spacing */}
      <nav className="flex flex-col items-center gap-6 my-auto shrink-0">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <div key={item.id} className="relative group flex items-center justify-center">
              <button
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#10B981] text-black font-bold shadow-none"
                    : "bg-transparent text-slate-400 hover:text-white hover:bg-black/60"
                }`}
              >
                <Icon className={isActive ? "h-5 w-5 stroke-[2.4]" : "h-5 w-5 stroke-[2]"} />
              </button>

              {/* Tooltip HUD */}
              <span className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:block rounded-lg bg-black border border-[#152326] px-2.5 py-1 text-xs font-semibold text-[#10B981] whitespace-nowrap shadow-xl z-50">
                {item.label}
              </span>
            </div>
          );
        })}
      </nav>

      {/* Bottom Zone: Fixed Container for Power / Sign Out */}
      <div className="flex flex-col items-center pb-1 shrink-0">
        <button
          type="button"
          onClick={onSignOut}
          title="Sign Out / Power"
          aria-label="Sign out"
          className="group relative flex h-11 w-11 items-center justify-center rounded-full border border-[#152326] bg-black text-slate-400 transition-all hover:border-[#10B981] hover:text-[#10B981] active:scale-95 cursor-pointer"
        >
          <Power className="h-4 w-4 stroke-[2.2] transition-transform group-hover:scale-110" />
        </button>
      </div>
    </aside>

    {/* Mobile & Tablet Bottom Navigation Bar (Screens < 1024px, 325px - 768px) */}
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex lg:hidden items-center justify-around border-t border-[#152326] bg-black/95 backdrop-blur-md px-3 py-2 select-none safe-area-pb">
      <button
        type="button"
        onClick={() => setActiveTab("kinematics")}
        className="flex flex-col items-center gap-1 p-1 text-xs"
      >
        <div className={`p-2 rounded-xl transition-colors ${activeTab === "kinematics" ? "bg-[#10B981] text-black" : "text-slate-400"}`}>
          <PulseWaveformIcon className="h-4 w-4" />
        </div>
        <span className={`text-[10px] font-mono tracking-tight ${activeTab === "kinematics" ? "text-[#10B981] font-semibold" : "text-slate-500"}`}>
          Kinematics
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("analytics")}
        className="flex flex-col items-center gap-1 p-1 text-xs"
      >
        <div className={`p-2 rounded-xl transition-colors ${activeTab === "analytics" ? "bg-[#10B981] text-black" : "text-slate-400"}`}>
          <BarChartIcon className="h-4 w-4" />
        </div>
        <span className={`text-[10px] font-mono tracking-tight ${activeTab === "analytics" ? "text-[#10B981] font-semibold" : "text-slate-500"}`}>
          Analytics
        </span>
      </button>

      <button
        type="button"
        onClick={() => setActiveTab("log-medicine")}
        className="flex flex-col items-center gap-1 p-1 text-xs"
      >
        <div className={`p-2 rounded-xl transition-colors ${activeTab === "log-medicine" ? "bg-[#10B981] text-black" : "text-slate-400"}`}>
          <PillMedicationIcon className="h-4 w-4" />
        </div>
        <span className={`text-[10px] font-mono tracking-tight ${activeTab === "log-medicine" ? "text-[#10B981] font-semibold" : "text-slate-500"}`}>
          Medication
        </span>
      </button>

      <button
        type="button"
        onClick={onSignOut}
        title="Sign Out"
        className="flex flex-col items-center gap-1 p-1 text-xs text-slate-500 hover:text-[#ef4444]"
      >
        <div className="p-2 rounded-xl text-slate-400 hover:text-[#ef4444]">
          <Power className="h-4 w-4 stroke-[2]" />
        </div>
        <span className="text-[10px] font-mono tracking-tight text-slate-500">
          Exit
        </span>
      </button>
    </nav>
    </>
  );
}
