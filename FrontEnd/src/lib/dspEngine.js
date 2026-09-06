/**
 * Tremor AI - Client-Side Real-Time DSP & Clinical Inference Engine
 *
 * Implements online sliding-window Fast Fourier Transform (FFT),
 * digital biomarker extraction, Parkinsonian resting tremor classification,
 * and transparent 0-100 MDS-UPDRS severity scoring directly in the browser.
 *
 * Mirrors the Python implementation in src/features.py, src/model.py, and src/severity.py.
 */

// Simple Cooley-Tukey Radix-2 FFT for powers of 2
function fftRadix2(re, im) {
  const n = re.length;
  if (n <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      let tempRe = re[i]; re[i] = re[j]; re[j] = tempRe;
      let tempIm = im[i]; im[i] = im[j]; im[j] = tempIm;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Butterfly computation
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepRe = Math.cos(angle);
    const wStepIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wRe = 1.0;
      let wIm = 0.0;
      for (let k = 0; k < half; k++) {
        const evenIdx = i + k;
        const oddIdx = i + k + half;

        const uRe = re[evenIdx];
        const uIm = im[evenIdx];
        const vRe = re[oddIdx] * wRe - im[oddIdx] * wIm;
        const vIm = re[oddIdx] * wIm + im[oddIdx] * wRe;

        re[evenIdx] = uRe + vRe;
        im[evenIdx] = uIm + vIm;
        re[oddIdx] = uRe - vRe;
        im[oddIdx] = uIm - vIm;

        const nextWRe = wRe * wStepRe - wIm * wStepIm;
        const nextWIm = wRe * wStepIm + wIm * wStepRe;
        wRe = nextWRe;
        wIm = nextWIm;
      }
    }
  }
}

export class LiveDspEngine {
  constructor(bufferSize = 256, fs = 100.0) {
    this.bufferSize = bufferSize; // Must be power of 2 for FFT (256 = 2.56 sec @ 100Hz)
    this.fs = fs;
    this.accelX = new Float32Array(bufferSize);
    this.accelY = new Float32Array(bufferSize);
    this.accelZ = new Float32Array(bufferSize);
    this.gyroX = new Float32Array(bufferSize);
    this.gyroY = new Float32Array(bufferSize);
    this.gyroZ = new Float32Array(bufferSize);
    this.sampleCount = 0;
  }

  pushSample(sample) {
    const ax = Number(sample.ax ?? sample.accelX ?? 0);
    const ay = Number(sample.ay ?? sample.accelY ?? 0);
    const az = Number(sample.az ?? sample.accelZ ?? 0);
    const gx = Number(sample.gx ?? sample.gyroX ?? 0);
    const gy = Number(sample.gy ?? sample.gyroY ?? 0);
    const gz = Number(sample.gz ?? sample.gyroZ ?? 0);

    // Shift left and append
    const n = this.bufferSize;
    this.accelX.copyWithin(0, 1);
    this.accelY.copyWithin(0, 1);
    this.accelZ.copyWithin(0, 1);
    this.gyroX.copyWithin(0, 1);
    this.gyroY.copyWithin(0, 1);
    this.gyroZ.copyWithin(0, 1);

    this.accelX[n - 1] = ax;
    this.accelY[n - 1] = ay;
    this.accelZ[n - 1] = az;
    this.gyroX[n - 1] = gx;
    this.gyroY[n - 1] = gy;
    this.gyroZ[n - 1] = gz;

    this.sampleCount++;
  }

  process() {
    const n = this.bufferSize;
    if (this.sampleCount < 30) {
      // Not enough samples yet
      return null;
    }

    // 1. Demean per axis
    let meanX = 0, meanY = 0, meanZ = 0;
    for (let i = 0; i < n; i++) {
      meanX += this.accelX[i];
      meanY += this.accelY[i];
      meanZ += this.accelZ[i];
    }
    meanX /= n; meanY /= n; meanZ /= n;

    // 2. Dynamic RMS amplitude
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const dx = this.accelX[i] - meanX;
      const dy = this.accelY[i] - meanY;
      const dz = this.accelZ[i] - meanZ;
      sumSq += (dx * dx + dy * dy + dz * dz);
    }
    const rmsAmp = Math.sqrt(sumSq / n);

    // 3. FFT on total dynamic magnitude with Hann window
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    let winEnergy = 0;
    for (let i = 0; i < n; i++) {
      const dx = this.accelX[i] - meanX;
      const dy = this.accelY[i] - meanY;
      const dz = this.accelZ[i] - meanZ;
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Hann window: 0.5 * (1 - cos(2*pi*i / (N-1)))
      const win = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
      re[i] = mag * win;
      im[i] = 0;
      winEnergy += win * win;
    }

    fftRadix2(re, im);

    // Half-spectrum PSD
    const half = n >> 1;
    const df = this.fs / n; // ~0.390625 Hz
    const psd = new Float32Array(half);
    const scale = 2.0 / (this.fs * (winEnergy || 1.0));

    for (let i = 0; i < half; i++) {
      const power = re[i] * re[i] + im[i] * im[i];
      psd[i] = power * scale;
    }

    // 4. Band Powers & Dominant Peak within physiological band (0.5 - 12.0 Hz)
    let tremorPower = 0;    // 3.5 - 6.5 Hz (Parkinsonian Rest Tremor Band)
    let voluntaryPower = 0; // 0.5 - 3.5 Hz (Voluntary & Postural Band)
    let actionPower = 0;    // 6.5 - 10.0 Hz (Essential Action Tremor Band)
    let totalBroadPower = 0;// 0.5 - 12.0 Hz
    let maxPsd = 0;
    let dominantFreq = 0.0;
    let maxVoluntaryPsd = 0;
    let voluntaryFreq = 0.8;

    for (let i = 1; i < half; i++) {
      const f = i * df;
      const p = psd[i] * df;

      if (f >= 0.5 && f <= 12.0) {
        totalBroadPower += p;
        if (psd[i] > maxPsd && p > 0.00005) {
          maxPsd = psd[i];
          dominantFreq = parseFloat(f.toFixed(1));
        }
      }

      if (f >= 3.5 && f <= 6.5) {
        tremorPower += p;
      } else if (f >= 0.5 && f < 3.5) {
        voluntaryPower += p;
        if (psd[i] > maxVoluntaryPsd) {
          maxVoluntaryPsd = psd[i];
          voluntaryFreq = parseFloat(f.toFixed(1));
        }
      } else if (f > 6.5 && f <= 10.0) {
        actionPower += p;
      }
    }

    const isStationary = totalBroadPower < 0.0004 || (rmsAmp < 0.035 && tremorPower < 0.0003);

    const powerRatio = (!isStationary && totalBroadPower > 1e-6)
      ? Math.min(1.0, tremorPower / totalBroadPower)
      : 0.0;
    const powerRatioPct = isStationary ? 0 : Math.round(powerRatio * 100);

    if (isStationary) {
      dominantFreq = 0.0;
      voluntaryFreq = 0.0;
      maxPsd = 0.0;
    }

    // 5. ML Classifier Simulation matching trained model
    let predictedLabel = "healthy";
    let pdProbability = 0.0;
    let confidence = 0.95;
    let aiTag = "HEALTHY";
    let aiValue = "Normal / Resting";
    let aiFooter = "PHYSIOLOGICAL BASELINE";

    if (isStationary) {
      predictedLabel = "healthy";
      pdProbability = 0.02;
      confidence = 0.98;
      aiTag = "HEALTHY";
      aiValue = "Normal / Resting";
      aiFooter = "PHYSIOLOGICAL BASELINE";
    } else if (dominantFreq >= 3.5 && dominantFreq <= 6.5 && (powerRatio >= 0.25 || tremorPower >= 0.0005)) {
      predictedLabel = "pd";
      pdProbability = Math.min(0.99, 0.70 + powerRatio * 0.28);
      confidence = Math.round(pdProbability * 100);
      aiTag = "PARKINSON'S";
      aiValue = "Parkinson's (PD)";
      aiFooter = `CONFIRMED ${confidence}%`;
    } else if (dominantFreq > 6.5 && dominantFreq <= 10.0 && actionPower >= 0.0006) {
      predictedLabel = "other";
      pdProbability = 0.03;
      confidence = 94;
      aiTag = "ESSENTIAL TREMOR";
      aiValue = "Essential Tremor";
      aiFooter = `ACTION TREMOR (${dominantFreq.toFixed(1)} HZ)`;
    } else {
      predictedLabel = "healthy";
      pdProbability = 0.04;
      confidence = 96;
      aiTag = "HEALTHY";
      aiValue = "Voluntary Motion";
      aiFooter = "PHYSIOLOGICAL MOVEMENT";
    }

    // 6. Transparent MDS-UPDRS Severity Score (0-100)
    // Formula from src/severity.py:
    const maxRefPower = 0.15;
    const powerScaled = Math.log10(1.0 + 100.0 * Math.max(0, tremorPower)) / Math.log10(1.0 + 100.0 * maxRefPower);
    const normPower = Math.max(0, Math.min(1.0, powerScaled));
    const normAmp = Math.max(0, Math.min(1.0, rmsAmp / 0.35));

    const rawSeverity = 100.0 * (0.40 * pdProbability + 0.35 * normPower + 0.25 * normAmp);
    let finalSeverity = 0.0;

    if (isStationary || tremorPower < 0.0008 || (rmsAmp < 0.04 && pdProbability < 0.25) || predictedLabel === "healthy") {
      finalSeverity = 0.0;
    } else if (pdProbability < 0.25) {
      finalSeverity = rawSeverity * (pdProbability / 0.25);
    } else {
      finalSeverity = rawSeverity;
    }
    finalSeverity = Math.min(100, Math.max(0, Math.round(finalSeverity)));

    let updrsTag = "MINIMAL";
    let updrsActiveSteps = 1;
    if (finalSeverity === 0) {
      updrsTag = "NOT SCORED";
      updrsActiveSteps = 0;
    } else if (finalSeverity < 20) {
      updrsTag = "MINIMAL";
      updrsActiveSteps = 1;
    } else if (finalSeverity < 40) {
      updrsTag = "MILD";
      updrsActiveSteps = 2;
    } else if (finalSeverity < 70) {
      updrsTag = "MODERATE";
      updrsActiveSteps = 3;
    } else {
      updrsTag = "SEVERE";
      updrsActiveSteps = 4;
    }

    // Power Ratio Tag
    let powerTag = "LOW";
    if (isStationary) powerTag = "PENDING";
    else if (powerRatioPct >= 65) powerTag = "HIGH";
    else if (powerRatioPct >= 35) powerTag = "MODERATE";
    else if (powerRatioPct > 0) powerTag = "LOW";
    else powerTag = "PENDING";

    // Power spectrum bar height simulations for UI
    const bar1 = Math.max(15, Math.min(100, Math.round(voluntaryPower * 1000 + 20)));
    const bar2 = Math.max(20, Math.min(100, Math.round(powerRatioPct * 0.7 + 25)));
    const bar3 = Math.max(30, Math.min(100, Math.round(powerRatioPct * 1.1 + 10)));
    const bar4 = Math.max(25, Math.min(100, Math.round(powerRatioPct * 1.25)));
    const bar5 = Math.max(20, Math.min(100, Math.round(powerRatioPct * 0.8 + 15)));
    const bar6 = Math.max(15, Math.min(100, Math.round(25)));

    return {
      dominantFreq: dominantFreq > 0 ? dominantFreq.toFixed(2) : "0.00",
      peakPsd: (!isStationary && maxPsd > 0) ? maxPsd.toFixed(4) : "0.0000",
      rms: rmsAmp.toFixed(3) + "g",
      tremorPower,
      powerRatio: powerRatioPct,
      voluntaryFreq: voluntaryFreq.toFixed(1),
      severityScore: finalSeverity,
      predictedLabel,
      confidence,
      psdCurve: Array.from(psd.slice(0, 64)), // 0 to 25 Hz bins
      conditions: [
        {
          id: "spectral",
          tag: powerTag,
          icon: "droplet",
          label: "Power Ratio",
          value: String(powerRatioPct),
          unit: "%",
          variant: "bars",
          bars: [bar1, bar2, bar3, bar4, bar5, bar6],
        },
        {
          id: "ai",
          tag: aiTag,
          icon: "scan",
          label: "AI Detection",
          value: aiValue,
          footer: aiFooter,
          variant: "highlight",
        },
        {
          id: "updrs",
          tag: updrsTag,
          icon: "chart",
          label: "MDS-UPDRS",
          value: String(finalSeverity),
          unit: "/100",
          variant: "steps",
          activeSteps: updrsActiveSteps,
        },
        {
          id: "noise",
          tag: !isStationary && voluntaryPower > 0.001 ? "FILTERED" : "BASELINE",
          icon: "funnel",
          label: "Voluntary Noise",
          value: isStationary ? "0.0" : voluntaryFreq.toFixed(1),
          unit: "Hz",
          variant: "dots",
        },
      ],
    };
  }
}
