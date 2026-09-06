import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Droplet,
  Filter,
  Hand,
  Phone,
  Pill,
  Power,
  ScanEye,
  Search,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import handScan from "@/assets/hand-scan.png";
import { handScanBase64 } from "@/assets/handScanBase64";
import tremorIcon from "@/assets/tremor-icon.png";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import { useRole } from "@/context/RoleContext";
import {
  conditions as initialConditions,
  schedule as initialSchedule,
  sensorNodes as initialSensorNodes,
  subject as initialSubject,
} from "@/data/mockKinematics";
import api from "@/services/api";
import { useLiveTelemetry } from "@/services/websocket";
import { useBluetooth, BLE_STATE } from "@/hooks/useBluetooth";
import MedicationAnalytics from "@/components/kinematics/MedicationAnalytics";
import LogMedicationDose from "@/components/kinematics/LogMedicationDose";
import { LiveDspEngine } from "@/lib/dspEngine";
import WearableConnectModal from "@/components/kinematics/WearableConnectModal";
import KinematicsGraphsPanel from "@/components/kinematics/KinematicsGraphsPanel";
import NotificationsModal from "@/components/kinematics/NotificationsModal";
import UserProfileModal from "@/components/common/UserProfileModal";
import TremorHeaderBrand from "@/components/common/TremorHeaderBrand";
import TremorSidebar from "@/components/common/TremorSidebar";


const icons = {
  droplet: Droplet,
  scan: ScanEye,
  chart: BarChart3,
  funnel: Filter,
};

function TopBar({
  initials,
  activeTab = "kinematics",
  setActiveTab = () => {},
  bleState,
  deviceName,
  errorMessage,
  isSupported,
  onConnect,
  onDisconnect,
  onOpenWearables,
  onOpenNotifications,
  onOpenProfile,
  onSignOut,
}) {
  const { switchRole } = useRole();
  const isConnected   = bleState === BLE_STATE.CONNECTED;
  const isBusy        = bleState === BLE_STATE.SCANNING || bleState === BLE_STATE.CONNECTING;
  const isUnsupported = bleState === BLE_STATE.UNSUPPORTED;

  const bleLabel = isConnected
    ? `Connected · ${deviceName ?? "ESP32 Glove"}`
    : isBusy
    ? bleState === BLE_STATE.SCANNING ? "Scanning…" : "Connecting…"
    : bleState === BLE_STATE.DISCONNECTED
    ? "Reconnect Glove"
    : isUnsupported
    ? "BLE Not Supported"
    : "Connect Glove";

  const BleIcon = isConnected ? BluetoothConnected : isBusy ? Bluetooth : BluetoothOff;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      {/* Universal Tremor AI Brand Header */}
      <div className="flex items-center gap-3">
        <TremorHeaderBrand title="Live Kinematics" subtitle="Real-Time Telemetry" />
      </div>

      {/* Action Icons: Bluetooth, Notifications, and Profile avatar */}
      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {/* BLE Connect Button / Hardware Status */}
        <div className="flex flex-col items-end gap-0.5">
          <button
            id="ble-connect-btn"
            type="button"
            aria-label={bleLabel}
            title={bleLabel}
            disabled={isBusy || isUnsupported}
            onClick={isConnected ? onDisconnect : onConnect}
            className={[
              "grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-all hover:border-primary/50 hover:text-primary",
              isConnected ? "border-primary text-primary bg-primary/10 shadow-[0_0_12px_rgba(0,229,153,0.2)]" : "",
            ].join(" ")}
          >
            <BleIcon
              className={[
                "h-4 w-4 shrink-0",
                isBusy ? "animate-pulse" : "",
              ].join(" ")}
            />
          </button>
          {errorMessage ? (
            <span className="font-mono-tech text-[10px] text-destructive pr-1">{errorMessage}</span>
          ) : null}
        </div>

        <button
          type="button"
          aria-label="Notifications"
          title="Notifications & Alerts"
          onClick={onOpenNotifications}
          className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
        </button>

        <button
          type="button"
          onClick={onOpenProfile || onSignOut}
          title="Edit Profile Details & Information"
          className="grid h-10 w-10 place-items-center rounded-full border border-primary/50 bg-card font-mono-tech text-xs font-bold text-primary shadow-sm hover:border-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}

function SectionTitle({ children, actions }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <h2 className="flex min-w-0 items-center gap-2 font-display text-base font-semibold">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
        <span className="truncate">{children}</span>
      </h2>
      {actions}
    </div>
  );
}

function HandImageCard({ subjectData, nodes }) {
  const [activeNode, setActiveNode] = useState(null);

  const frequencyNodes = nodes && nodes.length > 0 ? nodes : [
    {
      id: "node-d1",
      name: "Thumb (D1)",
      freq: "4.8 Hz",
      amp: "±2.9 mm",
      state: "normal",
      top: "54%",
      left: "24%",
    },
    {
      id: "node-d2",
      name: "Index Tip (D2)",
      freq: "5.1 Hz",
      amp: "±3.8 mm",
      state: "peak",
      top: "16%",
      left: "34%",
    },
    {
      id: "node-d3",
      name: "Middle Tip (D3)",
      freq: "5.2 Hz",
      amp: "±4.1 mm",
      state: "peak",
      top: "12%",
      left: "49%",
    },
    {
      id: "node-d4",
      name: "Ring Tip (D4)",
      freq: "5.0 Hz",
      amp: "±3.4 mm",
      state: "peak",
      top: "18%",
      left: "64%",
    },
    {
      id: "node-d5",
      name: "Pinky Tip (D5)",
      freq: "4.7 Hz",
      amp: "±2.2 mm",
      state: "normal",
      top: "32%",
      left: "78%",
    },
    {
      id: "node-mcp",
      name: "Metacarpal (MCP)",
      freq: "5.1 Hz",
      amp: "±1.6 mm",
      state: "normal",
      top: "48%",
      left: "48%",
    },
    {
      id: "node-wrist",
      name: "Carpal / Wrist",
      freq: "0.4 Hz",
      amp: "±0.3 mm",
      state: "baseline",
      top: "84%",
      left: "50%",
    },
  ];

  const imgSrc = handScanBase64 || handScan || "/hand-scan.png";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-shell/70 border border-border/80 flex items-center justify-center select-none group shadow-inner">
      {/* Background Radiance */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(20,184,166,0.12),transparent_70%)]" />

      {/* Top Clinical Badge */}
      <div className="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 font-mono-tech text-[10px]">
        <span className="flex items-center gap-1 rounded-full bg-card/90 border border-primary/40 px-2.5 py-1 text-primary shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span>Kinematic Scan</span>
        </span>
      </div>

      {/* Hand Scan Image */}
      <img
        src={imgSrc}
        alt={`Hand tremor scan for subject ${subjectData.id}`}
        className="h-[88%] w-[88%] object-contain rounded-2xl pointer-events-none select-none filter contrast-110 drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
      />

      {/* Anatomical Frequency Nodes */}
      {frequencyNodes.map((node) => {
        const isPeak = node.state === "peak";
        const isSelected = activeNode === node.id;

        return (
          <div
            key={node.id}
            onClick={() => setActiveNode((prev) => (prev === node.id ? null : node.id))}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group/node"
            style={{ top: node.top, left: node.left }}
          >
            {/* Pulsating Beacon */}
            <div className="relative flex items-center justify-center">
              <span
                className={`animate-ping absolute inline-flex h-4 w-4 rounded-full ${
                  isPeak ? "bg-primary opacity-75" : "bg-teal-400 opacity-50"
                }`}
              />
              <span
                className={`relative inline-flex items-center justify-center rounded-full h-4 w-4 border-2 border-background shadow-md transition-transform hover:scale-125 ${
                  isPeak ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>

              {/* Frequency Tag Badge */}
              <span
                className={`absolute left-full ml-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono-tech text-[10px] font-bold shadow-sm backdrop-blur border transition-all ${
                  isPeak
                    ? "bg-primary/20 border-primary/60 text-primary"
                    : "bg-card/85 border-border/80 text-foreground"
                }`}
              >
                {node.freq}
              </span>
            </div>

            {/* Telemetry Tooltip */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap rounded-xl bg-card/95 border border-primary/40 px-3 py-1.5 text-[11px] font-mono-tech shadow-xl backdrop-blur transition-all pointer-events-none z-30 ${
                isSelected
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95 group-hover/node:opacity-100 group-hover/node:scale-100"
              }`}
            >
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {node.name}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>
                  Freq: <strong className="text-primary font-bold">{node.freq}</strong>
                </span>
                <span>•</span>
                <span>
                  Amp: <strong>{node.amp}</strong>
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-2.5 right-3.5 z-20 font-mono-tech text-[9px] text-muted-foreground/80 pointer-events-none select-none">
        Click node for telemetry
      </div>
    </div>
  );
}

function OverviewCard({ subjectData, nodes }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
        Overview
        <br />
        Conditions
      </h1>
      <p className="mt-3 flex items-center gap-2 font-mono-tech text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Subject: {subjectData.name} ({subjectData.id})
      </p>

      <div className="relative mt-6">
        <HandImageCard subjectData={subjectData} nodes={nodes} />

        <div className="mt-4 rounded-2xl border border-primary/40 bg-shell/80 p-4 backdrop-blur sm:absolute sm:bottom-4 sm:left-0 sm:mt-0 sm:w-44 z-20">
          <p className="flex items-center gap-2 font-mono-tech text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Tremor Rate
          </p>
          <p className="mt-1 font-display text-3xl font-bold">
            {subjectData.tremorRate} <span className="text-sm text-primary">Hz</span>
          </p>
          <svg viewBox="0 0 140 28" className="mt-2 h-7 w-full text-primary">
            <path
              d="M0 14 Q 12 0 24 14 T 48 14 T 72 14 T 96 14 T 120 14 T 144 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 font-mono-tech text-xs text-muted-foreground">
        <span>Sampling: {subjectData.sampling}</span>
        <span className="text-primary">RMS {subjectData.rms}</span>
      </div>
    </section>
  );
}


function ConditionCard({ item }) {
  const Icon = icons[item.icon] ?? Droplet;
  const highlight = item.variant === "highlight";

  // Dynamic tag coloring
  let tagColorClass = "text-primary bg-primary/10 border-primary/20";
  if (highlight) {
    tagColorClass = "bg-primary-foreground/15 text-primary-foreground border-transparent";
  } else if (item.tag === "MODERATE") {
    tagColorClass = "text-warning bg-warning/10 border-warning/20";
  } else if (item.tag === "HIGH" || item.tag === "SEVERE" || item.tag === "PARKINSON'S" || item.tag === "CONFIRMED") {
    tagColorClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  } else if (item.tag === "OTHER DISORDER" || item.tag === "ACTION TREMOR" || item.tag === "MILD") {
    tagColorClass = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  } else if (item.tag === "HEALTHY" || item.tag === "BASELINE" || item.tag === "FILTERED" || item.tag === "PENDING" || item.tag === "STANDBY" || item.tag === "NOT SCORED" || item.tag === "MINIMAL") {
    tagColorClass = "text-teal-400 bg-teal-500/10 border-teal-500/20";
  }

  return (
    <article
      className={[
        "flex min-h-56 flex-col justify-between rounded-3xl border p-5 transition-all duration-300",
        highlight
          ? "border-primary bg-primary text-primary-foreground shadow-[0_0_24px_rgba(0,229,153,0.15)]"
          : "border-border bg-card text-foreground shadow-sm hover:border-border/80",
      ].join(" ")}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span
          className={[
            "grid h-9 w-9 place-items-center rounded-full",
            highlight ? "bg-primary-foreground/15 text-primary-foreground" : "bg-secondary text-primary",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={[
            "justify-self-end truncate rounded-full px-2.5 py-1 font-mono-tech text-[10px] font-semibold uppercase tracking-wider border",
            tagColorClass,
          ].join(" ")}
        >
          {item.tag}
        </span>
      </div>

      <div>
        <p
          className={[
            "text-sm font-medium",
            highlight ? "text-primary-foreground/75" : "text-muted-foreground",
          ].join(" ")}
        >
          {item.label}
        </p>
        <p className="mt-1 font-display text-2xl font-bold tracking-tight">
          {item.value}
          {item.unit ? (
            <span
              className={[
                "ml-1 text-sm font-normal",
                highlight ? "text-primary-foreground/75" : "text-primary",
              ].join(" ")}
            >
              {item.unit}
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-4">
        {item.variant === "bars" ? (
          <div className="flex h-8 items-end gap-1.5">
            {(item.bars || [30, 55, 80, 100, 65, 25]).map((h, i) => (
              <span
                key={i}
                style={{ height: `${Math.max(10, Math.min(100, h))}%` }}
                className="w-2 rounded-sm bg-primary/80 transition-all duration-300 hover:bg-primary"
              />
            ))}
          </div>
        ) : null}

        {item.variant === "steps" ? (
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => {
              const active = (item.activeSteps ?? 2) >= step;
              return (
                <span
                  key={step}
                  className={[
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    active
                      ? step === 1
                        ? "bg-primary"
                        : step === 2
                        ? "bg-teal-400"
                        : step === 3
                        ? "bg-warning"
                        : "bg-destructive"
                      : "bg-secondary",
                  ].join(" ")}
                />
              );
            })}
          </div>
        ) : null}

        {item.variant === "dots" ? (
          <div className="flex items-center gap-1 font-mono-tech text-[10px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
            <span className="tracking-[0.25em] text-muted-foreground/80 pl-1">
              BANDPASS 0.5–3.8Hz ACTIVE
            </span>
          </div>
        ) : null}

        {highlight ? (
          <div className="flex items-center justify-between gap-3">
            <svg viewBox="0 0 90 20" className="h-5 w-24 text-primary-foreground/90">
              <path
                d="M0 10 H20 L26 2 L32 18 L38 10 H90"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span className="font-mono-tech text-[10px] uppercase tracking-wider font-semibold opacity-90">
              {item.footer}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ScheduleCard({ schedule = initialSchedule }) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-3 rounded-2xl bg-shell p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
          <CalendarDays className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0">
          <p className="font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground">
            Next checkup
          </p>
          <p className="truncate font-display text-lg font-semibold">{schedule.nextCheckup}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous week"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-mono-tech text-xs text-muted-foreground">{schedule.weekLabel}</span>
        <button
          type="button"
          aria-label="Next week"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-1">
        {schedule.days.map((day) => {
          const active = day === schedule.activeDay;
          return (
            <button
              key={day}
              type="button"
              className={[
                "h-9 w-9 rounded-full font-mono-tech text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary",
              ].join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>

      <ul className="mt-6 flex-1 space-y-4">
        {schedule.team.map((member) => (
          <li key={member.initials} className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border font-mono-tech text-[11px] text-primary">
              {member.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{member.name}</p>
              <p className="truncate text-xs text-muted-foreground">{member.role}</p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Consult Now
        <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  );
}

function SensorCard({ node, liveImu, peakFreq }) {
  const Icon = node.id === "primary" ? Hand : node.id === "fft" ? BarChart3 : Activity;

  const isLive = Boolean(liveImu);
  let status = node.status || (node.highlight ? "STREAMING" : "SYNCED");
  let meta = node.meta || (node.highlight ? "6-DOF IMU" : "Active");
  let subtitle = node.subtitle;

  if (node.id === "esp-994") {
    if (isLive) {
      const ax = typeof liveImu.ax === "number" ? liveImu.ax.toFixed(3) : liveImu.accelX?.toFixed(3) ?? "0.000";
      const ay = typeof liveImu.ay === "number" ? liveImu.ay.toFixed(3) : liveImu.accelY?.toFixed(3) ?? "0.000";
      const az = typeof liveImu.az === "number" ? liveImu.az.toFixed(3) : liveImu.accelZ?.toFixed(3) ?? "0.000";
      subtitle = `X ${ax}g  Y ${ay}g  Z ${az}g`;
      status = "STREAMING";
      meta = "100 Hz BLE";
    } else {
      status = "STANDBY";
      meta = "Awaiting BLE";
      subtitle = "No device paired";
    }
  } else if (node.id === "primary") {
    if (isLive) {
      subtitle = "Live biomechanical hand twin tracking";
      status = "ACTIVE";
      meta = "6-DOF Kinematics";
    } else {
      subtitle = "Awaiting device connection";
      status = "STANDBY";
      meta = "Offline";
    }
  } else if (node.id === "fft") {
    if (isLive) {
      subtitle = peakFreq ? `Peak: ${peakFreq} Hz (Session)` : "Continuous PSD Welch Analysis";
      status = "PROCESSING";
      meta = "0 - 25 Hz FFT";
    } else {
      subtitle = "Awaiting stream";
      status = "STANDBY";
      meta = "IDLE";
    }
  }

  return (
    <article className="group flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3 shadow-sm hover:border-primary/50 hover:bg-card/90 transition-all">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-shell border border-border/60 text-primary group-hover:border-primary/40 transition-colors">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 animate-pulse" />
            <p className="truncate font-mono-tech text-[9px] uppercase tracking-wider text-muted-foreground">
              {node.code}
            </p>
          </div>
          <p className="truncate font-display text-xs font-semibold text-foreground">
            {node.title}
          </p>
          <p className="truncate font-mono-tech text-[10px] text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right font-mono-tech">
        <span className="inline-block rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-semibold text-primary uppercase tracking-wider">
          {status}
        </span>
        <p className="text-[10px] text-muted-foreground mt-0.5">{meta}</p>
      </div>
    </article>
  );
}

export default function LiveKinematics({ onSignOut }) {
  const { role, user, logout } = useRole();
  const isDoctor = role === "doctor";
  const [activeTab, setActiveTab] = useState("kinematics");
  const [showWearableModal, setShowWearableModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeGraph, setActiveGraph] = useState("fft"); // "fft" (Image 3) | "oscilloscope" (Image 4)
  const [psdData, setPsdData] = useState(null);

  const [subjectData, setSubjectData] = useState(initialSubject);
  const [conditionsData, setConditionsData] = useState(initialConditions);
  const [sensorNodesData, setSensorNodesData] = useState(initialSensorNodes);

  // Live WebSocket streaming hook
  const { liveData } = useLiveTelemetry();

  // BLE and Serial hardware telemetry hook
  const {
    bleState,
    deviceName,
    transportType,
    bleData,
    errorMessage: bleError,
    isSupported: bleSupported,
    isBleSupported,
    isSerialSupported,
    connect: bleConnect,
    connectBle,
    connectSerial,
    disconnect: bleDisconnect,
    sendDoseToWearable,
    syncHistoryFromDevice,
  } = useBluetooth();

  // Hydrate REST API on mount
  useEffect(() => {
    let active = true;

    api.getPatientOverview().then((res) => {
      if (active && res) setSubjectData((prev) => ({ ...prev, ...res }));
    });
    api.getConditions().then((res) => {
      if (active && res && Array.isArray(res)) setConditionsData(res);
    });
    api.getSensorNodes().then((res) => {
      if (active && res && Array.isArray(res)) setSensorNodesData(res);
    });

    return () => {
      active = false;
    };
  }, []);

  // Device connection state flag
  const isDeviceConnected = bleState === BLE_STATE.CONNECTED;

  const [liveTremorRate, setLiveTremorRate] = useState("0.00");
  const [liveRms, setLiveRms] = useState("0.000g");

  // Standby conditions when disconnected
  const STANDBY_CONDITIONS = [
    {
      id: "ai",
      tag: "STANDBY",
      icon: "scan",
      label: "AI Detection",
      value: "Awaiting data",
      footer: "NO DEVICE",
      variant: "highlight",
    },
    {
      id: "spectral",
      tag: "PENDING",
      icon: "droplet",
      label: "Tremor Band Power",
      value: "0",
      unit: "%",
      footer: "STANDBY",
      variant: "bars",
    },
    {
      id: "updrs",
      tag: "NOT SCORED",
      icon: "chart",
      label: "Score Card",
      value: "0",
      unit: "/100",
      footer: "STANDBY",
      variant: "steps",
    },
    {
      id: "noise",
      tag: "BASELINE",
      icon: "funnel",
      label: "Voluntary Noise",
      value: "0.0",
      unit: "Hz",
      variant: "dots",
    },
  ];

  const STANDBY_NODES = [
    { id: "node-d1", name: "Thumb (D1)", freq: "0.0 Hz", amp: "±0.0 mm", state: "baseline", top: "54%", left: "24%" },
    { id: "node-d2", name: "Index Tip (D2)", freq: "0.0 Hz", amp: "±0.0 mm", state: "baseline", top: "16%", left: "34%" },
    { id: "node-d3", name: "Middle Tip (D3)", freq: "0.0 Hz", amp: "±0.0 mm", state: "baseline", top: "12%", left: "49%" },
    { id: "node-d4", name: "Ring Tip (D4)", freq: "0.0 Hz", amp: "±0.0 mm", state: "baseline", top: "18%", left: "64%" },
    { id: "node-d5", name: "Pinky Tip (D5)", freq: "0.0 Hz", amp: "±0.0 mm", state: "baseline", top: "32%", left: "78%" },
    { id: "node-mcp", name: "Metacarpal (MCP)", freq: "0.0 Hz", amp: "±0.0 mm", state: "baseline", top: "48%", left: "48%" },
    { id: "node-wrist", name: "Carpal / Wrist", freq: "0.0 Hz", amp: "±0.0 mm", state: "baseline", top: "84%", left: "50%" },
  ];

  // Merge BLE data → REST data when connected
  const currentSubject = {
    ...subjectData,
    tremorRate: isDeviceConnected
      ? parseFloat(liveTremorRate || 0).toFixed(2)
      : "0.00",
    rms: isDeviceConnected
      ? (liveRms ?? "0.000g")
      : "0.000g",
    sampling: isDeviceConnected
      ? (deviceName ? `100 Hz BLE (${deviceName})` : "100 Hz BLE (Active)")
      : "Awaiting Device Connection",
  };

  const rateVal = parseFloat(currentSubject.tremorRate) || 0;
  const rmsVal = parseFloat(currentSubject.rms) || 0;
  const isTremorActive = rateVal >= 3.0;

  const currentNodes = isDeviceConnected
    ? [
        { id: "node-d1", name: "Thumb (D1)", freq: `${(rateVal * 0.98).toFixed(1)} Hz`, amp: `±${(rmsVal * 1.8).toFixed(1)} mm`, state: isTremorActive ? "peak" : "baseline", top: "54%", left: "24%" },
        { id: "node-d2", name: "Index Tip (D2)", freq: `${(rateVal * 1.02).toFixed(1)} Hz`, amp: `±${(rmsVal * 2.1).toFixed(1)} mm`, state: isTremorActive ? "peak" : "baseline", top: "16%", left: "34%" },
        { id: "node-d3", name: "Middle Tip (D3)", freq: `${(rateVal * 1.00).toFixed(1)} Hz`, amp: `±${(rmsVal * 2.3).toFixed(1)} mm`, state: isTremorActive ? "peak" : "baseline", top: "12%", left: "49%" },
        { id: "node-d4", name: "Ring Tip (D4)", freq: `${(rateVal * 0.96).toFixed(1)} Hz`, amp: `±${(rmsVal * 1.9).toFixed(1)} mm`, state: isTremorActive ? "peak" : "baseline", top: "18%", left: "64%" },
        { id: "node-d5", name: "Pinky Tip (D5)", freq: `${(rateVal * 0.92).toFixed(1)} Hz`, amp: `±${(rmsVal * 1.6).toFixed(1)} mm`, state: isTremorActive ? "peak" : "baseline", top: "32%", left: "78%" },
        { id: "node-mcp", name: "Metacarpal (MCP)", freq: `${(rateVal * 0.95).toFixed(1)} Hz`, amp: `±${(rmsVal * 1.2).toFixed(1)} mm`, state: isTremorActive ? "normal" : "baseline", top: "48%", left: "48%" },
        { id: "node-wrist", name: "Carpal / Wrist", freq: `${(rateVal * 1.05).toFixed(1)} Hz`, amp: `±${(rmsVal * 2.5).toFixed(1)} mm`, state: isTremorActive ? "normal" : "baseline", top: "84%", left: "50%" },
      ]
    : STANDBY_NODES;

  // Live IMU for SensorCard (only active when device is connected)
  const liveImu = isDeviceConnected ? (bleData?.raw ?? null) : null;

  // Track session peak tremor frequency (highest seen this session)
  const [sessionPeakFreq, setSessionPeakFreq] = useState(null);
  useEffect(() => {
    if (!isDeviceConnected) return;
    const incoming = parseFloat(liveTremorRate);
    if (!isNaN(incoming) && incoming > 0) {
      setSessionPeakFreq((prev) => (prev === null || incoming > prev ? incoming : prev));
    }
  }, [liveTremorRate, isDeviceConnected]);

  // Real-time DSP & AI detection processing for BLE Telemetry
  const dspEngineRef = useRef(null);
  if (!dspEngineRef.current) {
    dspEngineRef.current = new LiveDspEngine(256, 100);
  }

  // Sliding sample buffer for trained Random Forest model inference
  const sampleBufferRef = useRef([]);
  const lastInferenceTimeRef = useRef(0);
  const lastUiUpdateTimeRef = useRef(0);

  useEffect(() => {
    if (!isDeviceConnected) return;

    // Ingest physical BLE hardware samples into client DSP and sliding inference buffer
    const incomingSamples = bleData?.batch || (bleData?.raw ? [bleData.raw] : []);
    if (incomingSamples.length > 0) {
      for (const s of incomingSamples) {
        dspEngineRef.current.pushSample(s);
        sampleBufferRef.current.push(s);
        if (sampleBufferRef.current.length > 256) {
          sampleBufferRef.current.shift();
        }
      }

      const now = Date.now();

      // Smooth 4 Hz UI updates to eliminate CSS animation jitter & screen flicker
      if (now - lastUiUpdateTimeRef.current >= 250) {
        lastUiUpdateTimeRef.current = now;
        const dspResult = dspEngineRef.current.process();
        if (dspResult) {
          if (dspResult.conditions) {
            setConditionsData(dspResult.conditions);
          }
          if (dspResult.dominantFreq !== undefined) {
            setLiveTremorRate(parseFloat(dspResult.dominantFreq || 0).toFixed(2));
          }
          if (dspResult.rms) {
            setLiveRms(dspResult.rms);
          }
          if (dspResult.psdCurve) {
            setPsdData(dspResult.psdCurve);
          }
        }
      }

      // Query exact trained Random Forest model every 750ms
      if (sampleBufferRef.current.length >= 64 && now - lastInferenceTimeRef.current > 750) {
        lastInferenceTimeRef.current = now;
        api
          .predictWindow(sampleBufferRef.current, 100.0)
          .then((res) => {
            if (res && res.status === "success") {
              if (res.conditions) setConditionsData(res.conditions);
              if (res.dominant_frequency !== undefined) {
                setLiveTremorRate(parseFloat(res.dominant_frequency || 0).toFixed(2));
              }
              if (res.rms) {
                setLiveRms(res.rms);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [bleData, isDeviceConnected]);

  const displayedConditions = isDeviceConnected ? conditionsData : STANDBY_CONDITIONS;

  return (
    <div className="min-h-screen bg-[#060908] text-[#ededed] p-4 md:p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1500px] gap-6">
        {/* Universal Tremor AI Navigation Sidebar Component */}
        <TremorSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onSignOut={onSignOut || logout}
        />

        <main className="min-w-0 flex-1 space-y-6">
          {activeTab === "analytics" ? (
            <MedicationAnalytics
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              initials={user.initials}
              liveData={liveData}
              bleData={bleData}
              bleState={bleState}
              deviceName={deviceName}
              syncHistoryFromDevice={syncHistoryFromDevice}
            />
          ) : activeTab === "log-medicine" ? (
            <LogMedicationDose
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              initials={user.initials}
              liveData={liveData}
              bleData={bleData}
              bleState={bleState}
              deviceName={deviceName}
              sendDoseToWearable={sendDoseToWearable}
              syncHistoryFromDevice={syncHistoryFromDevice}
            />
          ) : (
            <>
              <TopBar
                initials={user.initials}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                bleState={bleState}
                deviceName={deviceName}
                errorMessage={bleError}
                isSupported={bleSupported}
                onConnect={bleConnect}
                onDisconnect={bleDisconnect}
                onOpenWearables={() => setShowWearableModal(true)}
                onOpenNotifications={() => setShowNotificationsModal(true)}
                onOpenProfile={() => setShowProfileModal(true)}
                onSignOut={onSignOut || logout}
              />

              {/* User Profile & Patient Demographic Editing Modal */}
              <UserProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                onSignOut={onSignOut || logout}
              />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)]">
                {/* 3D Hand Model & OverviewCard (Untouched dependency, exactly preserved) */}
                <OverviewCard subjectData={currentSubject} nodes={currentNodes} />

                {/* Right Column: Graphs Panel matching Image 3 (FFT) & Image 4 (6-DOF Oscilloscope) */}
                <KinematicsGraphsPanel
                  activeGraph={activeGraph}
                  setActiveGraph={setActiveGraph}
                  liveImu={liveImu}
                  liveHz={currentSubject.tremorRate}
                  liveRms={currentSubject.rms}
                  conditions={displayedConditions}
                  psdData={psdData}
                />
              </div>

              {/* Wearable Connection Modal (Image 2) */}
              <WearableConnectModal
                isOpen={showWearableModal}
                onClose={() => setShowWearableModal(false)}
                onConnectBle={connectBle}
                onConnectSerial={connectSerial}
                onConnectGlove={bleConnect}
                onDisconnectGlove={bleDisconnect}
                bleState={bleState}
                deviceName={deviceName}
                transportType={transportType}
                errorMessage={bleError}
                isBleSupported={isBleSupported}
                isSerialSupported={isSerialSupported}
              />

              {/* Notifications & System Alerts Modal (Image 6) */}
              <NotificationsModal
                isOpen={showNotificationsModal}
                onClose={() => setShowNotificationsModal(false)}
              />

              {/* Sensor Channels & Validation Nodes (Matching bottom row in Images 2, 3, 4) */}
              <div className="space-y-3">
                <SectionTitle
                  actions={
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        aria-label="Previous nodes"
                        className="grid h-9 w-9 place-items-center rounded-full bg-card text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next nodes"
                        className="grid h-9 w-9 place-items-center rounded-full bg-card text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  }
                >
                  Sensor Channels &amp; Validation Nodes
                </SectionTitle>
                <div className="grid gap-3 lg:grid-cols-3">
                  {sensorNodesData.map((node) => (
                    <SensorCard
                      key={node.id}
                      node={node}
                      liveImu={liveImu}
                      peakFreq={sessionPeakFreq}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

