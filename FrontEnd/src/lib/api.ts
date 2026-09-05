/**
 * Tremor Ai — Frontend API Service Client
 * Connects the modern React frontend to the FastAPI REST backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// Helper for HTTP requests with robust error handling and fallback to port 8000
async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { credentials: "omit", ...options, headers });
    if (!res.ok) {
      // If running directly on vite and proxy fails, fallback to direct port 8000
      if (!API_BASE && (res.status === 404 || res.status === 502)) {
        const directUrl = `http://127.0.0.1:8000${path}`;
        const directRes = await fetch(directUrl, { credentials: "omit", ...options, headers });
        if (directRes.ok) return await directRes.json();
      }
      const errText = await res.text();
      throw new Error(`API ${res.status}: ${errText}`);
    }
    return await res.json();
  } catch (err) {
    // If relative path fails, try direct port 8000
    if (!API_BASE) {
      try {
        const directUrl = `http://127.0.0.1:8000${path}`;
        const directRes = await fetch(directUrl, { credentials: "omit", ...options, headers });
        if (directRes.ok) return await directRes.json();
      } catch (innerErr) {
        // pass through original error
      }
    }
    console.warn(`[TremorAPI] Request failed for ${path}:`, err);
    throw err;
  }
}

export interface TelemetryData {
  timestamp: number;
  ring_id: string;
  source: string;
  prediction: {
    predicted_label: string;
    confidence: number;
    pd_probability: number;
    class_probabilities?: Record<string, number>;
  };
  severity: {
    severity_score: number;
    grade: string;
    clinical_note: string;
  };
  features: {
    dominant_frequency?: number;
    tremor_band_power?: number;
    tremor_power_ratio?: number;
    signal_amplitude_rms?: number;
    jerk_rms?: number;
  };
  spectrum: {
    dominant_frequency: number;
    freqs: number[];
    psd: number[];
  };
  raw_latest: {
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
    mag_dynamic: number;
  };
}

export interface PatientProfile {
  patient_id: string;
  full_name: string;
  age: number;
  medication_name: string;
  medication_schedule: string;
  doses_per_day: number;
  ring_id: string;
  ring_status: string;
}

export interface LongitudinalOverview {
  status: string;
  patient: PatientProfile;
  effectiveness: {
    verdict: string;
    confidence: number;
    average_pre_post_drop: number;
    flare_days_count: number;
    clinical_summary: string;
  };
  timeline: Array<{
    day: number;
    hour: number;
    time_label: string;
    dose_phase: string;
    severity_score: number;
    dominant_freq: number;
    is_flare_day: boolean;
  }>;
  doses: Array<{
    day: number;
    hour: number;
    time_label: string;
    dose_amount: string;
    medication: string;
  }>;
  recent_readings_count: number;
  disclaimer: string;
}

export const api = {
  // 1. Live Telemetry
  async getLiveTelemetry(): Promise<{ status: string; data: TelemetryData }> {
    return request("/api/telemetry/live");
  },

  // 2. Ingest 100 Hz samples from Web Bluetooth
  async ingestTelemetryBatch(
    ringId: string,
    patientId: string | null,
    samples: number[][]
  ): Promise<any> {
    return request("/api/telemetry/ingest", {
      method: "POST",
      body: JSON.stringify({
        ring_id: ringId,
        patient_id: patientId,
        samples,
      }),
    });
  },

  // 3. Patients list
  async getPatients(): Promise<{ status: string; patients: PatientProfile[] }> {
    return request("/api/patients");
  },

  // 4. Single patient profile
  async getPatient(patientId: string): Promise<{ status: string; patient: PatientProfile }> {
    return request(`/patients/${patientId}`);
  },

  // 5. Patient longitudinal overview & medication response
  async getPatientOverview(patientId: string): Promise<LongitudinalOverview> {
    return request(`/api/patients/${patientId}/overview`);
  },

  // 6. Log medication dose
  async logPatientDose(
    patientId: string,
    medicationName: string,
    doseAmount = "Standard dose",
    notes = "Logged from Web App"
  ): Promise<any> {
    return request(`/patients/${patientId}/doses`, {
      method: "POST",
      body: JSON.stringify({
        medication_name: medicationName,
        dose_amount: doseAmount,
        notes,
      }),
    });
  },

  // 7. Auth Login
  async login(email: string, password: string, role?: string): Promise<any> {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    });
  },

  // 8. PDF download URL
  getReportPdfUrl(patientId: string): string {
    const base = API_BASE || "http://127.0.0.1:8000";
    return `${base}/api/reports/${patientId}/pdf`;
  },
};
