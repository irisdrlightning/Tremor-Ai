// Initial / default medication analytics data.
// All numeric readings start at 0; text fields use purposeful defaults.
// Values update from the backend API (/api/medication/analytics) on mount.

export const medicationAnalyticsData = {
  subject: {
    name: "George Peter",
    id: "TR-90241",
    status: "NO SESSION",
    updrsScore: 0,                                  // MDS-UPDRS score — 0 until scored
    updrsMax: 108,
    confidenceText: "AWAITING SENSOR DATA",
    meanRestTremor: "0.00 Hz",                      // Hz — updated from session data
    meanRestDelta: "(—)",                           // % change — no baseline yet
    onStateStability: "0.0%",                       // % on-state time — no session
    onStateLabel: "Time",
  },
  titration: {
    updatedTime: "NOT UPDATED",
    spectralPower: {
      tremorReduction: "0.0%",                      // % reduction — no baseline yet
      reductionUnit: "%",
      status: "Status: Awaiting session",
      sparkline: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    dosageStatus: {
      tag: "NO RX",
      medication: "Not prescribed",
      dosage: "—",
      unit: "mg",
      nextDose: "Next Dose: Not scheduled",
      window: "Window: No regimen active",
    },
    kineticBand: {
      tag: "NO DATA",
      label: "Drift Variance",
      value: "0.000",                               // g RMS — 0 until sensor streams
      unit: "g RMS",
      channels: [
        { label: "CH1", active: false, level: 0 },
        { label: "CH2", active: false, level: 0 },
        { label: "CH3", active: false, level: 0 },
        { label: "CH4", active: false, level: 0 },
        { label: "CH5", active: false, level: 0 },
      ],
    },
    compliance: {
      rate: "0%",                                   // dose adherence — no doses logged
      label: "Dose Adherence",
      taken: 0,                                     // doses taken today
      total: 0,                                     // total prescribed today
      skippedText: "No doses logged yet",
    },
  },
  timeline: {
    rangeLabel: "No data yet",
    subtitle: "Daily peak tremor amplitude suppression",
    legend: [
      { label: "Normal Range", color: "#64748b" },
      { label: "Flare Window", color: "#10B981" },
      { label: "Critical Tremor", color: "#ef4444" },
    ],
    // 30 days — all zero until backend populates real session history
    days: [
      { day: "01", val: 0, isFlare: false },
      { day: "02", val: 0, isFlare: false },
      { day: "03", val: 0, isFlare: false },
      { day: "04", val: 0, isFlare: false },
      { day: "05", val: 0, isFlare: false },
      { day: "06", val: 0, isFlare: false },
      { day: "07", val: 0, isFlare: false },
      { day: "08", val: 0, isFlare: false },
      { day: "09", val: 0, isFlare: false },
      { day: "10", val: 0, isFlare: false },
      { day: "11", val: 0, isFlare: false },
      { day: "12", val: 0, isFlare: false },
      { day: "13", val: 0, isFlare: false },
      { day: "14", val: 0, isFlare: false },
      { day: "15", val: 0, isFlare: false },
      { day: "16", val: 0, isFlare: false },
      { day: "17", val: 0, isFlare: false },
      { day: "18", val: 0, isFlare: false },
      { day: "19", val: 0, isFlare: false },
      { day: "20", val: 0, isFlare: false },
      { day: "21", val: 0, isFlare: false },
      { day: "22", val: 0, isFlare: false },
      { day: "23", val: 0, isFlare: false },
      { day: "24", val: 0, isFlare: false },
      { day: "25", val: 0, isFlare: false },
      { day: "26", val: 0, isFlare: false },
      { day: "27", val: 0, isFlare: false },
      { day: "28", val: 0, isFlare: false },
      { day: "29", val: 0, isFlare: false },
      { day: "30", val: 0, isFlare: false },
    ],
    footer: {
      format: "Format: Clinician HL7 / FHIR",
      hash: "SHA-256 Verified",
    },
  },
  sensorChannels: [
    {
      id: "diurnal",
      category: "DIURNAL CURVE",
      title: "Hourly Variance",
      subtitle: "Awaiting session data",          // updates once sessions recorded
      type: "sine",
      icon: "activity",
    },
    {
      id: "hardware-sync",
      category: "MPU6050 100 HZ",
      title: "Hardware Sync",
      subtitle: "X 0.000g  Y 0.000g  Z 0.000g",  // overwritten by live IMU data
      status: "WAITING",
      badge: "No device",
      icon: "radio",
    },
    {
      id: "fft-spectrum",
      category: "FFT SPECTRUM",
      title: "Frequency Tracking",
      subtitle: "Peak: 0.00 Hz (No session)",     // overwritten by live tremorRate
      metricLabel: "SPECTRAL Q",
      metricVal: "0.00 ratio",                    // updated from signal processing
      icon: "bar-chart",
    },
  ],
};
