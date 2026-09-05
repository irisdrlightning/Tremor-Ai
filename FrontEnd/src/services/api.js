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
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
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
        ? { role: "doctor", user: { name: "Dr. Rita Sharma", initials: "RS" } }
        : { role: "patient", user: { name: "George Peter", initials: "GP" } };
    return fetchWithFallback(`/api/auth/me?role=${role}`, fallback);
  },

  async login(portal = "patient", identifier = "TR-90241", passcode = "") {
    const role = portal === "doctor" ? "doctor" : "patient";
    const fallback = {
      status: "success",
      role,
      user:
        role === "doctor"
          ? { name: "Dr. Rita Sharma", initials: "RS" }
          : { name: "George Peter", initials: "GP" },
      token: "stub-jwt-token-tremor-ai",
    };
    return fetchWithFallback(
      "/api/auth/login",
      fallback,
      {
        method: "POST",
        body: JSON.stringify({ portal, identifier, passcode }),
      }
    );
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
  async getMedicationAnalytics() {
    return fetchWithFallback("/api/medication/analytics", mockMedicationData);
  },

  // Dose Logging
  async logDose(doseData) {
    return fetchWithFallback("/api/dose/log", { status: "success" }, {
      method: "POST",
      body: JSON.stringify(doseData),
    });
  },

  // Live Sensor Hardware AI Model Inference
  async predictWindow(samples, fs = 100.0) {
    return fetchWithFallback("/api/predict", null, {
      method: "POST",
      body: JSON.stringify({ samples, fs }),
    });
  },
};

export default api;
