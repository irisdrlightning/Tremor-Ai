import React, { useRef, useEffect } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart2,
  BarChart3,
  Brain,
  Droplet,
  Filter,
  Flame,
  HeartPulse,
  Scan,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";

/**
 * 60 FPS 3-Axis Kinematic Oscilloscope
 */
export function Oscilloscope({ samples = [], latestRaw = null, isConnected = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animId;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Grid background
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      const gridSpacing = 24;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center baseline
      ctx.strokeStyle = "rgba(0, 229, 153, 0.15)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (samples.length > 1) {
        const step = width / Math.max(samples.length - 1, 1);
        const scale = 50; // pixels per g

        // Trace X (Red #F87171)
        ctx.strokeStyle = "#F87171";
        ctx.lineWidth = 2;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - (s.ax || 0) * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Trace Y (Emerald #34D399)
        ctx.strokeStyle = "#34D399";
        ctx.lineWidth = 2;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - (s.ay || 0) * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Trace Z (Cyan #38BDF8)
        ctx.strokeStyle = "#38BDF8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const x = i * step;
          const y = height / 2 - ((s.az || 0) - (isConnected ? 1.0 : 0)) * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [samples, isConnected]);

  const ax = latestRaw?.ax ?? -0.012;
  const ay = latestRaw?.ay ?? -0.008;
  const az = latestRaw?.az ?? 0.998;
  const gx = latestRaw?.gx ?? 0.0;
  const gy = latestRaw?.gy ?? 0.0;
  const gz = latestRaw?.gz ?? 0.0;
  const mag = latestRaw?.mag_dynamic ?? Math.sqrt(ax * ax + ay * ay + (az - 1) * (az - 1));

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">
              Live 6-DOF Kinematics Oscilloscope
            </h3>
            <p className="font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              Real-time 100 Hz MPU6050 Accelerometer &amp; Gyroscope Traces
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 font-mono-tech text-xs">
          <span className="flex items-center gap-1 text-[#F87171]">
            <span className="h-2 w-2 rounded-full bg-[#F87171]" /> Ax
          </span>
          <span className="flex items-center gap-1 text-[#34D399]">
            <span className="h-2 w-2 rounded-full bg-[#34D399]" /> Ay
          </span>
          <span className="flex items-center gap-1 text-[#38BDF8]">
            <span className="h-2 w-2 rounded-full bg-[#38BDF8]" /> Az
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative aspect-[16/6] w-full overflow-hidden rounded-2xl border border-border/60 bg-[#060a08]">
        <canvas
          ref={canvasRef}
          width={800}
          height={280}
          className="h-full w-full object-cover"
        />
        <div className="absolute right-3 top-3 rounded-lg border border-primary/30 bg-shell/80 px-2.5 py-1 font-mono-tech text-[11px] text-primary backdrop-blur">
          60 FPS Stream
        </div>
      </div>

      {/* Raw 6-DOF Numerical Telemetry Readouts */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-7 font-mono-tech text-xs">
        <div className="rounded-xl border border-border bg-shell/60 p-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase">Ax (g)</span>
          <p className="font-bold text-[#F87171]">{ax > 0 ? `+${ax.toFixed(3)}` : ax.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-border bg-shell/60 p-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase">Ay (g)</span>
          <p className="font-bold text-[#34D399]">{ay > 0 ? `+${ay.toFixed(3)}` : ay.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-border bg-shell/60 p-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase">Az (g)</span>
          <p className="font-bold text-[#38BDF8]">{az > 0 ? `+${az.toFixed(3)}` : az.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-border bg-shell/60 p-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase">Gx (°/s)</span>
          <p className="font-bold text-foreground">{gx.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-shell/60 p-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase">Gy (°/s)</span>
          <p className="font-bold text-foreground">{gy.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-shell/60 p-2 text-center">
          <span className="text-[10px] text-muted-foreground uppercase">Gz (°/s)</span>
          <p className="font-bold text-foreground">{gz.toFixed(1)}</p>
        </div>
        <div className="col-span-3 sm:col-span-1 rounded-xl border border-primary/40 bg-primary/10 p-2 text-center">
          <span className="text-[10px] text-primary uppercase">|a| Mag</span>
          <p className="font-bold text-primary">{mag.toFixed(3)}g</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 4 Functional Condition Biomarker Cards
 */
export function BiomarkerCards({ telemetry }) {
  const prediction = telemetry?.prediction || {
    predicted_label: "healthy",
    confidence: 0.99,
    pd_probability: 0.01,
    class_probabilities: { PD: 0.01, ET: 0.01, Physiological: 0.98 },
  };

  const severity = telemetry?.severity || {
    severity_score: 0.0,
    grade: "Minimal / None (0–10)",
    clinical_note: "Normal physiological resting baseline. No pathological tremor detected.",
  };

  const features = telemetry?.features || {
    dominant_frequency: 0.0,
    tremor_power_ratio: 0.0,
    signal_amplitude_rms: 0.012,
    jerk_rms: 0.04,
  };

  const rawDomFreq = features.dominant_frequency ?? 0.0;
  const isHealthy = (prediction.predicted_label || "").toLowerCase().includes("healthy") || (prediction.predicted_label || "").toLowerCase().includes("physio");
  const dominantHz = rawDomFreq >= 0.5 && !isHealthy ? rawDomFreq.toFixed(1) : "0.0";
  const powerRatioPct = rawDomFreq >= 0.5 && !isHealthy ? Math.round((features.tremor_power_ratio ?? 0.0) * 100) : 0;
  const confidencePct = Math.round((prediction.confidence ?? 0.99) * 100);
  const severityScore = Math.round(severity.severity_score ?? 0.0);
  const isParkinsons = !isHealthy && ((prediction.predicted_label || "").toLowerCase().includes("pd") || (prediction.predicted_label || "").toLowerCase().includes("parkinson"));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Spectral Power Ratio (4–7 Hz Band) */}
      <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 transition-all hover:border-primary/40">
        <div className="flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
            <Droplet className="h-4 w-4" />
          </span>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono-tech text-[10px] font-bold text-primary uppercase tracking-widest">
            SPECTRAL RATIO
          </span>
        </div>

        <div className="my-3">
          <p className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
            Tremor Band Power (4–7 Hz)
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-bold text-foreground">
              {powerRatioPct}
            </span>
            <span className="font-mono-tech text-sm text-primary">%</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {powerRatioPct > 0
              ? "Kinetic energy concentrated in pathological tremor window"
              : "Quiescent baseline — no energy in pathological band"}
          </p>
        </div>

        {/* 4-Band Frequency Energy Distribution */}
        <div className="space-y-1.5 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between text-[10px] font-mono-tech text-muted-foreground">
            <span>&lt;3 Hz Vol</span>
            <span className={powerRatioPct > 0 ? "text-primary font-bold" : "text-muted-foreground"}>
              {powerRatioPct}% 4–7 Hz PD
            </span>
            <span>&gt;8 Hz Post</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-shell border border-border/60">
            <div
              style={{ width: `${Math.max(5, (100 - powerRatioPct) * 0.7)}%` }}
              className="bg-secondary"
              title="Voluntary baseline movement"
            />
            <div
              style={{ width: `${powerRatioPct}%` }}
              className="bg-primary shadow-[0_0_10px_rgba(0,229,153,0.5)]"
              title="Parkinsonian Tremor Band"
            />
            <div
              style={{ width: `${Math.max(5, (100 - powerRatioPct) * 0.3)}%` }}
              className="bg-warning/70"
              title="Postural / Action Band"
            />
          </div>
        </div>
      </article>

      {/* 2. AI Kinematic Detection */}
      <article className="flex flex-col justify-between rounded-3xl border border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-card p-5 text-foreground shadow-lg shadow-primary/5">
        <div className="flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Brain className="h-4 w-4" />
          </span>
          <span className="rounded-full bg-primary/20 px-2.5 py-1 font-mono-tech text-[10px] font-bold text-primary uppercase tracking-widest">
            {confidencePct}% CONFIDENCE
          </span>
        </div>

        <div className="my-3">
          <p className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
            AI Classifier Verdict
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-primary">
            {isParkinsons ? "Parkinsonian" : "Physiological"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isParkinsons ? "Active Resting Tremor Oscillation" : "Normal Physiological Baseline"}
          </p>
        </div>

        {/* Dynamic Class Probability Meter */}
        <div className="space-y-1.5 border-t border-primary/20 pt-3">
          <div className="flex items-center justify-between text-[10px] font-mono-tech">
            <span className="text-muted-foreground">{isParkinsons ? "PD Model Prob" : "Healthy Prob"}</span>
            <span className="font-bold text-primary">{confidencePct}% Match</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-shell border border-primary/30">
            <div
              style={{ width: `${confidencePct}%` }}
              className="h-full bg-primary transition-all duration-500"
            />
          </div>
        </div>
      </article>

      {/* 3. MDS-UPDRS Motor Severity Index */}
      <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 transition-all hover:border-primary/40">
        <div className="flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-warning/15 text-warning">
            <BarChart3 className="h-4 w-4" />
          </span>
          <span className="rounded-full bg-warning/15 px-2.5 py-1 font-mono-tech text-[10px] font-bold text-warning uppercase tracking-widest">
            {severityScore === 0 ? "MINIMAL" : severity.grade ? severity.grade.split(" ")[0].toUpperCase() : "MINIMAL"}
          </span>
        </div>

        <div className="my-3">
          <p className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
            MDS-UPDRS Part III Score
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold text-foreground">
              {severityScore}
            </span>
            <span className="font-mono-tech text-sm text-muted-foreground">/ 100</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">
            {severity.clinical_note || "Normal baseline motion recorded"}
          </p>
        </div>

        {/* Severity Grade Scale Steps */}
        <div className="space-y-1.5 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between text-[10px] font-mono-tech text-muted-foreground">
            <span className={severityScore === 0 ? "text-primary font-bold" : ""}>Minimal</span>
            <span className={severityScore >= 20 && severityScore < 40 ? "text-primary font-bold" : ""}>Mild</span>
            <span className={severityScore >= 40 && severityScore < 70 ? "text-warning font-bold" : ""}>Moderate</span>
            <span className={severityScore >= 70 ? "text-destructive font-bold" : ""}>Marked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`h-2 flex-1 rounded-full ${severityScore >= 0 ? "bg-primary" : "bg-shell"}`} />
            <span className={`h-2 flex-1 rounded-full ${severityScore >= 20 ? "bg-primary" : "bg-shell"}`} />
            <span className={`h-2 flex-1 rounded-full ${severityScore >= 40 ? "bg-warning" : "bg-shell"}`} />
            <span className={`h-2 flex-1 rounded-full ${severityScore >= 70 ? "bg-destructive" : "bg-shell"}`} />
          </div>
        </div>
      </article>

      {/* 4. Dominant Frequency & RMS Wave */}
      <article className="flex flex-col justify-between rounded-3xl border border-border bg-card p-5 transition-all hover:border-primary/40">
        <div className="flex items-center justify-between">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-primary">
            <Zap className="h-4 w-4" />
          </span>
          <span className="rounded-full bg-shell border border-border px-2.5 py-1 font-mono-tech text-[10px] text-primary uppercase tracking-widest">
            {dominantHz === "0.0" ? "0.0 HZ (AT REST)" : `${dominantHz} HZ PEAK`}
          </span>
        </div>

        <div className="my-3">
          <p className="text-xs font-mono-tech uppercase tracking-wider text-muted-foreground">
            Dominant Tremor Frequency
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-3xl font-bold text-foreground">
              {dominantHz}
            </span>
            <span className="font-mono-tech text-sm text-primary">Hz</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            RMS Amplitude: {(features.signal_amplitude_rms ?? 0.012).toFixed(3)}g
          </p>
        </div>

        {/* Dynamic Wave: Flat line when 0.0 Hz at rest, sine wave when active tremor! */}
        <div className="border-t border-border/50 pt-3">
          <svg viewBox="0 0 140 22" className="h-5 w-full text-primary">
            {dominantHz === "0.0" ? (
              <path
                d="M0 11 H140"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-40"
              />
            ) : (
              <path
                d="M0 11 Q 11.6 0 23.3 11 T 46.6 11 T 70 11 T 93.3 11 T 116.6 11 T 140 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="animate-pulse"
              />
            )}
          </svg>
        </div>
      </article>
    </div>
  );
}

/**
 * Interactive FFT Power Spectral Density (PSD) Chart
 */
export function FftSpectrumChart({ spectrum, dominantFrequency = 0.0 }) {
  const freqs = spectrum?.freqs || [
    1.0, 2.0, 3.0, 4.0, 4.5, 5.0, 5.12, 5.5, 6.0, 7.0, 8.0, 9.0, 10.0, 12.0, 14.0, 16.0
  ];
  const psd = spectrum?.psd || [
    0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001
  ];

  const maxPsd = Math.max(...psd, 0.001);
  const domFreq = dominantFrequency ?? 0.0;
  const hasActivePeak = domFreq >= 0.5;

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border/80 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
            <BarChart2 className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">
              FFT Power Spectral Density (0.5 – 20.0 Hz)
            </h3>
            <p className="font-mono-tech text-[10px] uppercase tracking-wider text-muted-foreground">
              Fast Fourier Transform Welch PSD Estimation
            </p>
          </div>
        </div>

        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono-tech text-xs font-bold text-primary">
          {hasActivePeak ? `Peak Resonance: ${domFreq.toFixed(2)} Hz` : "Peak Resonance: 0.0 Hz (Baseline Quiescence)"}
        </span>
      </div>

      {/* PSD Bar Chart */}
      <div className="flex h-36 items-end gap-1.5 rounded-2xl border border-border/60 bg-[#060a08] p-4">
        {freqs.map((f, i) => {
          const val = psd[i] || 0.001;
          const heightPct = hasActivePeak
            ? Math.max(8, Math.min(100, Math.round((val / maxPsd) * 100)))
            : 8; // flat baseline when at rest
          const isPeak = hasActivePeak && Math.abs(f - domFreq) < 0.4;

          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end h-full"
            >
              {/* Tooltip on hover */}
              <div className="absolute -top-7 hidden rounded bg-shell border border-border px-1.5 py-0.5 font-mono-tech text-[9px] text-foreground group-hover:block z-20 whitespace-nowrap">
                {f}Hz: {val.toFixed(4)}
              </div>

              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  isPeak
                    ? "bg-primary shadow-[0_0_12px_rgba(0,229,153,0.7)]"
                    : hasActivePeak && f >= 4.0 && f <= 7.0
                    ? "bg-primary/60"
                    : "bg-secondary/70"
                }`}
              />

              <span className="mt-2 font-mono-tech text-[9px] text-muted-foreground">
                {i % 2 === 0 ? Math.round(f) : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between font-mono-tech text-[11px] text-muted-foreground px-2">
        <span>0 Hz (DC)</span>
        <span className="text-primary font-semibold">4–7 Hz (Pathological Parkinsonian Band)</span>
        <span>20 Hz (Nyquist Limit)</span>
      </div>
    </div>
  );
}
