import { createContext, useContext, useMemo, useState } from "react";

/**
 * Auth/role context. No backend yet — the role is mocked here and will later be
 * hydrated from the REST API (env-configured base URL).
 */
const RoleContext = createContext({
  role: "doctor",
  user: { name: "Dr. Rita Sharma", initials: "RS" },
  setRole: () => {},
});

export function RoleProvider({ children, initialRole = "doctor" }) {
  const [role, setRole] = useState(initialRole);

  const value = useMemo(
    () => ({
      role,
      setRole,
      user:
        role === "doctor"
          ? { name: "Dr. Rita Sharma", initials: "RS" }
          : { name: "George Peter", initials: "GP" },
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}

export default RoleContext;
