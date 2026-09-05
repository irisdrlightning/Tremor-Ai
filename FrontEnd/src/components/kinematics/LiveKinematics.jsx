import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
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

import { useEffect, useState } from "react";
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
import MedicationAnalytics from "@/components/kinematics/MedicationAnalytics";
import LogMedicationDose from "@/components/kinematics/LogMedicationDose";
import SuggestedRegimen from "@/components/kinematics/SuggestedRegimen";


const icons = {
  droplet: Droplet,
  scan: ScanEye,
  chart: BarChart3,
  funnel: Filter,
};

function TopBar({ initials }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground flex items-baseline gap-1.5">
          <span>Tremor</span>
          <span className="font-mono-tech text-xs font-bold text-primary tracking-widest uppercase">
            AI
          </span>
        </h1>
      </div>

      <label className="order-last col-span-2 flex min-w-0 items-center gap-3 rounded-full bg-shell px-5 py-2.5 md:order-none md:col-span-1 border border-border/50 max-w-xl mx-auto w-full focus-within:border-primary/50 transition-colors">
        <input
          type="search"
          placeholder="Search patient, biomarker, or telemetry node..."
          className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      </label>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          aria-label="Call clinic"
          title="Call Clinic"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 shadow-sm"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          title="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-transform hover:scale-105 active:scale-95"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
        </button>
        <span className="grid h-10 w-10 place-items-center rounded-full border border-primary/50 bg-card font-mono-tech text-xs font-bold text-primary shadow-sm">
          {initials}
        </span>
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

  return (
    <article
      className={[
        "flex min-h-56 flex-col justify-between rounded-3xl border p-5",
        highlight
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      ].join(" ")}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <span
          className={[
            "grid h-9 w-9 place-items-center rounded-full",
            highlight ? "bg-primary-foreground/15" : "bg-secondary",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          className={[
            "justify-self-end truncate rounded-full px-2 py-1 font-mono-tech text-[10px] uppercase tracking-widest",
            highlight
              ? "bg-primary-foreground/15"
              : item.tag === "MODERATE"
                ? "text-warning"
                : "text-primary",
          ].join(" ")}
        >
          {item.tag}
        </span>
      </div>

      <div>
        <p
          className={[
            "text-sm",
            highlight ? "text-primary-foreground/70" : "text-muted-foreground",
          ].join(" ")}
        >
          {item.label}
        </p>
        <p className="mt-1 font-display text-2xl font-bold">
          {item.value}
          {item.unit ? (
            <span
              className={[
                "ml-1 text-sm font-normal",
                highlight ? "text-primary-foreground/70" : "text-primary",
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
            {[30, 55, 80, 100, 65, 25].map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} className="w-2 rounded-sm bg-primary/80" />
            ))}
          </div>
        ) : null}

        {item.variant === "steps" ? (
          <div className="flex items-center gap-2">
            <span className="h-1 w-8 rounded-full bg-primary" />
            <span className="h-1 w-8 rounded-full bg-warning" />
            <span className="h-1 w-8 rounded-full bg-secondary" />
            <span className="h-1 w-8 rounded-full bg-secondary" />
          </div>
        ) : null}

        {item.variant === "dots" ? (
          <div className="font-mono-tech text-[10px] tracking-[0.35em] text-muted-foreground">
            ..........................
          </div>
        ) : null}

        {highlight ? (
          <div className="flex items-center justify-between gap-3">
            <svg viewBox="0 0 90 20" className="h-5 w-24 text-primary-foreground">
              <path
                d="M0 10 H20 L26 2 L32 18 L38 10 H90"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span className="font-mono-tech text-[10px] uppercase tracking-widest">
              {item.footer}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ScheduleCard() {
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

function SensorCard({ node }) {
  const Icon = node.id === "primary" ? Hand : node.id === "fft" ? BarChart3 : Activity;
  const status = node.status || (node.highlight ? "STREAMING" : "SYNCED");
  const meta = node.meta || (node.highlight ? "6-DOF IMU" : "Active");

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
            {node.subtitle}
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

export default function LiveKinematics() {
  const { role, user } = useRole();
  const isDoctor = role === "doctor";
  const [activeTab, setActiveTab] = useState("kinematics");

  const [subjectData, setSubjectData] = useState(initialSubject);
  const [conditionsData, setConditionsData] = useState(initialConditions);
  const [sensorNodesData, setSensorNodesData] = useState(initialSensorNodes);

  // Live WebSocket streaming hook
  const { liveData } = useLiveTelemetry();

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

  // Update subject with live telemetry if active
  const currentSubject = liveData
    ? {
        ...subjectData,
        tremorRate: liveData.tremorRate || subjectData.tremorRate,
        rms: liveData.rms || subjectData.rms,
      }
    : subjectData;

  const currentNodes = liveData?.nodes || null;

  return (
    <div className="min-h-screen bg-[#060908] text-[#ededed] p-4 md:p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1500px] gap-6">
        <aside className="hidden w-16 shrink-0 flex-col items-center justify-between rounded-2xl bg-[#0c100e] border border-[rgba(255,255,255,0.08)] py-5 lg:flex">
          <div className="flex flex-col items-center gap-6">
            {/* Action Bar Tremor Logo */}
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a17] border border-[rgba(255,255,255,0.08)] p-1 overflow-hidden shadow-sm">
              <img
                src={tremorIconBase64 || tremorIcon || "/tremor-icon.png"}
                alt="Tremor AI logo"
                className="h-full w-full object-contain rounded-lg"
              />
            </div>

            <nav className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("kinematics")}
                title="Live Kinematics"
                aria-label="Live kinematics"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                  activeTab === "kinematics"
                    ? "bg-[#00e599] text-[#021a11]"
                    : "text-[#8a9992] hover:text-[#ededed] hover:bg-[#141a17]"
                }`}
              >
                <Activity className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                title="Medication Analytics"
                aria-label="Medication Analytics"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                  activeTab === "analytics"
                    ? "bg-[#00e599] text-[#021a11]"
                    : "text-[#8a9992] hover:text-[#ededed] hover:bg-[#141a17]"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("log-medicine")}
                title="Log Medication Dose"
                aria-label="Log Medicine"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                  activeTab === "log-medicine"
                    ? "bg-[#00e599] text-[#021a11]"
                    : "text-[#8a9992] hover:text-[#ededed] hover:bg-[#141a17]"
                }`}
              >
                <Pill className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("suggested-regimen")}
                title="Suggested Regimen"
                aria-label="Suggested Regimen"
                className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                  activeTab === "suggested-regimen"
                    ? "bg-[#00e599] text-[#021a11]"
                    : "text-[#8a9992] hover:text-[#ededed] hover:bg-[#141a17]"
                }`}
              >
                <ClipboardList className="h-4 w-4" />
              </button>
            </nav>
          </div>

          <button
            type="button"
            aria-label="Sign out"
            className="grid h-10 w-10 place-items-center rounded-xl border border-[rgba(255,255,255,0.08)] text-[#8a9992] transition-colors hover:text-[#ededed] hover:border-[rgba(255,255,255,0.18)] hover:bg-[#141a17]"
          >
            <Power className="h-4 w-4" />
          </button>
        </aside>

        <main className="min-w-0 flex-1 space-y-6">
          {activeTab === "analytics" ? (
            <MedicationAnalytics
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              initials={user.initials}
            />
          ) : activeTab === "log-medicine" ? (
            <LogMedicationDose
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              initials={user.initials}
            />

          ) : activeTab === "suggested-regimen" ? (
            <SuggestedRegimen
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              initials={user.initials}
            />
          ) : (
            <>
              <TopBar initials={user.initials} />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.95fr)]">
                <OverviewCard subjectData={currentSubject} nodes={currentNodes} />

                <div className="space-y-3">
                  <SectionTitle>Tremor Condition</SectionTitle>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {conditionsData.map((item) => (
                      <ConditionCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </div>

              {isDoctor ? (
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
                    Sensor Channels &amp; Nodes
                  </SectionTitle>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {sensorNodesData.map((node) => (
                      <SensorCard key={node.id} node={node} />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

