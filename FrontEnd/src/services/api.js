/**
 * Centralized Tremor AI REST API client.
 * Respects existing mock data fallbacks if the backend is unreachable.
 */

import {
  conditions as mockConditions,
  schedule as mockSchedule,
  sensorNodes as mockSensorNodes,
  subject as mockSubject,
} from "@/data/mockKinematics";
import { medicationAnalyticsData as mockMedicationData } from "@/data/mockMedicationAnalytics";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function fetchWithFallback(endpoint, fallbackData, options = {}) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("tremor_auth_token") : null;
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[Tremor API] Call to ${endpoint} failed, using local fallback.`, err);
    return fallbackData;
  }
}

export const api = {
  // Auth/Role
  async getMe(role = "doctor") {
    const fallback =
      role === "doctor"
        ? {
            role: "doctor",
            user: {
              name: "Dr. Rita Sharma",
              initials: "RS",
              id: "DR-10822",
              role: "Movement Disorder Specialist",
            },
            isAuthenticated: true,
          }
        : {
            role: "patient",
            user: {
              name: "George Peter",
              initials: "GP",
              id: "TR-90241",
              role: "Parkinson's Stage II Participant",
            },
            isAuthenticated: true,
          };
    return fetchWithFallback(`/api/auth/me?role=${role}`, fallback);
  },

  async updateProfile(profileData, role = "doctor") {
    return fetchWithFallback(`/api/auth/profile?role=${role}`, profileData, {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  },

  async login(portal = "patient", identifier = "TR-90241", passcode = "") {
    const role = portal === "doctor" ? "doctor" : "patient";
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal, identifier, passcode }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Authentication failed (status ${res.status})`);
      }
      return await res.json();
    } catch (err) {
      if (err.message && !err.message.includes("Failed to fetch") && !err.message.includes("NetworkError")) {
        throw err;
      }
      // Offline fallback only when backend is completely offline
      console.warn("[Tremor API] Backend unreachable, using client offline authentication fallback.");
      return {
        status: "success",
        role,
        user:
          role === "doctor"
            ? {
                name: "Dr. Rita Sharma",
                initials: "RS",
                id: identifier || "DR-10822",
                role: "Movement Disorder Specialist",
              }
            : {
                name: "George Peter",
                initials: "GP",
                id: identifier || "TR-90241",
                role: "Parkinson's Stage II Participant",
              },
        token: `tremor-jwt-${role}-${identifier || "guest"}`,
        message: "Offline session authenticated",
      };
    }
  },

  async resetPin(identifier, verificationCode, newPasscode) {
    return fetchWithFallback("/api/auth/reset-pin", { status: "success", message: "PIN reset successful" }, {
      method: "POST",
      body: JSON.stringify({ identifier, verificationCode, newPasscode }),
    });
  },

  async logout() {
    return fetchWithFallback("/api/auth/logout", { status: "success" }, { method: "POST" });
  },

  // Patient Overview / Kinematics
  async getPatientOverview() {
    return fetchWithFallback("/api/patient/overview", mockSubject);
  },

  // Conditions
  async getConditions() {
    return fetchWithFallback("/api/conditions", mockConditions);
  },

  // Schedule & Clinician Roster
  async getSchedule() {
    return fetchWithFallback("/api/schedule", mockSchedule);
  },

  // Sensor Nodes
  async getSensorNodes() {
    return fetchWithFallback("/api/sensor-nodes", mockSensorNodes);
  },

  // Medication Analytics
  async getMedicationAnalytics(patientId = "TR-90241") {
    return fetchWithFallback(`/api/medication/analytics?patient_id=${patientId}`, mockMedicationData);
  },

  // Medication Regimen & Active Rx
  async getMedicationRegimen(patientId = "TR-90241") {
    return fetchWithFallback(`/api/medication/regimen?patient_id=${patientId}`, {
      patient: { id: patientId, name: "George Peter", schedule: "LD-CD 100/25 mg • TID", dosesTaken: 1, dosesTotal: 3 },
      activeRegimen: { medicationName: "Levodopa / Carbidopa", levodopa: 100, carbidopa: 25, unit: "mg", nextScheduled: "13:00" },
    });
  },

  // Dose History
  async getDoseHistory(patientId = "TR-90241") {
    return fetchWithFallback(`/api/medication/doses?patient_id=${patientId}`, {
      status: "success",
      doses: [],
    });
  },

  // Dose Logging
  async logDose(doseData) {
    return fetchWithFallback("/api/medication/log-dose", { status: "success", entry: doseData }, {
      method: "POST",
      body: JSON.stringify(doseData),
    });
  },

  // Clear Dose History
  async clearDoseHistory() {
    return fetchWithFallback("/api/medication/doses", { status: "success" }, {
      method: "DELETE",
    });
  },

  // Live Sensor Hardware AI Model Inference
  async predictWindow(samples, fs = 100.0) {
    return fetchWithFallback("/api/predict", null, {
      method: "POST",
      body: JSON.stringify({ samples, fs }),
    });
  },

  // Neurologist 30-Day Clinical Summary PDF Download
  async downloadDoctorReportPdf(patientId = "TR-90241") {
    const url = `${API_BASE_URL}/api/reports/doctor-pdf?patient_id=${patientId}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch PDF from backend");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      a.download = `TremorAI_Neurologist_Report_${patientId}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      }, 60000);
      return { status: "success", message: "PDF downloaded successfully" };
    } catch (err) {
      console.warn("Direct blob download fallback, triggering window navigation", err);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `TremorAI_Neurologist_Report_${patientId}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 5000);
      return { status: "fallback", message: "Initiated direct stream download" };
    }
  },

  // Single Session Patient PDF Report Download
  async downloadSessionReportPdf(patientId = "TR-90241") {
    const url = `${API_BASE_URL}/api/reports/session-pdf?patient_id=${patientId}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch session PDF");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = downloadUrl;
      a.download = `TremorAI_Session_Report_${patientId}.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (a.parentNode) a.parentNode.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      }, 60000);
      return { status: "success", message: "Session PDF downloaded successfully" };
    } catch (err) {
      console.warn("Direct session blob fallback, triggering window navigation", err);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `TremorAI_Session_Report_${patientId}.pdf`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 5000);
      return { status: "fallback", message: "Initiated direct stream download" };
    }
  },

  // Save Physical Hardware Telemetry Checkpoint
  async recordCheckpoint(checkpointData) {
    return fetchWithFallback("/api/reports/checkpoint", { status: "success" }, {
      method: "POST",
      body: JSON.stringify(checkpointData),
    });
  },
};

export default api;
