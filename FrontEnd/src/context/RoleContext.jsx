import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useWebBluetooth } from "@/hooks/useWebBluetooth";

const RoleContext = createContext({
  isAuthenticated: false,
  role: "doctor",
  user: { name: "Dr. Marcus Bell, MD", initials: "MB" },
  setRole: () => {},
  activePatientId: "PD_01",
  setActivePatientId: () => {},
  activePatient: null,
  patients: [],
  bluetoothState: null,
  login: async () => {},
  logout: () => {},
  quickLoginAsDoctor: () => {},
  quickLoginAsPatient: () => {},
});

export function RoleProvider({ children, initialRole = "doctor" }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(initialRole);
  const [activePatientId, setActivePatientId] = useState("PD_01");
  const [patients, setPatients] = useState([
    {
      patient_id: "PD_01",
      full_name: "Eleanor Vance",
      age: 68,
      medication_name: "Carbidopa/Levodopa 25/100 mg",
      medication_schedule: "8:00 AM, 1:00 PM, 6:00 PM",
      doses_per_day: 3,
      ring_id: "RING-7842",
      ring_status: "active",
    },
    {
      patient_id: "PD_02",
      full_name: "George Peter",
      age: 72,
      medication_name: "Ropinirole 2 mg",
      medication_schedule: "9:00 AM, 3:00 PM, 9:00 PM",
      doses_per_day: 3,
      ring_id: "RING-9041",
      ring_status: "active",
    },
  ]);

  // Initialize Web Bluetooth for active patient
  const bluetoothState = useWebBluetooth(activePatientId);

  // Fetch registered patients from backend on mount
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await api.getPatients();
        if (res && res.patients && res.patients.length > 0) {
          setPatients(res.patients);
        }
      } catch {
        // fallback
      }
    }
    loadPatients();
  }, []);

  const activePatient = useMemo(() => {
    return patients.find((p) => p.patient_id === activePatientId) || patients[0];
  }, [patients, activePatientId]);

  const user = useMemo(() => {
    if (role === "doctor") {
      return {
        name: "Dr. Marcus Bell, MD",
        initials: "MB",
        clinic: "Movement Disorders Neurology Institute",
      };
    } else {
      return {
        name: activePatient?.full_name || "Eleanor Vance",
        initials: activePatient?.full_name
          ? activePatient.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
          : "EV",
        patient_id: activePatientId,
      };
    }
  }, [role, activePatient, activePatientId]);

  const login = async (email, password, desiredRole = "doctor") => {
    try {
      await api.login(email, password, desiredRole);
      setRole(desiredRole);
      setIsAuthenticated(true);
    } catch {
      setRole(desiredRole);
      setIsAuthenticated(true);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const quickLoginAsDoctor = () => {
    setRole("doctor");
    setIsAuthenticated(true);
  };

  const quickLoginAsPatient = (pId = "PD_01") => {
    setRole("patient");
    setActivePatientId(pId);
    setIsAuthenticated(true);
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      setIsAuthenticated,
      role,
      setRole,
      user,
      activePatientId,
      setActivePatientId,
      activePatient,
      patients,
      bluetoothState,
      login,
      logout,
      quickLoginAsDoctor,
      quickLoginAsPatient,
    }),
    [isAuthenticated, role, user, activePatientId, activePatient, patients, bluetoothState]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export default RoleContext;
