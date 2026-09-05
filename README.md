# Tremor Ai — AI Wearable Tremor Screening & Longitudinal Medication Monitoring System

> [!IMPORTANT]
> **Clinical Scope Disclaimer**: Tremor Ai is an investigational screening and longitudinal monitoring aid, **not** a diagnostic medical device. It does not provide medical diagnosis, treatment recommendations, or pharmacological dosage advice. All classification probabilities, severity scores, longitudinal fluctuation trends, and medication response patterns are correlational decision-support markers intended solely for clinical review by a licensed neurologist or attending physician.
>
> **30-Day Timeline Simulation Notice**: Standardized public clinical datasets (such as PADS and UCI) consist of brief, single-session clinical recordings. The 30-day timeline in `src/longitudinal_sim.py` models diurnal circadian variation, scheduled medication doses, and progressive wearing-off kinetics based on standardized baseline measurements. Physical hardware checkpoints logged via the live sensor are anchored directly into this timeline as verified clinical ground truth.

---

## Table of Contents
1. [System Architecture & Overview](#1-system-architecture--overview)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [What We Analyse: Biomechanical & Clinical Parameters](#3-what-we-analyse-biomechanical--clinical-parameters)
4. [Clinical Discrimination & Filtering Logic](#4-clinical-discrimination--filtering-logic)
5. [Transparent 0–100 Severity Index Formula](#5-transparent-0100-severity-index-formula)
6. [Medication-Effectiveness & Longitudinal Analysis Engine](#6-medication-effectiveness--longitudinal-analysis-engine)
7. [How It Works: Step-by-Step Data Flow](#7-how-it-works-step-by-step-data-flow)
8. [The Three Dashboard Operating Modes](#8-the-three-dashboard-operating-modes)
9. [Hardware Bring-Up & Wiring Diagram](#9-hardware-bring-up--wiring-diagram)
10. [Quickstart & Installation](#10-quickstart--installation)
11. [Automated Test Suite](#11-automated-test-suite)
12. [Repository Structure](#12-repository-structure)

---

## 1. System Architecture & Overview

Tremor Ai is an end-to-end medical AI application designed around a wearable smart-ring or wristband concept. Equipped with an **InvenSense MPU6050 6-DoF inertial measurement unit (IMU)**, it streams real-time acceleration and angular velocity at **100 Hz** to an **ESP32 microcontroller**, which transfers telemetry over USB Serial (UART) to a laptop running the Python-based Tremor Ai Core Engine.

The system performs zero-phase bandpass filtering, Hann-windowed Fast Fourier Transform (FFT) power spectral density estimation, extraction of 9 digital biomarkers, dual-model machine learning inference (Random Forest primary with Support Vector Classifier validation), continuous 0–100 severity scoring, 30-day longitudinal motor fluctuation tracking, and automated clinical PDF report generation.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 MPU6050 6-DoF Sensor                     │
                  │       (100 Hz Accel: +/- 2g | Gyro: +/- 250 deg/s)      │
                  └────────────────────────────┬────────────────────────────┘
                                               │ I2C Fast-Mode (GPIO21 / GPIO22, 400 kHz)
                  ┌────────────────────────────▼────────────────────────────┐
                  │               ESP32 Telemetry Firmware                  │
                  │    tremor_ai_esp32.ino (115200 baud USB Serial CSV)     │
                  └────────────────────────────┬────────────────────────────┘
                                               │ USB Serial UART (COM4)
┌──────────────────────────────────────────────▼──────────────────────────────────────────────┐
│                                  TREMOR AI CORE ENGINE                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Ingestion & Buffering: hardware/bridge/serial_bridge.py (300-sample circular buffer)     │
│ 2. Preprocessing: src/preprocessing.py (Butterworth 0.5-20 Hz zero-phase, gravity removal)  │
│ 3. Digital Biomarkers: src/features.py (Hann FFT, 4-6 Hz band, kinematic jerk, entropy)    │
│ 4. AI Classification: src/model.py (Quiescence gate, voluntary movement filter, RF + SVC)   │
│ 5. Severity Scoring: src/severity.py (Transparent 0-100 score: Model 40%, PSD 35%, RMS 25%)│
│ 6. Medication Engine: src/effectiveness.py (Pre/post-dose delta, wearing-off regression)    │
│ 7. Checkpoint Manager: src/checkpoint_manager.py (Thread-safe live hardware JSON store)     │
│ 8. Longitudinal Sim: src/longitudinal_sim.py (Diurnal curves, doses, flare-day detection)   │
│ 9. Automated Reports: src/report.py & src/doctor_report.py (ReportLab publication PDFs)     │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                ┌──────────────┴──────────────┐
                                │                             │
                 ┌──────────────▼──────────────┐┌─────────────▼──────────────┐
                 │   Streamlit Web Dashboard   ││    Automated PDF Reports   │
                 │    app/streamlit_app.py     ││  1. Single-Session PDF     │
                 │  - Tab 1: Single Session    ││     (src/report.py)        │
                 │  - Tab 2: 30-Day Monitor    ││  2. Monthly Doctor PDF     │
                 │  - Tab 3: Live HW Stream    ││     (src/doctor_report.py) │
                 └─────────────────────────────┘└────────────────────────────┘
```

---

## 2. Complete Technology Stack

| Layer | Technology | Version / Spec | Purpose & Implementation Details |
|:---|:---|:---|:---|
| **Sensor Hardware** | InvenSense MPU6050 | 6-DoF MEMS IMU | Triple-axis accelerometer ($\pm 2\text{ g}$) and gyroscope ($\pm 250^\circ/\text{s}$). Low-noise MEMS sensor mounted on wearable ring/wristband prototype. |
| **Microcontroller** | Espressif ESP32-WROOM-32 | Xtensa Dual-Core 240 MHz | Hardware I2C master running FreeRTOS. Polls sensor registers at strictly regulated 100 Hz timer intervals ($10\text{ ms}$). |
| **Embedded Firmware** | C++ / Arduino Framework | `tremor_ai_esp32.ino` | Configures Wire library to Fast-Mode I2C ($400\text{ kHz}$). Formats raw telemetry into high-throughput CSV over hardware UART (`115200` baud). |
| **Serial Communication** | PySerial & Background Daemon | Python 3.11+ / PySerial 3.5 | Ingests live UART serial stream. Maintains a sliding circular buffer of 300 samples ($3.0\text{ s}$). Atomically writes real-time features to `data/live_telemetry.json`. |
| **Signal Processing** | NumPy & SciPy Signal | `scipy.signal` & `scipy.fft` | 4th-order zero-phase Butterworth bandpass filter ($0.5 - 20.0\text{ Hz}$) via `sosfiltfilt`. Static $1\text{g}$ gravity compensation. Hann windowing (`np.hanning`) to prevent spectral leakage in real FFT (`rfft`). |
| **Machine Learning** | Scikit-learn & Joblib | `scikit-learn` 1.6+ | **Random Forest Classifier** (120 estimators, primary) and **Support Vector Classifier** (Calibrated Linear SVC, secondary). 5-fold stratified cross-validation. `StandardScaler` feature normalization. Joblib artifact serialization. |
| **Live Checkpoints** | Checkpoint Manager | `src/checkpoint_manager.py` | Thread-safe atomic JSON storage (`data/live_checkpoints.json`). Anchors physical sensor readings directly into the patient's 30-day longitudinal timeline as clinical ground truth. |
| **Web Dashboard** | Streamlit | `streamlit` 1.63+ | Interactive clinical dashboard with custom medical CSS typography. Uses `@st.fragment` WebSocket auto-refresh for zero-flicker $100\text{ Hz}$ live streaming. |
| **Data Visualization** | Plotly Graph Objects | `plotly.graph_objects` | Dynamic dual-axis time-series waveforms, shaded 4.0–6.0 Hz tremor band power spectrum curves, interactive radial severity gauges, and 30-day symptom fluctuation charts with dose overlays and gold-star physical checkpoints. |
| **Clinical Reporting** | ReportLab Platypus | `reportlab` 4.x | Generates publication-grade, multi-page vector clinical PDFs. Integrates patient demographics, biomarker tables, clinical explanations, non-diagnostic disclaimers, and high-res in-memory Matplotlib figures. |
| **Test Suite** | Pytest | `pytest` 9.x / `anyio` | 14 automated unit and integration tests validating filter attenuation, FFT peak isolation, quiescence gating, voluntary movement discrimination, severity monotonicity, medication deltas, and PDF export integrity. |

---

## 3. What We Analyse: Biomechanical & Clinical Parameters

Tremor AI continuously segments motion into **3.0-second sliding windows** (300 samples at 100 Hz, with a 50% overlap / 1.5-second step) and extracts **9 physiological digital biomarkers**:

### 1. Dominant Frequency ($f_{\text{dom}}$)
- **Definition**: The frequency corresponding to the maximum Power Spectral Density (PSD) peak within the clinically significant movement range ($0.8 - 12.0\text{ Hz}$).
- **Clinical Relevance**: Parkinson's resting tremor possesses a distinctive, highly regular biological rhythm centered strictly between **3.8 Hz and 6.2 Hz** (classically 4.0–6.0 Hz). Voluntary movements peak at low frequencies ($0.8 - 2.5\text{ Hz}$), whereas Essential Tremor typically manifests at higher frequencies ($6.8 - 12.0\text{ Hz}$).

### 2. Tremor-Band Power ($P_{\text{tremor}}$)
- **Definition**: The integrated power spectral density in the 4.0–6.0 Hz band:
  $$P_{\text{tremor}} = \int_{4.0}^{6.0} \text{PSD}(f) \, df \approx \sum_{f_i \in [4, 6]} \text{PSD}(f_i) \cdot \Delta f \quad (\text{g}^2/\text{Hz})$$
- **Clinical Relevance**: Quantifies the absolute mechanical energy generated by Parkinsonian resting tremor oscillations.

### 3. Tremor Power Ratio ($R_{\text{tremor}}$)
- **Definition**: The proportion of total broadband motion energy ($0.5 - 15.0\text{ Hz}$) concentrated specifically inside the 4.0–6.0 Hz tremor window:
  $$R_{\text{tremor}} = \frac{P_{\text{tremor}}}{P_{\text{broadband}}} \in [0.0, 1.0]$$
- **Clinical Relevance**: Essential for discriminating true rhythmic resting tremors (where $R_{\text{tremor}} \ge 0.28$, often reaching $0.60 - 0.85$) from voluntary gestures or broad hand movements (where energy is dispersed across multiple frequencies and $R_{\text{tremor}} < 0.20$).

### 4. Dynamic Amplitude RMS ($A_{\text{RMS}}$)
- **Definition**: The root-mean-square magnitude of bandpass-filtered, gravity-compensated dynamic acceleration:
  $$A_{\text{RMS}} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} a_{\text{dynamic}}[i]^2} \quad (\text{g})$$
- **Clinical Relevance**: Reflects the instantaneous physical amplitude and excursion of hand oscillations. Resting baseline in a motionless sensor is $< 0.035\text{ g}$.

### 5. Peak-to-Peak Amplitude ($A_{\text{p2p}}$)
- **Definition**: The maximum excursion range ($a_{\max} - a_{\min}$) across the window ($g$).
- **Clinical Relevance**: Captures sudden kinematic bursts and peak excursion limits of tremor cycles.

### 6. Kinematic Jerk RMS ($J_{\text{RMS}}$)
- **Definition**: The root-mean-square of the first time-derivative of acceleration:
  $$J[i] = \frac{a_{\text{dynamic}}[i+1] - a_{\text{dynamic}}[i]}{\Delta t}, \quad J_{\text{RMS}} = \sqrt{\frac{1}{N-1} \sum_{i=1}^{N-1} J[i]^2} \quad (\text{g/s})$$
- **Clinical Relevance**: Quantifies the abruptness and mechanical sharpness of micro-tremor reversals. Parkinsonian tremors exhibit elevated jerk compared to smooth voluntary reach movements.

### 7. Spectral Shannon Entropy ($H_{\text{spectral}}$)
- **Definition**: The normalized Shannon entropy of the power spectrum:
  $$p_i = \frac{\text{PSD}(f_i)}{\sum_j \text{PSD}(f_j)}, \quad H = -\frac{\sum p_i \log_2(p_i)}{\log_2(M)} \in [0.0, 1.0]$$
- **Clinical Relevance**: Measures spectral disorder. A highly organized, monomorphic sinusoidal tremor yields low entropy ($0.15 - 0.45$), whereas stochastic sensor noise, irregular voluntary movement, or ataxia yields high entropy ($0.70 - 1.0$).

### 8. Gyroscope Tremor Power ($P_{\text{gyro}}$)
- **Definition**: Integrated rotational power spectral density in the 4.0–6.0 Hz band derived from the angular velocity magnitude ($(\text{deg}/\text{s})^2/\text{Hz}$).
- **Clinical Relevance**: Isolates rotational pronation-supination ("pill-rolling") tremor components characteristic of Parkinson's disease.

### 9. Harmonic Ratio ($R_{\text{harm}}$)
- **Definition**: Ratio of power in the second harmonic band ($8.0 - 12.0\text{ Hz}$) relative to the fundamental tremor band ($4.0 - 6.0\text{ Hz}$).
- **Clinical Relevance**: Detects non-linear harmonic distortion resulting from biomechanical limb resonance and muscle co-contraction.

---

## 4. Clinical Discrimination & Filtering Logic

To prevent false-positive classifications caused by sensor resting noise, typing, putting on gloves, or voluntary hand gestures, Tremor AI employs a multi-tiered clinical gating architecture:

```
                            Raw 100 Hz Window (3.0s)
                                      │
                                      ▼
                        [ Quiescence Noise Floor Gate ]
                         Total Power < 0.0005 g^2 OR
                         (RMS < 0.035g AND P_tremor < 0.0008)
                                     / \
                               YES  /   \  NO
                                   /     \
                                  ▼       ▼
                       HEALTHY (Baseline)  [ High-Frequency Check ]
                       - Conf: 99.0%        Dominant Freq >= 6.8 Hz
                       - PD Prob: 0.0%             / \
                       - Severity: 0.0 / 100  YES /   \  NO
                                                 /     \
                                                ▼       ▼
                                         OTHER / ET    [ Voluntary Motion Gate ]
                                         - Conf: 95.0%  Dom Freq < 3.8 Hz OR
                                         - PD: 0.02     Tremor Ratio < 0.28 OR
                                                        P_tremor < 0.0010 g^2
                                                              / \
                                                        YES  /   \  NO
                                                            /     \
                                                           ▼       ▼
                                                HEALTHY (Voluntary) [ Scikit-Learn Model ]
                                                - Conf: 99.0%        Random Forest Inference
                                                - PD Prob: 0.0%      - Class Probabilities
                                                - Severity: 0.0/100  - Model Severity Score
```

### 1. Stationary Resting Baseline / Quiescence Gate
- **Condition**: Broadband power $< 0.0005\text{ g}^2$ OR ($\text{RMS} < 0.035\text{ g}$ and $P_{\text{tremor}} < 0.0008\text{ g}^2/\text{Hz}$).
- **Action**: Overrides dominant frequency to $0.00\text{ Hz}$. Classified as **Healthy (Resting Baseline)** with $99.0\%$ confidence and $0.0\%$ PD probability. Severity is clamped to **`0.0 / 100`**.

### 2. High-Frequency Tremor Gate (Essential Tremor)
- **Condition**: Dominant frequency $f_{\text{dom}} \ge 6.8\text{ Hz}$.
- **Action**: Classified as **Other Movement Disorder (Essential Tremor)** with $95.0\%$ confidence and $0.02$ PD probability.

### 3. Voluntary Movement & Glove-Wearing Discrimination
- **Condition**: Dominant frequency $f_{\text{dom}} < 3.8\text{ Hz}$ (voluntary hand gestures typically peak at $0.8 - 2.5\text{ Hz}$) OR Tremor Power Ratio $R_{\text{tremor}} < 0.28$ (power distributed across broad non-rhythmic frequencies) OR $P_{\text{tremor}} < 0.0010\text{ g}^2/\text{Hz}$.
- **Action**: Classified as **Healthy (Voluntary Movement / Active Baseline)** with $99.0\%$ confidence and $0.0\%$ PD probability. Severity score is zeroed to **`0.0 / 100`** ("Minimal / Negligible Tremor").

### 4. Pathological Parkinsonian Tremor Confirmation
- **Condition**: Dominant frequency strictly inside $3.8 - 6.2\text{ Hz}$, tremor power ratio $\ge 0.28$, tremor power $\ge 0.0010\text{ g}^2/\text{Hz}$, accompanied by low spectral entropy.
- **Action**: Evaluated by the trained Random Forest model. Output class: **Parkinson's (PD)**, with severity computed proportionally from model confidence, log-scaled tremor power, and dynamic RMS.

---

## 5. Transparent 0–100 Severity Index Formula

Unlike "black-box" clinical scores, Tremor AI computes an open, mathematically documented **0–100 Parkinsonian Tremor Severity Index** that mirrors the clinician's MDS-UPDRS Part III resting tremor grading criteria.

### Mathematical Formulation
$$\text{Raw Severity} = 100 \times \left(0.40 \cdot P_{\text{PD}} + 0.35 \cdot \tilde{P}_{\text{tremor}} + 0.25 \cdot \tilde{A}_{\text{RMS}}\right)$$

Where:
1. **$P_{\text{PD}} \in [0.0, 1.0]$** (40% Weight): Calibrated Random Forest model probability of Parkinsonian resting tremor pattern match.
2. **$\tilde{P}_{\text{tremor}} \in [0.0, 1.0]$** (35% Weight): Logarithmically scaled tremor-band power relative to clinical reference maximum ($0.15\text{ g}^2/\text{Hz}$):
   $$\tilde{P}_{\text{tremor}} = \text{clip}\left(\frac{\log_{10}(1.0 + 100 \cdot P_{\text{tremor}})}{\log_{10}(1.0 + 100 \cdot 0.15)}, \, 0.0, \, 1.0\right)$$
3. **$\tilde{A}_{\text{RMS}} \in [0.0, 1.0]$** (25% Weight): Linearly normalized dynamic acceleration RMS relative to clinical reference ceiling ($0.35\text{ g}$):
   $$\tilde{A}_{\text{RMS}} = \text{clip}\left(\frac{A_{\text{RMS}}}{0.35}, \, 0.0, \, 1.0\right)$$

### Specificity Damping Penalty
If $P_{\text{PD}} \le 0.05$, $P_{\text{tremor}} < 0.0008\text{ g}^2/\text{Hz}$, or the predicted label is `healthy`, severity is strictly **`0.0`**. If $P_{\text{PD}} < 0.25$, a linear damping penalty is applied ($\text{Damping} = P_{\text{PD}} / 0.25$) to eliminate false-positive severity spikes from non-rhythmic voluntary motion.

### MDS-UPDRS Stratification Scale
| Severity Score | Clinical Grade | MDS-UPDRS Part III Equivalent | Clinical Phenotype Description |
|:---:|:---|:---:|:---|
| **0.0 – 19.9** | **Minimal / Negligible** | Score 0 (Normal) | Physiological resting baseline or voluntary gestures. No sustained 4–6 Hz rhythmic oscillation. |
| **20.0 – 39.9** | **Mild** | Score 1 (Slight) | Low-amplitude intermittent 4–6 Hz periodic oscillations with spontaneous damping. |
| **40.0 – 69.9** | **Moderate** | Score 2 (Mild-Mod) | Noticeable, sustained 4–6 Hz resting tremor with a distinct spectral resonance peak. |
| **70.0 – 100.0** | **Marked / Severe** | Score 3–4 (Severe) | High-amplitude continuous resting tremor with pronounced kinematic jerk and harmonic distortion. |

---

## 6. Medication-Effectiveness & Longitudinal Analysis Engine

Patients with Parkinson's disease on dopaminergic therapy (e.g., Levodopa/Carbidopa) experience significant motor fluctuations throughout the day and across multi-week intervals. Tremor AI's medication engine (`src/effectiveness.py`) monitors these dynamics automatically:

### 1. Pre/Post-Dose Response Pairing
For each scheduled dose event (e.g. 08:00 Morning, 13:00 Midday, 18:00 Evening):
- **Pre-Dose Window**: Ingests telemetry $15 - 75\text{ minutes}$ prior to the dose timestamp.
- **Post-Dose Window**: Ingests telemetry $30 - 105\text{ minutes}$ post-dose (corresponding to peak plasma concentration $T_{\max}$).
- **Therapeutic Delta**:
  $$\Delta \text{Severity} = \text{Severity}_{\text{pre}} - \text{Severity}_{\text{post}}, \quad \text{Drop \%} = \frac{\Delta \text{Severity}}{\text{Severity}_{\text{pre}}} \times 100\%$$
- A dose is flagged as **Effective** if $\Delta \text{Severity} > 0$ and $\text{Drop \%} \ge 15.0\%$.

### 2. Longitudinal Wearing-Off Trend (Linear Regression)
Evaluates whether therapeutic benefit diminishes over the 30-day timeline by fitting an Ordinary Least Squares (OLS) regression line across daily point reductions:
$$\Delta \text{Severity}(t) = \beta \cdot t + \alpha$$
- **$\beta < -0.25\text{ pts/day}$**: Flags a significant **Wearing-Off Pattern**, indicating that the therapeutic window is shortening and symptoms re-emerge prematurely before the next scheduled dose.

### 3. Acute Flare-Day Anomaly Detection
Calculates the patient's 30-day rolling baseline mean ($\mu$) and standard deviation ($\sigma$). Any day where the 24-hour mean severity exceeds:
$$\text{Threshold} = \mu + 1.8 \cdot \sigma$$
is automatically flagged as an **Acute Flare Day** for clinical inquiry (potential triggers include systemic infection, missed medication, acute emotional stress, or sleep deprivation).

### 4. Structured Clinical Decision-Support Verdicts
- **`Likely Effective`** (Confidence 75–96%): Response rate $\ge 68\%$, mean severity drop $\ge 15\%$, stable therapeutic window.
- **`Reduced Effectiveness Detected`** (Confidence 70–94%): Significant wearing-off regression slope or substantial drop in second-half efficacy.
- **`Inconclusive`** (Confidence 55%): Variable motor response or insufficient dose-aligned telemetry.

---

## 7. How It Works: Step-by-Step Data Flow

```
[1. Hardware Stream]  MPU6050 (100 Hz Accel/Gyro) -> ESP32 I2C -> USB UART (COM4)
         │
[2. Ingestion Bridge]  serial_bridge.py reads CSV, updates 300-sample circular buffer
         │
[3. Preprocessing]     src/preprocessing.py:
                       - 4th-order zero-phase Butterworth bandpass (0.5 - 20 Hz)
                       - Static 1g gravity compensation
         │
[4. Windowing]         Segment into 3.0s windows (300 samples, 50% overlap)
         │
[5. FFT & Features]    src/features.py:
                       - Hann window + rfft -> Power Spectral Density (PSD)
                       - 9 biomarkers: f_dom, P_tremor, R_tremor, RMS, Jerk, Entropy...
         │
[6. Clinical Filters]  src/model.py:
                       - Quiescence gate (< 0.035g -> 0.00 Hz, Healthy)
                       - Voluntary movement gate (< 3.8 Hz / R_tremor < 0.28 -> Healthy)
         │
[7. Machine Learning]  Scikit-Learn Random Forest (120 trees) + Scaler:
                       - P_PD probability, class probabilities, confidence
         │
[8. Severity Engine]   src/severity.py:
                       - Transparent score: 40% Model + 35% PSD + 25% RMS
                       - MDS-UPDRS clinical stratification (0-100)
         │
[9. Dual Delivery]     ┌────────────────────────────────────────────────────────┐
                       │ A. Streamlit Web UI (app/streamlit_app.py):            │
                       │    - Tab 1: Single Session Waveform & Spectrum         │
                       │    - Tab 2: 30-Day Longitudinal Fluctuation & Doses    │
                       │    - Tab 3: Real-Time Live Hardware Telemetry Fragment │
                       ├────────────────────────────────────────────────────────┤
                       │ B. Clinical PDF Reports:                               │
                       │    - Single-Session Report (src/report.py)             │
                       │    - Monthly Doctor Consultation (src/doctor_report.py)│
                       └────────────────────────────────────────────────────────┘
```

---

## 8. The Three Dashboard Operating Modes

All three dashboard modes are fully integrated with both stored clinical datasets and the live physical hardware stream:

### Tab 1: 📊 Single-Session Analysis
- **Data Source Switcher**: Toggle seamlessly between:
  - Dataset Clinical Profiles (`PD_01` to `PD_06`, `HC_01` to `HC_05`, `ET_01` to `ET_03`).
  - `⚡ Live Physical Hardware Stream (ESP32 / COM4)` for instant single-session analysis of real-time sensor data.
- **Interactive Dual-Axis Waveform**: Zoom, pan, and inspect dynamic acceleration ($a_x, a_y, a_z$ and magnitude).
- **Power Spectral Density Chart**: High-resolution FFT spectrum displaying the shaded 4.0–6.0 Hz Parkinsonian tremor band and peak resonance frequency callout.
- **Radial Severity Gauge**: Visualizes the 0–100 severity index with colored MDS-UPDRS zones and exact contribution breakdown (Model Prob %, Tremor Power %, Amplitude %).
- **1-Click PDF Export**: Generates and downloads a publication-grade single-session clinical report (`TremorAI_LiveSessionReport_<ID>_<Timestamp>.pdf`).

### Tab 2: 📈 30-Day Longitudinal Monitoring Mode
- **Longitudinal Fluctuation Chart**: Multi-trace 30-day symptom fluctuation curve with morning (08:00), midday (13:00), and evening (18:00) medication dose overlays.
- **Live Hardware Patient Profile**: Select `⚡ LIVE HARDWARE PATIENT (Anchored to COM4 Sensor)`.
- **Physical Checkpoint Logger**: Click **"📌 Log Current Sensor Reading as Checkpoint"** to record live physical readings into `data/live_checkpoints.json`.
- **Gold Star Overlay**: Logged physical checkpoints are immediately displayed on the Plotly chart as gold stars (`⭐ Live Sensor Checkpoint (COM4)`), serving as clinical ground truth amidst the longitudinal curve.
- **Live Checkpoints Audit Table**: Displays timestamp, acceleration RMS, severity score, and verified hardware provenance (`ESP32 / MPU6050 (COM4)`).
- **Medication-Effectiveness Engine**: Displays automated decision verdict, response rate %, wearing-off regression slope, and acute flare-day alerts.
- **Baseline Comparison Table**: Contrasts Week 1 therapeutic response against Week 4.
- **Export Doctor Consultation Report**: Generates `TremorAI_MonthlyLiveReport_<PatientID>_<Timestamp>.pdf` containing longitudinal analytics and the live physical checkpoints table.

### Tab 3: ⚡ Live Hardware Stream (Real-Time Sensor Telemetry)
- **Zero-Flicker WebSocket Fragment**: Powered by `@st.fragment`, streaming live data at 100 Hz without refreshing the wider dashboard.
- **Live Waveform & FFT Spectrum**: Real-time updating time-series acceleration and power spectrum with highlighted 4–6 Hz tremor band.
- **Clinical Classification & Severity Card**: Live status, predicted label, confidence, dominant frequency, dynamic RMS, and severity score.
- **Instant Live Session PDF**: Click **"📄 Generate Live Session PDF"** to create an immediate clinical report from the active hardware buffer.
- **Instant Checkpoint Logger**: Click **"📌 Log Reading to 30-Day Monitor"** to append the live physical reading to the 30-day longitudinal timeline.
- **Hardware Connection Wizard**: Provides step-by-step guidance to launch or restart the serial bridge if the device is disconnected.

---

## 9. Hardware Bring-Up & Wiring Diagram

The physical system uses an InvenSense MPU6050 6-DoF sensor wired to an ESP32 development board.

### Pin-by-Pin Wiring Table
| MPU6050 Pin | ESP32 Pin | Function / Wire Color | Notes |
|:---|:---|:---|:---|
| **VCC** | **3.3V** | Red | Power sensor via 3.3V pin to prevent damage to MEMS registers. |
| **GND** | **GND** | Black | Common ground reference. |
| **SCL** | **GPIO 22** | Yellow | I2C Clock line (Fast-Mode 400 kHz). |
| **SDA** | **GPIO 21** | Green | I2C Data line. |
| **AD0** | **GND** | Blue | Sets I2C 7-bit device address to `0x68`. |

### Flashing Firmware (`hardware/firmware/tremor_ai_esp32.ino`)
1. Connect ESP32 to laptop via micro-USB or USB-C cable.
2. Open `hardware/firmware/tremor_ai_esp32.ino` in the Arduino IDE.
3. Select board: **Tools > Board > ESP32 Arduino > ESP32 Dev Module**.
4. Select the corresponding USB COM port (e.g. `COM4`).
5. Click **Upload**.
6. The on-board LED will illuminate solid blue upon successful MPU6050 detection.
7. Open Serial Monitor at `115200` baud to verify the 100 Hz CSV output:
   ```csv
   timestamp_ms,ax,ay,az,gx,gy,gz
   10240,0.0142,-0.0381,0.9841,1.1,-0.4,0.7
   ```

### Running Laptop-Side Serial Bridge (`hardware/bridge/serial_bridge.py`)
```bash
# Physical Hardware connected on COM4:
python hardware/bridge/serial_bridge.py --port COM4 --baud 115200

# Zero-Hardware Simulation Fallback Mode:
python hardware/bridge/serial_bridge.py --simulate --shake-mode pd
```
> [!NOTE]
> `serial_bridge.py` directly imports the exact same preprocessing, feature extraction, and ML inference modules as the web application. Zero signal processing or classification logic is duplicated.

---

## 10. Quickstart & Installation

### Prerequisites
- Python 3.11+ (Tested on Python 3.11, 3.12, 3.13, 3.14 on Windows, macOS, and Linux).
- USB Serial Port access (for physical hardware).

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/tremor-ai.git
cd tremor-ai
pip install -r requirements.txt
```

### 2. Launch Streamlit Web Dashboard
```bash
python -m streamlit run app/streamlit_app.py
```
Open your browser at **`http://localhost:8501`**.

---

## 11. Automated Test Suite

Tremor AI includes an automated test suite with **16 unit and integration tests** covering all mathematical, clinical, and hardware bridge functions:

```bash
python -m pytest tests/ -v
```

### Test Coverage Summary:
1. `tests/test_preprocessing.py`:
   - `test_compute_magnitudes`: Validates Euclidean vector norm for 3-axis acceleration and gyroscope.
   - `test_butter_bandpass_filter_attenuates_dc_and_high_freq`: Verifies 4th-order zero-phase filter attenuates DC gravity ($0\text{ Hz}$) and high-frequency noise ($35\text{ Hz}$) by $> 20\text{ dB}$.
   - `test_segment_into_windows`: Validates 3.0s window length (300 samples) and 50% step size.
2. `tests/test_features.py`:
   - `test_synthetic_5hz_tremor_isolated_in_4_to_6_hz_band`: Asserts that a pure 5.0 Hz tremor concentrates $> 60\%$ of spectral energy in the 4–6 Hz band with dominant peak at $5.00 \pm 0.15\text{ Hz}$.
   - `test_healthy_noise_has_low_tremor_ratio`: Asserts that Gaussian noise yields tremor power ratio $< 0.25$.
   - `test_voluntary_glove_motion_not_classified_as_pd`: Verifies that voluntary movement ($0.8 - 2.5\text{ Hz}$, $0.15\text{ g}$) simulating glove-wearing or gestures is correctly classified as **`HEALTHY`** with **`0.0 / 100`** severity.
3. `tests/test_severity.py`:
   - `test_severity_bounds_and_components`: Verifies score is strictly bounded in $[0.0, 100.0]$, satisfies monotonicity, and applies confidence damping.
4. `tests/test_effectiveness.py`:
   - `test_effectiveness_analysis_produces_structured_verdict`: Validates pre/post-dose window matching, response rate calculation, wearing-off regression, and flare detection.
   - `test_empty_timeline_handled_gracefully`: Ensures graceful handling of empty or missing dose logs.
5. `tests/test_model.py`:
   - `test_model_training_and_metrics_integrity`: Trains models, evaluates 5-fold cross-validation, and verifies confusion matrix integrity.
6. `tests/test_live_hardware_integration.py`:
   - `test_live_checkpoints_lifecycle`: Tests saving, loading, and clearing live hardware checkpoints via `src/checkpoint_manager.py`.
   - `test_30_day_timeline_with_live_checkpoints`: Verifies live checkpoints merge seamlessly into the 30-day timeline.
   - `test_single_session_pdf_generation`: Verifies single-session PDF generation for physical hardware sessions.
   - `test_doctor_report_pdf_with_live_checkpoints`: Verifies 30-day doctor PDF report generates with live hardware checkpoint audit tables.

---

## 12. Repository Structure

```
tremor-ai/
├── app/
│   └── streamlit_app.py        # Streamlit web dashboard (3 views, @st.fragment live streaming)
├── data/
│   ├── live_checkpoints.json   # Thread-safe storage for live hardware checkpoints
│   ├── live_telemetry.json     # High-frequency serial bridge telemetry cache
│   └── raw/                    # Raw clinical datasets (PADS, UCI, or synthetic fallback)
├── hardware/
│   ├── bridge/
│   │   └── serial_bridge.py    # PySerial daemon with zero-lag buffer & 5 Hz inference
│   └── firmware/
│       └── tremor_ai_esp32.ino # ESP32 C++ firmware (100 Hz Fast-Mode I2C & UART CSV)
├── models/
│   ├── model_metrics.json      # Persisted evaluation metrics & confusion matrices
│   ├── tremor_ai_rf_model.joblib # Trained Random Forest model (120 trees)
│   └── scaler.joblib           # StandardScaler feature normalizer
├── src/
│   ├── checkpoint_manager.py   # Atomic live hardware checkpoint persistence & retrieval
│   ├── data_loader.py          # Dataset parser & synthetic clinical patient generator
│   ├── doctor_report.py        # 30-day longitudinal doctor PDF report generator
│   ├── effectiveness.py        # Pre/post-dose delta engine & wearing-off regression
│   ├── features.py             # Hann-windowed FFT PSD & 9 digital biomarker extractors
│   ├── longitudinal_sim.py     # 30-day diurnal symptom modeling & dose scheduler
│   ├── model.py                # Dual ML classifier (RF + SVC) & clinical gating rules
│   ├── preprocessing.py        # 4th-order zero-phase Butterworth bandpass & gravity removal
│   ├── report.py               # Single-session clinical PDF report generator
│   └── severity.py             # Transparent 0-100 severity index & MDS-UPDRS scoring
├── tests/
│   ├── test_effectiveness.py   # Unit tests for medication analysis engine
│   ├── test_features.py        # Unit tests for FFT biomarkers & voluntary movement filter
│   ├── test_live_hardware_integration.py # Integration tests for checkpoints & PDF exports
│   ├── test_model.py           # Unit tests for ML training, CV, and inference
│   ├── test_preprocessing.py   # Unit tests for digital filtering & window segmentation
│   └── test_severity.py        # Unit tests for 0-100 severity formula & stratification
├── requirements.txt            # Python dependencies (NumPy, SciPy, Scikit-learn, Streamlit, etc.)
└── README.md                   # Comprehensive technical documentation & user guide
```

---

## Clinical Notice & License
- **License**: MIT Open Source License.
- **Investigational Notice**: Tremor AI is intended exclusively for scientific research, clinical engineering demonstration, and decision-support exploration. It must never replace direct evaluation or clinical judgment by a qualified medical practitioner.
