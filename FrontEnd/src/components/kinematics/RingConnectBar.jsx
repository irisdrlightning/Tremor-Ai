import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Play,
  Radio,
  RefreshCw,
  Sparkles,
  Wifi,
  Zap,
} from "lucide-react";

export default function RingConnectBar({
  bluetoothState,
  liveTelemetry,
  activePatientId = "PD_01",
  onSimulatePattern = null,
}) {
  const {
    isConnected = false,
    isConnecting = false,
    error = null,
    ringId = "TremorAi-RING-7842",
    sampleCount = 0,
    connect = async () => {},
    disconnect = () => {},
  } = bluetoothState || {};

  const [showHelp, setShowHelp] = useState(false);
  const [activeSimMode, setActiveSimMode] = useState("normal");

  const handleSimulate = (mode) => {
    setActiveSimMode(mode);
    if (onSimulatePattern) {
      onSimulatePattern(mode);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-[#0c1310] via-[#0e1713] to-[#0a120f] p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
      {/* Background ambient pulse */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Device Info & Live Status Badge */}
        <div className="flex flex-wrap items-center gap-3.5">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition-all ${
              isConnected
                ? "border-primary bg-primary/20 text-primary shadow-[0_0_20px_rgba(0,229,153,0.35)]"
                : isConnecting
                ? "border-warning bg-warning/20 text-warning animate-pulse"
                : "border-border bg-shell text-muted-foreground"
            }`}
          >
            {isConnected ? (
              <BluetoothConnected className="h-6 w-6" />
            ) : isConnecting ? (
              <Radio className="h-6 w-6 animate-spin" />
            ) : (
              <Bluetooth className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-foreground">
                Tremor AI Smart Ring
              </span>
              <span className="rounded-full border border-border bg-shell px-2.5 py-0.5 font-mono-tech text-[10px] text-muted-foreground">
                {ringId || "RING-7842"}
              </span>
            </div>

            {/* Status Sub-badge */}
            <div className="mt-1 flex items-center gap-2">
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-0.5 font-mono-tech text-xs font-semibold text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  CONNECTED &amp; STREAMING (100 Hz)
                </span>
              ) : isConnecting ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-0.5 font-mono-tech text-xs font-semibold text-warning">
                  <span className="h-2 w-2 rounded-full bg-warning animate-ping" />
                  SCANNING FOR BLUETOOTH RING...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/80 px-2.5 py-0.5 font-mono-tech text-xs font-medium text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/60" />
                  BLE Standby (Physics Simulator Active)
                </span>
              )}

              {sampleCount > 0 && (
                <span className="font-mono-tech text-xs text-primary/90">
                  • {sampleCount.toLocaleString()} samples received
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Live Telemetry Tele-strip */}
        <div className="hidden items-center gap-3 rounded-2xl border border-border/60 bg-shell/70 px-4 py-2 text-xs xl:flex">
          <div className="flex items-center gap-1.5 font-mono-tech text-muted-foreground">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span>MPU-6050 6-DOF</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5 font-mono-tech text-muted-foreground">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground font-semibold">100 Hz</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5 font-mono-tech text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-primary" />
            <span>BLE Service: 4fafc201...</span>
          </div>
        </div>

        {/* Right: Actions & Scan/Connect Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isConnected ? (
            <button
              type="button"
              onClick={disconnect}
              className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/15 px-4 py-2.5 text-xs font-semibold text-destructive transition-all hover:bg-destructive/25 active:scale-95"
            >
              <BluetoothOff className="h-4 w-4" />
              Disconnect Ring
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={isConnecting}
              className="group relative flex items-center gap-2.5 rounded-2xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_25px_rgba(0,229,153,0.35)] transition-all hover:scale-105 hover:shadow-[0_0_35px_rgba(0,229,153,0.5)] active:scale-95 disabled:opacity-70"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Scanning Devices...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 transition-transform group-hover:rotate-12" />
                  <span className="tracking-wide">Scan &amp; Connect Ring</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            title="Bluetooth Setup Instructions"
            className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-shell text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={connect}
            className="underline font-semibold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Quick Help Modal/Accordion */}
      {showHelp && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-shell/90 p-4 text-xs space-y-2">
          <p className="font-semibold text-primary flex items-center gap-1.5">
            <Bluetooth className="h-4 w-4" /> Web Bluetooth Quick Pairing Guide:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Ensure your ESP32 ring is powered on via USB or LiPo battery.</li>
            <li>Use Google Chrome, Microsoft Edge, or a Web-Bluetooth capable browser.</li>
            <li>Click <strong>"Scan &amp; Connect Ring"</strong> above.</li>
            <li>Select <strong>TremorAi-RING-7842</strong> from the browser popup dialog.</li>
            <li>Live 100 Hz kinematics will stream directly to the oscilloscope and AI classifiers below.</li>
          </ol>
        </div>
      )}
    </section>
  );
}
