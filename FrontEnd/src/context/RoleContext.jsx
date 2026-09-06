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

export function RoleProvider({ children, initialRole = "doctor" }) {
  const [role, setRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("tremor_auth_role") || initialRole;
    }
    return initialRole;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      const storedAuth = localStorage.getItem("tremor_auth_authenticated");
      const storedToken = localStorage.getItem("tremor_auth_token");
      return storedAuth === "true" && Boolean(storedToken);
    }
    return false;
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
      ? { name: "Dr. Rita Sharma", initials: "RS", id: "DR-10822", role: "Movement Disorder Specialist" }
      : { name: "George Peter", initials: "GP", id: "TR-90241", role: "Parkinson's Stage II Participant" };
  });

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
    // Optimistic fallback update
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
      user,
      setUser,
      isAuthenticated,
      setIsAuthenticated,
      login,
      logout,
      updateProfile,
    }),
    [role, user, isAuthenticated],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export default RoleContext;


