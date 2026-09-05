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

import { useState } from "react";
import handScan from "@/assets/hand-scan.png";
import { handScanBase64 } from "@/assets/handScanBase64";
import tremorIcon from "@/assets/tremor-icon.png";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import { useRole } from "@/context/RoleContext";
import { conditions, schedule, sensorNodes, subject } from "@/data/mockKinematics";
import MedicationAnalytics from "@/components/kinematics/MedicationAnalytics";
import LogMedicationDose from "@/components/kinematics/LogMedicationDose";
import SuggestedRegimen from "@/components/kinematics/SuggestedRegimen";

const icons = {
  droplet: Droplet,
  scan: ScanEye,
  chart: BarChart3,
  funnel: Filter,
};

function Sidebar() {
  return (
    <aside className="hidden w-20 shrink-0 flex-col items-center justify-between rounded-3xl bg-shell py-6 lg:flex">
      <nav className="flex flex-col items-center gap-5">
        <button
          type="button"
          aria-label="Live kinematics"
          className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm hover:scale-105 transition-transform"
        >
          <Activity className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Reports"
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-all hover:text-foreground hover:bg-card/50"
        >
          <BarChart3 className="h-5 w-5" />
        </button>
      </nav>
      <button
        type="button"
        aria-label="Sign out"
        className="grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition-all hover:text-foreground hover:border-border/80 hover:bg-card"
      >
        <Power className="h-5 w-5" />
      </button>
    </aside>
  );
}

function TopBar({ initials, activeTab, setActiveTab }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-6">
      <div className="flex min-w-0 items-center gap-3.5">
        {/* Tremor AI Horizontal Brand Component */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-shell px-3 py-1.5 shadow-sm">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border bg-card p-0.5 overflow-hidden shadow-sm">
            <img
              src={tremorIconBase64 || tremorIcon || "/tremor-icon.png"}
              alt="Tremor AI logo"
              className="h-full w-full object-contain rounded-lg"
            />
          </div>
          <div className="flex items-baseline gap-1 leading-none">
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              Tremor
            </span>
            <span className="font-mono-tech text-[11px] font-bold text-primary tracking-wider">
              AI
            </span>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-1 rounded-full bg-shell p-1">
          <button
            type="button"
            onClick={() => setActiveTab?.("kinematics")}
            className={`truncate rounded-full px-4 py-2 text-sm transition-colors ${
              activeTab === "kinematics"
                ? "bg-card font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Diagnose
          </button>
          <button
            type="button"
            onClick={() => setActiveTab?.("analytics")}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
              activeTab === "analytics"
                ? "bg-card font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Medication Analytics
          </button>
        </div>
      </div>

      <label className="order-last col-span-2 flex min-w-0 items-center gap-3 rounded-full bg-shell px-5 py-3 md:order-none md:col-span-1">
        <input
          type="search"
          placeholder="Search patient or biomarker..."
          className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      </label>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <button
          type="button"
          aria-label="Call"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-10 w-10 place-items-center rounded-full bg-card text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
        </button>
        <span className="grid h-10 w-10 place-items-center rounded-full border border-primary/50 bg-card font-mono-tech text-xs text-primary">
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

function OverviewCard() {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
      <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
        Overview
        <br />
        Conditions
      </h1>
      <p className="mt-3 flex items-center gap-2 font-mono-tech text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Subject: {subject.name} ({subject.id})
      </p>

      <div className="relative mt-6">
        <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-shell/50 flex items-center justify-center p-2">
          <img
            src={handScanBase64 || handScan || "/hand-scan.png"}
            alt={`Hand tremor scan for subject ${subject.id}`}
            className="h-full w-full object-contain rounded-2xl block"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-primary/40 bg-shell/80 p-4 backdrop-blur sm:absolute sm:bottom-4 sm:left-0 sm:mt-0 sm:w-44">
          <p className="flex items-center gap-2 font-mono-tech text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Tremor Rate
          </p>
          <p className="mt-1 font-display text-3xl font-bold">
            {subject.tremorRate} <span className="text-sm text-primary">Hz</span>
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
        <span>Sampling: {subject.sampling}</span>
        <span className="text-primary">RMS {subject.rms}</span>
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
              <span
                key={i}
                style={{ height: `${h}%` }}
                className="w-2 rounded-sm bg-primary/80"
              />
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
          <p className="truncate font-display text-lg font-semibold">
            {schedule.nextCheckup}
          </p>
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
        <span className="font-mono-tech text-xs text-muted-foreground">
          {schedule.weekLabel}
        </span>
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
  const Icon = node.highlight ? Hand : node.id === "fft" ? BarChart3 : Activity;

  return (
    <article
      className={[
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border p-5",
        node.highlight ? "border-primary/60 bg-primary/10" : "border-border bg-card",
      ].join(" ")}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary">
        <Icon className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-mono-tech text-[10px] uppercase tracking-widest text-muted-foreground">
          {node.highlight ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
          <span className="truncate">{node.code}</span>
        </p>
        <p className="truncate font-display text-base font-semibold">{node.title}</p>
        <p className="truncate font-mono-tech text-xs text-primary/80">{node.subtitle}</p>
      </div>
      {node.highlight ? (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      ) : (
        <div className="shrink-0 text-right">
          <p className="font-mono-tech text-[10px] uppercase tracking-widest text-primary">
            {node.status}
          </p>
          <p className="font-mono-tech text-xs text-muted-foreground">{node.meta}</p>
        </div>
      )}
    </article>
  );
}

export default function LiveKinematics() {
  const { role, user } = useRole();
  const isDoctor = role === "doctor";
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="min-h-screen bg-[#060908] text-[#ededed] p-4 md:p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1500px] gap-6">
        <aside className="hidden w-16 shrink-0 flex-col items-center justify-between rounded-2xl bg-[#0c100e] border border-[rgba(255,255,255,0.08)] py-5 lg:flex">
          <div className="flex flex-col items-center gap-6">
            {/* T+ Brand Icon */}
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a17] border border-[rgba(255,255,255,0.08)] text-[#00e599] font-bold text-sm">
              T<span className="text-xs -ml-0.5">+</span>
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
            />
          ) : activeTab === "suggested-regimen" ? (
            <SuggestedRegimen
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              initials={user.initials}
            />
          ) : (
            <>
              <TopBar initials={user.initials} activeTab={activeTab} setActiveTab={setActiveTab} />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
                <OverviewCard />

                <div className="space-y-3">
                  <SectionTitle>Tremor Condition</SectionTitle>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {conditions.map((item) => (
                      <ConditionCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>

                {isDoctor ? (
                  <div className="space-y-3">
                    <SectionTitle>My Schedule</SectionTitle>
                    <ScheduleCard />
                  </div>
                ) : null}
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
                    {sensorNodes.map((node) => (
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
