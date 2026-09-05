import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import LiveKinematics from "@/components/kinematics/LiveKinematics";
import SignInPortal from "@/components/auth/SignInPortal";
import { RoleProvider, useRole } from "@/context/RoleContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tremor AI — Clinical Telemetry & Diagnostics Portal" },
      {
        name: "description",
        content:
          "Real-time hand tremor telemetry: spectral power ratio, MDS-UPDRS scoring, AI detection and sensor node status for movement disorder clinics.",
      },
      { property: "og:title", content: "Tremor AI — Clinical Telemetry & Diagnostics Portal" },
      {
        property: "og:description",
        content:
          "Monitor tremor rate, spectral biomarkers and sensor nodes in one clinical dashboard.",
      },
    ],
  }),
  component: Index,
});

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { isAuthenticated, setIsAuthenticated } = useRole();

  if (!mounted) {
    return <div className="min-h-screen bg-[#060908]" />;
  }

  if (!isAuthenticated) {
    return <SignInPortal onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return <LiveKinematics onSignOut={() => setIsAuthenticated(false)} />;
}

function Index() {
  return (
    <RoleProvider initialRole="doctor">
      <DashboardContent />
    </RoleProvider>
  );
}
