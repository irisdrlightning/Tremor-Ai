// Placeholder data. Replace with fetch/axios calls against import.meta.env.VITE_API_BASE_URL.

export const subject = {
  name: "George Peter",
  id: "TR-90241",
  tremorRate: "5.1",
  sampling: "100 Hz UART",
  rms: "0.142g",
};

export const conditions = [
  {
    id: "spectral",
    tag: "SPECTRAL",
    icon: "droplet",
    label: "Power Ratio",
    value: "84",
    unit: "%",
    variant: "bars",
  },
  {
    id: "ai",
    tag: "94.2%",
    icon: "scan",
    label: "AI Detection",
    value: "Parkinson's",
    footer: "CONFIRMED",
    variant: "highlight",
  },
  {
    id: "updrs",
    tag: "MODERATE",
    icon: "chart",
    label: "MDS-UPDRS",
    value: "42",
    unit: "/100",
    variant: "steps",
  },
  {
    id: "noise",
    tag: "ISOLATED",
    icon: "funnel",
    label: "Voluntary Noise",
    value: "< 0.8",
    unit: "Hz",
    variant: "dots",
  },
];

export const schedule = {
  nextCheckup: "Fri, 24 Oct",
  weekLabel: "20-Oct — 26-Oct",
  days: [20, 21, 22, 23, 24],
  activeDay: 24,
  team: [
    { initials: "ER", name: "Dr. Emily Rochers", role: "Movement Disorder Specialist" },
    { initials: "SA", name: "Dr. Steve Alex", role: "Clinical Neurophysiologist" },
    { initials: "JF", name: "Dr. Johan Fraz", role: "Telemetry Biophysicist" },
  ],
};

export const sensorNodes = [
  {
    id: "esp-994",
    code: "ESP-994",
    title: "Wrist IMU Node",
    subtitle: "Pitch +2.4° • Roll -1.1°",
    status: "SYNCED",
    meta: "100 Hz",
  },
  {
    id: "primary",
    code: "PRIMARY STREAM",
    title: "Active Hand Twin",
    subtitle: "Dual 6-DOF Sensor Array",
    highlight: true,
  },
  {
    id: "fft",
    code: "FFT SPECTRUM",
    title: "Sub-band Distribution",
    subtitle: "Peak: 5.12 Hz (Power: 2.81)",
    status: "WINDOW",
    meta: "Hann 512",
  },
];
