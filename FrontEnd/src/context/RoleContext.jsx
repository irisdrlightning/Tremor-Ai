import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "@/services/api";

/**
 * Auth/role context. Hydrated from the REST API (env-configured base URL).
 */
const RoleContext = createContext({
  role: "doctor",
  user: { name: "Dr. Rita Sharma", initials: "RS" },
  setRole: () => {},
});

export function RoleProvider({ children, initialRole = "doctor" }) {
  const [role, setRole] = useState(initialRole);
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

  const value = useMemo(
    () => ({
      role,
      setRole,
      user,
    }),
    [role, user],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export default RoleContext;

