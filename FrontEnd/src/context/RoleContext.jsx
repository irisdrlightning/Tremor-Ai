import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "@/services/api";

/**
 * Auth/role context. Hydrated from the REST API (env-configured base URL).
 */
const RoleContext = createContext({
  role: "doctor",
  user: { name: "Dr. Rita Sharma", initials: "RS" },
  isAuthenticated: true,
  setRole: () => {},
  setUser: () => {},
  login: async () => {},
  logout: () => {},
});

export const DEFAULT_PATIENTS = [
  {
    id: "TR-90241",
    name: "George Peter",
    age: 67,
    gender: "Male",
    stage: "Stage II PD",
    regimen: "Levodopa / Carbidopa 100/25 mg TID",
    tremorRate: 5.1,
    spectralPower: 84,
    updrs: 42,
    adherence: "28 / 28",
    status: "Stable On-State",
    lastSynced: "Just now (100 Hz BLE)",
  },
  {
    id: "TR-90242",
    name: "Biromon Jr.",
    age: 62,
    gender: "Male",
    stage: "Stage II PD",
    regimen: "Levodopa / Carbidopa 100/25 mg TID",
    tremorRate: 4.88,
    spectralPower: 82,
    updrs: 38,
    adherence: "27 / 28",
    status: "Controlled Regimen",
    lastSynced: "4 mins ago",
  },
  {
    id: "TR-90243",
    name: "Eleanor Vance",
    age: 71,
    gender: "Female",
    stage: "Stage III PD",
    regimen: "Levodopa / Carbidopa 200/50 mg QID",
    tremorRate: 5.62,
    spectralPower: 89,
    updrs: 54,
    adherence: "26 / 28",
    status: "Mild Midday Wear-Off",
    lastSynced: "28 mins ago",
  },
];

export function RoleProvider({ children, initialRole = "doctor" }) {
  const [role, setRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tremor_auth_role") || initialRole;
    }
    return initialRole;
  });

  const [selectedPatientId, setSelectedPatientId] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tremor_selected_patient_id") || "TR-90241";
    }
    return "TR-90241";
  });

  const selectedPatient = useMemo(() => {
    return DEFAULT_PATIENTS.find((p) => p.id === selectedPatientId) || DEFAULT_PATIENTS[0];
  }, [selectedPatientId]);

  const selectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    if (typeof window !== "undefined") {
      localStorage.setItem("tremor_selected_patient_id", patientId);
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      const storedAuth = localStorage.getItem("tremor_auth_authenticated");
      const storedToken = localStorage.getItem("tremor_auth_token");
      return storedAuth === "true" && Boolean(storedToken);
    }
    return true; // Default offline authenticated
  });

  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const storedUser = localStorage.getItem("tremor_auth_user");
        if (storedUser) return JSON.parse(storedUser);
      } catch (e) {
        console.warn("Failed to parse stored user profile", e);
      }
    }
    return role === "doctor"
      ? { name: "Dr. Emily Rochers", initials: "ER", id: "DR-10822", role: "Movement Disorder Specialist" }
      : { name: "George Peter", initials: "GP", id: "TR-90241", role: "Parkinson's Stage II Participant" };
  });

  const switchRole = (newRole) => {
    setRole(newRole);
    if (typeof window !== "undefined") {
      localStorage.setItem("tremor_auth_role", newRole);
    }
    if (newRole === "doctor") {
      const docUser = { name: "Dr. Emily Rochers", initials: "ER", id: "DR-10822", role: "Movement Disorder Specialist" };
      setUser(docUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("tremor_auth_user", JSON.stringify(docUser));
      }
    } else {
      const patUser = { name: selectedPatient.name, initials: selectedPatient.name.split(" ").map(n => n[0]).join(""), id: selectedPatient.id, role: "Parkinson's Patient" };
      setUser(patUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("tremor_auth_user", JSON.stringify(patUser));
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    api.getMe(role).then((res) => {
      if (active && res?.user) {
        setUser(res.user);
        if (typeof window !== "undefined") {
          localStorage.setItem("tremor_auth_user", JSON.stringify(res.user));
        }
      }
    });
    return () => {
      active = false;
    };
  }, [role, isAuthenticated]);

  const login = async (portal = "patient", identifier = "TR-90241", passcode = "") => {
    const res = await api.login(portal, identifier, passcode);
    if (res && res.status === "success") {
      setRole(res.role);
      setUser(res.user);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("tremor_auth_authenticated", "true");
        localStorage.setItem("tremor_auth_role", res.role);
        localStorage.setItem("tremor_auth_token", res.token || `token-${Date.now()}`);
        localStorage.setItem("tremor_auth_user", JSON.stringify(res.user));
      }
      return res;
    }
    return null;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Logout error:", err);
    }
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("tremor_auth_authenticated");
      localStorage.removeItem("tremor_auth_token");
      localStorage.removeItem("tremor_auth_role");
      localStorage.removeItem("tremor_auth_user");
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updated = await api.updateProfile(profileData, role);
      if (updated) {
        setUser(updated);
        if (typeof window !== "undefined") {
          localStorage.setItem("tremor_auth_user", JSON.stringify(updated));
        }
        return updated;
      }
    } catch (err) {
      console.warn("Failed to update profile", err);
    }
    const fallbackUser = { ...user, ...profileData };
    setUser(fallbackUser);
    if (typeof window !== "undefined") {
      localStorage.setItem("tremor_auth_user", JSON.stringify(fallbackUser));
    }
    return fallbackUser;
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      switchRole,
      user,
      setUser,
      isAuthenticated,
      setIsAuthenticated,
      patients: DEFAULT_PATIENTS,
      selectedPatientId,
      selectedPatient,
      selectPatient,
      login,
      logout,
      updateProfile,
    }),
    [role, user, isAuthenticated, selectedPatientId, selectedPatient],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export default RoleContext;


