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
  const [role, setRole] = useState(initialRole);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tremor_auth_authenticated");
      return stored !== null ? stored === "true" : true; // default true for backwards compatibility
    }
    return true;
  });
  const [user, setUser] = useState(() =>
    role === "doctor"
      ? { name: "Dr. Rita Sharma", initials: "RS" }
      : { name: "George Peter", initials: "GP" },
  );

  useEffect(() => {
    let active = true;
    api.getMe(role).then((res) => {
      if (active && res?.user) {
        setUser(res.user);
      }
    });
    return () => {
      active = false;
    };
  }, [role]);

  const login = async (portal = "patient", identifier = "TR-90241", passcode = "") => {
    const res = await api.login(portal, identifier, passcode);
    if (res && res.status === "success") {
      setRole(res.role);
      setUser(res.user);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("tremor_auth_authenticated", "true");
        localStorage.setItem("tremor_auth_role", res.role);
      }
      return res;
    }
    return null;
  };

  const logout = () => {
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("tremor_auth_authenticated", "false");
    }
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
    }),
    [role, user, isAuthenticated],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export default RoleContext;

