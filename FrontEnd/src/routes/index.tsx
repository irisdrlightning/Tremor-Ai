import { createFileRoute } from "@tanstack/react-router";

// @ts-expect-error - plain-JS React components
import LiveKinematics from "@/components/kinematics/LiveKinematics.jsx";
// @ts-expect-error - plain-JS React components
import DoctorPortal from "@/components/doctor/DoctorPortal.jsx";
// @ts-expect-error - plain-JS React components
import LoginView from "@/components/auth/LoginView.jsx";
// @ts-expect-error - plain-JS React components
import { RoleProvider, useRole } from "@/context/RoleContext.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tremor AI — Precision Neuromonitoring & Telemetry" },
      {
        name: "description",
        content:
          "Real-time hand tremor telemetry: spectral power ratio, MDS-UPDRS scoring, AI detection and sensor node status for movement disorder clinics.",
      },
      { property: "og:title", content: "Tremor AI — Precision Neuromonitoring & Telemetry" },
      {
        property: "og:description",
        content:
          "Monitor tremor rate, spectral biomarkers and sensor nodes in one clinical dashboard.",
      },
    ],
  }),
  component: Index,
});

function AppRouter() {
  const { isAuthenticated, role } = useRole();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Doctor Clinical Workbench
  if (role === "doctor") {
    return <DoctorPortal />;
  }

  // Patient Health & Kinematics Portal
  return <LiveKinematics />;
}

function Index() {
  return (
    <RoleProvider initialRole="patient">
      <AppRouter />
    </RoleProvider>
  );
}
