import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Activity, TrendingUp } from "lucide-react";

export default function KinematicsGraphsPanel({
  activeGraph = "fft", // "fft" | "oscilloscope"
  setActiveGraph = () => {},
  liveImu = null,
  liveHz = "5.1",
  liveRms = "0.142g",
  conditions = [],
  psdData = null,
}) {
  // Waveform buffer for oscilloscope: Ax (red/salmon), Ay (teal/cyan), Az (light blue/cyan)
  const [waveforms, setWaveforms] = useState({
    ax: Array(40).fill(0),
    ay: Array(40).fill(0),
    az: Array(40).fill(0),
  });

  // Keep a running buffer from liveImu samples or simulated natural micro-tremor
  useEffect(() => {
    const timer = setInterval(() => {
      setWaveforms((prev) => {
        const t = Date.now() / 1000;
        const baseFreq = parseFloat(liveHz) > 0 ? parseFloat(liveHz) : 5.1;
        // Natural Parkinsonian harmonic tremor frequency formula
        const axVal =
          (liveImu?.ax ?? Math.sin(t * baseFreq * 2 * Math.PI) * 0.45 - 0.2) +
          (Math.random() - 0.5) * 0.05;
        const ayVal =
          (liveImu?.ay ?? Math.sin(t * baseFreq * 2 * Math.PI + 1.2) * 0.35 + 0.1) +
          (Math.random() - 0.5) * 0.05;
        const azVal =
          (liveImu?.az ?? Math.sin(t * baseFreq * 2 * Math.PI + 2.4) * 0.25 + 0.3) +
          (Math.random() - 0.5) * 0.05;

        return {
          ax: [...prev.ax.slice(1), axVal],
          ay: [...prev.ay.slice(1), ayVal],
          az: [...prev.az.slice(1), azVal],
        };
      });
    }, 40);

    return () => clearInterval(timer);
  }, [liveImu, liveHz]);

  // Derived kinematic values for readout pills
  const axDisplay = liveImu?.ax !== undefined ? liveImu.ax.toFixed(3) : "-0.880";
  const ayDisplay = liveImu?.ay !== undefined ? liveImu.ay.toFixed(3) : "-0.291";
  const azDisplay = liveImu?.az !== undefined ? liveImu.az.toFixed(3) : "+0.470";
  const gxDisplay = liveImu?.gx !== undefined ? liveImu.gx.toFixed(1) : "-7.5";
  const gyDisplay = liveImu?.gy !== undefined ? liveImu.gy.toFixed(1) : "-36.6";
  const gzDisplay = liveImu?.gz !== undefined ? liveImu.gz.toFixed(1) : "-25.6";
  const magDisplay = liveRms && liveRms !== "0.000g" ? liveRms.replace("g", "") : "0.009";

  // AI & Score condition lookups
  const aiCond = conditions.find((c) => c.id === "ai") || {
    value: "Parkinson's",
    tag: "CONFIRMED",
    confidence: "94.2%",
  };
  const spectralCond = conditions.find((c) => c.id === "spectral") || {
    value: "84",
    tag: "NORMAL BAND",
  };
  const updrsCond = conditions.find((c) => c.id === "updrs") || {
    value: "42",
    tag: "MODERATE",
  };

  // SVG points generator for oscilloscope
  const generatePath = (data, height, offset = 0) => {
    const width = 500;
    const len = data.length;
    const step = width / (len - 1);
    return data
      .map((val, i) => {
        const x = (i * step).toFixed(1);
        const y = (height / 2 + val * 35 + offset).toFixed(1);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <div className="space-y-4">
      {/* Upper Graph Card */}
      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-5 md:p-6 shadow-sm">
        {/* Header with Title and Next/Prev Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e599] animate-pulse" />
              <h3 className="font-display text-sm font-bold text-[#ededed]">
                {activeGraph === "fft"
                  ? "Live FFT Power Spectrum (0 – 25 Hz)"
                  : "Live 6–DOF Kinematics Oscilloscope"}
              </h3>
            </div>
            <p className="mt-0.5 font-mono-tech text-[10px] text-[#8a9992] uppercase tracking-wider">
              {activeGraph === "fft"
                ? "HIGH-RESOLUTION PSD WELCH AVERAGING • 100 HZ UART STREAM"
                : "REAL-TIME 100 HZ MPU6050 ACCELEROMETER & GYROSCOPE TRACES"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Graph Switch Button */}
            <button
              type="button"
              onClick={() => setActiveGraph(activeGraph === "fft" ? "oscilloscope" : "fft")}
              className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[#141a17] px-3 py-1 font-mono-tech text-[10px] font-semibold text-[#ededed] transition-colors hover:border-[#00e599]/50 hover:text-[#00e599]"
            >
              {activeGraph === "fft" ? (
                <>
                  <ArrowLeft className="h-3 w-3" />
                  <span>Prev Graph (Oscilloscope)</span>
                </>
              ) : (
                <>
                  <span>Next Graph (FFT)</span>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </button>

            {/* Signal Indicator */}
            {activeGraph === "fft" ? (
              <span className="font-mono-tech text-[10px] text-[#00e599] font-bold">
                — PSD Density
              </span>
            ) : (
              <div className="flex items-center gap-2 font-mono-tech text-[10px]">
                <span className="flex items-center gap-1 text-[#f87171]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#f87171]" /> Ax
                </span>
                <span className="flex items-center gap-1 text-[#2dd4bf]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]" /> Ay
                </span>
                <span className="flex items-center gap-1 text-[#38bdf8]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#38bdf8]" /> Az
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Graph Display Area */}
        <div className="relative mt-4 h-48 w-full overflow-hidden rounded-2xl bg-[#070b09] border border-[rgba(255,255,255,0.05)] p-2">
          {activeGraph === "fft" ? (
            /* ── FFT Power Spectrum Graph with highlighted PD Tremor Band (3.5 - 6.5 Hz) ── */
            <div className="relative h-full w-full">
              {/* Grid Lines */}
              <div className="absolute inset-0 grid grid-rows-3 opacity-20 pointer-events-none">
                <div className="border-b border-[rgba(255,255,255,0.2)]" />
                <div className="border-b border-[rgba(255,255,255,0.2)]" />
                <div className="border-b border-[rgba(255,255,255,0.2)]" />
              </div>

              {/* Y Axis Labels */}
              <div className="absolute left-1.5 top-1 bottom-1 flex flex-col justify-between font-mono-tech text-[9px] text-[#8a9992] pointer-events-none select-none">
                <span>0.003</span>
                <span>0.002</span>
                <span>0.001</span>
                <span>0</span>
              </div>

              {/* PD Tremor Band Highlight (3.5 - 6.5 Hz) */}
              <div
                className="absolute top-0 bottom-0 z-10 border-l border-r border-[#f59e0b]/60 bg-[#f59e0b]/10"
                style={{ left: "18%", width: "16%" }}
              >
                <span className="absolute top-1.5 left-1 font-mono-tech text-[8px] font-bold text-[#f59e0b] uppercase whitespace-nowrap">
                  PD Tremor Band (3.5 - 6.5 Hz)
                </span>
              </div>

              {/* Dynamic FFT Curve */}
              <svg viewBox="0 0 500 160" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="fftGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e599" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00e599" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M 10 150 L 30 148 L 50 142 L 70 35 L 90 85 L 110 115 L 135 105 L 160 120 L 190 125 L 240 128 L 300 130 L 380 132 L 490 132"
                  fill="none"
                  stroke="#00e599"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ) : (
            /* ── 6-DOF Kinematics Oscilloscope Waveforms ── */
            <div className="relative h-full w-full">
              {/* Oscilloscope Grid */}
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-4 opacity-15 pointer-events-none">
                {Array(32)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="border border-[rgba(255,255,255,0.2)]" />
                  ))}
              </div>

              {/* Waveform Traces */}
              <svg viewBox="0 0 500 160" preserveAspectRatio="none" className="h-full w-full">
                {/* Ax Trace (Red/Salmon) */}
                <path
                  d={generatePath(waveforms.ax, 160, 20)}
                  fill="none"
                  stroke="#f87171"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Ay Trace (Teal/Cyan) */}
                <path
                  d={generatePath(waveforms.ay, 160, -10)}
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Az Trace (Cyan) */}
                <path
                  d={generatePath(waveforms.az, 160, -35)}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Metric Pills Under Graph */}
        {activeGraph === "fft" ? (
          /* Image 3 FFT Metric Bar */
          <div className="mt-4 grid grid-cols-4 gap-2 text-center md:grid-cols-7 font-mono-tech">
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                DOMINANT
              </span>
              <span className="text-xs font-bold text-[#00e599]">{liveHz} Hz</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                PEAK PSD
              </span>
              <span className="text-xs font-semibold text-[#ededed]">0.0036</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                BAND
              </span>
              <span className="text-xs font-semibold text-[#ededed]">84.2%</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                HARMONIC
              </span>
              <span className="text-xs font-semibold text-[#ededed]">10.2 Hz</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                RESOLUTION
              </span>
              <span className="text-xs font-semibold text-[#ededed]">0.195 Hz</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                WINDOW
              </span>
              <span className="text-xs font-semibold text-[#ededed]">Hann U512</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                BAND POWER
              </span>
              <span className="text-xs font-semibold text-[#ededed]">2.81 g²</span>
            </div>
          </div>
        ) : (
          /* Image 4 Kinematics Readout Bar (AX, AY, AZ, GX, GY, GZ, |A| MAG) */
          <div className="mt-4 grid grid-cols-4 gap-2 text-center md:grid-cols-7 font-mono-tech">
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                AX (G)
              </span>
              <span className="text-xs font-bold text-[#f87171]">{axDisplay}</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                AY (G)
              </span>
              <span className="text-xs font-semibold text-[#2dd4bf]">{ayDisplay}</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                AZ (G)
              </span>
              <span className="text-xs font-semibold text-[#38bdf8]">{azDisplay}</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                GX (°/S)
              </span>
              <span className="text-xs font-semibold text-[#ededed]">{gxDisplay}</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                GY (°/S)
              </span>
              <span className="text-xs font-semibold text-[#ededed]">{gyDisplay}</span>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#070b09] p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#8a9992]">
                GZ (°/S)
              </span>
              <span className="text-xs font-semibold text-[#ededed]">{gzDisplay}</span>
            </div>
            <div className="rounded-xl border border-[#00e599]/30 bg-[#00e599]/10 p-2">
              <span className="block text-[9px] uppercase tracking-wider text-[#00e599]">
                |A| MAG
              </span>
              <span className="text-xs font-bold text-[#00e599]">{magDisplay}g</span>
            </div>
          </div>
        )}
      </section>

      {/* Row of 3 Lower Condition Cards (Matching Images 3 & 4) */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Card 1: AI Detection Confirmed (Vibrant Mint Teal Card) */}
        <article className="flex flex-col justify-between rounded-3xl border border-[#00e599] bg-[#00e599] p-5 text-[#01140e] shadow-[0_0_20px_rgba(0,229,153,0.15)]">
          <div className="flex items-start justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#01140e]/15">
              <Activity className="h-4 w-4 text-[#01140e]" />
            </div>
            <span className="rounded-full bg-[#01140e]/15 px-2.5 py-0.5 font-mono-tech text-[10px] font-bold">
              94.2%
            </span>
          </div>

          <div className="my-2">
            <p className="font-mono-tech text-[11px] font-semibold text-[#01140e]/80">
              AI Detection
            </p>
            <h4 className="font-display text-2xl font-bold tracking-tight text-[#01140e]">
              Parkinson&apos;s
            </h4>
          </div>

          <div className="flex items-center justify-between font-mono-tech text-[10px] font-bold">
            <svg viewBox="0 0 70 16" className="h-4 w-16 text-[#01140e]">
              <path
                d="M 0 8 Q 8 0 16 8 T 32 8 T 48 8 T 64 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <span className="tracking-widest uppercase">CONFIRMED</span>
          </div>
        </article>

        {/* Card 2: Tremor Band Power */}
        <article className="flex flex-col justify-between rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-5 text-[#ededed] shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#141a17] text-[#00e599] border border-[rgba(255,255,255,0.08)]">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[#141a17] px-2.5 py-0.5 font-mono-tech text-[10px] text-[#8a9992]">
              SPECTRAL
            </span>
          </div>

          <div className="my-2">
            <p className="font-mono-tech text-[11px] text-[#8a9992]">Tremor Band Power</p>
            <p className="font-display text-2xl font-bold tracking-tight text-[#ededed]">
              84 <span className="text-sm font-normal text-[#00e599]">%</span>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-end gap-1 h-4">
              {[30, 60, 90, 100, 70, 40].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1.5 rounded-sm bg-[#00e599]"
                />
              ))}
            </div>
            <span className="font-mono-tech text-[9px] uppercase tracking-wider text-[#8a9992]">
              NORMAL BAND
            </span>
          </div>
        </article>

        {/* Card 3: MDS-UPDRS Score Card */}
        <article className="flex flex-col justify-between rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0c100e] p-5 text-[#ededed] shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#141a17] text-[#00e599] border border-[rgba(255,255,255,0.08)]">
              <span className="font-mono-tech text-xs font-bold">|||</span>
            </div>
            <span className="rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-2.5 py-0.5 font-mono-tech text-[10px] font-semibold text-[#f59e0b]">
              MODERATE
            </span>
          </div>

          <div className="my-2">
            <p className="font-mono-tech text-[11px] text-[#8a9992]">Score Card</p>
            <p className="font-display text-2xl font-bold tracking-tight text-[#ededed]">
              42 <span className="text-sm font-normal text-[#8a9992]">/100</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-1.5 flex-1 rounded-full bg-[#00e599]" />
            <span className="h-1.5 flex-1 rounded-full bg-[#f59e0b]" />
            <span className="h-1.5 flex-1 rounded-full bg-[#141a17]" />
            <span className="h-1.5 flex-1 rounded-full bg-[#141a17]" />
          </div>
        </article>
      </div>
    </div>
  );
}
