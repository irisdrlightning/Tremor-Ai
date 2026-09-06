// Initial/default clinical baseline data for Tremor AI dashboard.
// Dynamically updated in real-time from BLE (useBluetooth) or WebSocket (useLiveTelemetry).

export const subject = {
  name: "George Peter",
  id: "TR-90241",
  tremorRate: "0.78",       // Hz — Dominant tremor rate
  sampling: "100 Hz BLE",
  rms: "0.523g",           // g RMS — Overall acceleration magnitude
};

export const conditions = [
  {
    id: "ai",
    tag: "CONFIRMED",
    icon: "scan",
    label: "AI Detection",
    value: "Parkinson's",
    footer: "94.2%",
    variant: "highlight",
  },
  {
    id: "spectral",
    tag: "SPECTRAL",
    icon: "droplet",
    label: "Tremor Band Power",
    value: "84",
    unit: "%",
    footer: "NORMAL BAND",
    variant: "bars",
  },
  {
    id: "updrs",
    tag: "MODERATE",
    icon: "chart",
    label: "Score Card",
    value: "42",
    unit: "/100",
    footer: "MODERATE",
    variant: "steps",
  },
  {
    id: "noise",
    tag: "FILTERED",
    icon: "funnel",
    label: "Voluntary Noise",
    value: "0.8",
    unit: "Hz",
    variant: "dots",
  },
];

export const schedule = {
  nextCheckup: "Not scheduled",
  weekLabel: "Week 12 · Telemetry Monitoring",
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
    subtitle: "X 0.279g  Y -0.020g  Z 1.030g",
    status: "WAITING",
    meta: "100 Hz",
  },
  {
    id: "primary",
    code: "PRIMARY STREAM",
    title: "Active Hand Twin",
    subtitle: "Awaiting device connection",
    status: "STREAMING",
    meta: "6-DOF IMU",
    highlight: true,
  },
  {
    id: "fft",
    code: "FFT SPECTRUM",
    title: "Sub-band Distribution",
    subtitle: "Peak: 0.78 Hz (Session)",
    status: "IDLE",
    meta: "Hann 512",
  },
];

