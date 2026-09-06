import { useState } from "react";
import {
  X,
  Check,
  CheckCheck,
  Pill,
  Activity,
  TrendingUp,
  Bluetooth,
  ChevronRight,
  Settings2,
} from "lucide-react";

export default function NotificationsModal({ isOpen, onClose }) {
  const [alerts, setAlerts] = useState([
    {
      id: "alert-1",
      title: "Scheduled Dose: LD-CD 100/25 mg",
      time: "10m ago",
      dotColor: "bg-[#f59e0b]",
      icon: Pill,
      iconBg: "bg-black text-[#f59e0b] border-[#f59e0b]/50",
      description:
        "Afternoon dose window is now active. Telemetry predicts wearing-off onset in ~25 mins.",
      read: false,
    },
    {
      id: "alert-2",
      title: "100 Hz Baseline Synced",
      time: "1h ago",
      icon: Activity,
      iconBg: "bg-black text-[#10B981] border-[#10B981]",
      description:
        "Wrist IMU Node (ESP-994) re-calibrated. Static gravity compensation completed with 0.142g RMS accuracy.",
      checked: true,
      read: false,
    },
    {
      id: "alert-3",
      title: "Acute Motor Flare Detected",
      time: "3h ago",
      dotColor: "bg-[#38bdf8]",
      icon: TrendingUp,
      iconBg: "bg-black text-[#38bdf8] border-[#38bdf8]/50",
      description:
        "Symptom severity breached the rolling 30-day baseline threshold (+1.8σ). Added to doctor review queue.",
      read: false,
    },
    {
      id: "alert-4",
      title: "Active Hand Twin Connected",
      time: "08:15 AM",
      icon: Bluetooth,
      iconBg: "bg-black text-slate-400 border-[#152326]",
      description:
        "ESP32 dual 6-DoF sensor array streaming at 60 FPS without packet drop.",
      checked: true,
      read: true,
    },
  ]);

  const [allRead, setAllRead] = useState(false);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    setAllRead(true);
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16 md:p-6 md:pt-20 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-3xl border border-[#152326] bg-black p-5 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#152326] pb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-bold text-[#ededed]">
              Notifications &amp; System Alerts
            </h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-black px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#10B981] border border-[#10B981]">
                {unreadCount} New
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 font-mono text-[11px] text-slate-400 hover:text-[#10B981] transition-colors cursor-pointer"
            >
              <span>Mark all read</span>
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="mt-3.5 space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {alerts.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="relative rounded-2xl border border-[#152326] bg-black p-3.5 transition-colors hover:border-[#10B981]"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.iconBg}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="truncate font-display text-xs font-bold text-[#ededed]">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] text-slate-400">
                        <span>{item.time}</span>
                        {item.dotColor && (
                          <span className={`h-1.5 w-1.5 rounded-full ${item.dotColor}`} />
                        )}
                        {item.checked && (
                          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-black border border-[#10B981] text-[#10B981]">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Daily Monitoring Progress Bar */}
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#152326] bg-black px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-display text-xs font-semibold text-[#ededed]">
              Daily Monitoring Progress: <strong className="text-[#10B981]">75%</strong>
            </span>
          </div>

          <div className="relative flex h-5 w-5 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-5 w-5 -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#152326"
                strokeWidth="4"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeDasharray="75, 100"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-3 flex items-center justify-between font-mono-tech text-[10px] text-[#8a9992] px-1">
          <span>Auto-sync: 100 Hz UART</span>
          <button
            type="button"
            onClick={() => alert("Filter presets: Clinical Alerts, Telemetry Events, Device Notifications.")}
            className="flex items-center gap-1 hover:text-[#ededed] transition-colors"
          >
            <span>Configure alert filters</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
