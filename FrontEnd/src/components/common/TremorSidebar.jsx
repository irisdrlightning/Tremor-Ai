import { Power } from "lucide-react";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import tremorIcon from "@/assets/tremor-icon.png";

/**
 * Custom Minimalist SVG Icons precisely matching the reference design:
 * 1. PulseWaveformIcon: Minimal Parkinson's kinematic tremor pulse wave
 * 2. BarChartIcon: 3 vertical discrete level bars
 */
function PulseWaveformIcon({ className = "h-4 w-4" }) {
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

function BarChartIcon({ className = "h-4 w-4" }) {
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

function PillMedicationIcon({ className = "h-4 w-4" }) {
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
 * Pixel-tailored to the reference screenshot:
 * - Elongated capsule pill with smooth dark obsidian background (#030705)
 * - Subtle perimeter border (rgba(255, 255, 255, 0.05))
 * - Top: High-contrast rounded square holding the teal Tremor "T" glyph
 * - Center:
 *     - Active state: Vibrant round solid teal/emerald circle (#00d592) with black kinematic pulse icon
 *     - Inactive state: Muted, minimalist discrete icons (#606d67)
 * - Bottom: Subtle circular power button with thin ring
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
    <aside
      className={`hidden w-[64px] shrink-0 flex-col items-center justify-between rounded-[36px] bg-[#030605] border border-[rgba(255,255,255,0.06)] py-6 shadow-2xl lg:flex min-h-[calc(100vh-4rem)] select-none ${className}`}
    >
      {/* Top: Glowing Tremor AI Emblem in Rounded Squircle Frame */}
      <div className="flex flex-col items-center pt-1">
        <button
          type="button"
          onClick={() => setActiveTab("kinematics")}
          title="Tremor AI Overview"
          className="group relative flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#070f0b] border border-[#00d592]/25 p-2 shadow-[0_0_16px_rgba(0,213,146,0.12)] transition-all hover:border-[#00d592]/60 hover:scale-105 active:scale-95"
        >
          <img
            src={iconSrc}
            alt="Tremor AI emblem"
            className="h-full w-full object-contain filter drop-shadow-[0_0_6px_rgba(0,213,146,0.4)]"
          />
        </button>
      </div>

      {/* Middle: Navigation Stack with Solid Circular Active State */}
      <nav className="flex flex-col items-center gap-7 my-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              aria-label={item.label}
              className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                isActive
                  ? "h-11 w-11 bg-[#00d592] text-[#02140d] shadow-[0_0_24px_rgba(0,213,146,0.45)] scale-105"
                  : "h-9 w-9 text-[#586860] hover:text-[#ededed] hover:bg-[#0a1410] active:scale-95"
              }`}
            >
              <Icon className={isActive ? "h-5 w-5 stroke-[2.4]" : "h-4 w-4"} />
            </button>
          );
        })}
      </nav>

      {/* Bottom: Circular Outline Power Button */}
      <div className="flex flex-col items-center pb-1">
        <button
          type="button"
          onClick={onSignOut}
          title="Sign Out / Power"
          aria-label="Sign out"
          className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(255,255,255,0.08)] bg-[#070e0a] text-[#586860] transition-all hover:border-[#00d592]/40 hover:text-[#00d592] hover:bg-[#0c1611] active:scale-95"
        >
          <Power className="h-3.5 w-3.5 stroke-[2.2] transition-transform group-hover:scale-110" />
        </button>
      </div>
    </aside>
  );
}
