import { createFileRoute } from "@tanstack/react-router";

// @ts-expect-error - plain-JS React components
import LiveKinematics from "@/components/kinematics/LiveKinematics.jsx";
// @ts-expect-error - plain-JS React components
import { RoleProvider } from "@/context/RoleContext.jsx";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Kinematics — Tremor Telemetry Dashboard" },
      {
        name: "description",
        content:
          "Real-time hand tremor telemetry: spectral power ratio, MDS-UPDRS scoring, AI detection and sensor node status for movement disorder clinics.",
      },
      { property: "og:title", content: "Live Kinematics — Tremor Telemetry Dashboard" },
      {
        property: "og:description",
        content:
          "Monitor tremor rate, spectral biomarkers and sensor nodes in one clinical dashboard.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <RoleProvider initialRole="doctor">
      <LiveKinematics />
    </RoleProvider>
  );
}
