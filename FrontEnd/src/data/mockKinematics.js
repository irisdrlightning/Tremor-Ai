// Initial/default data. All sensor readings start at 0 and update dynamically
// from BLE (useBluetooth) or WebSocket (useLiveTelemetry) once a device session begins.

export const subject = {
  name: "George Peter",
  id: "TR-90241",
  tremorRate: "0.0",       // Hz — updated live from BLE / WS
  sampling: "100 Hz BLE",
  rms: "0.000g",           // g RMS — updated live from BLE / WS
};

export const conditions = [
  {
    id: "spectral",
    tag: "PENDING",
    icon: "droplet",
    label: "Power Ratio",
    value: "0",
    unit: "%",
    variant: "bars",
  },
  {
    id: "ai",
    tag: "—",
    icon: "scan",
    label: "AI Detection",
    value: "Awaiting data",
    footer: "NO SESSION",
    variant: "highlight",
  },
  {
    id: "updrs",
    tag: "NOT SCORED",
    icon: "chart",
    label: "MDS-UPDRS",
    value: "0",
    unit: "/100",
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

export const schedule = {
  nextCheckup: "Not scheduled",
  weekLabel: "No session active",
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
    subtitle: "X 0.000g  Y 0.000g  Z 0.000g",  // overwritten by live BLE / WS rawImu
    status: "WAITING",
    meta: "100 Hz",
  },
  {
    id: "primary",
    code: "PRIMARY STREAM",
    title: "Active Hand Twin",
    subtitle: "Awaiting device connection",
    highlight: true,
  },
  {
    id: "fft",
    code: "FFT SPECTRUM",
    title: "Sub-band Distribution",
    subtitle: "Peak: 0.00 Hz (No session)",     // overwritten by sessionPeakFreq
    status: "IDLE",
    meta: "Hann 512",
  },
];
