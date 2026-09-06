import { createFileRoute, useNavigate } from "@tanstack/react-router";
import SuggestedRegimen from "@/components/kinematics/SuggestedRegimen";
import { RoleProvider, useRole } from "@/context/RoleContext";

export const Route = createFileRoute("/suggested-regimen")({
  head: () => ({
    meta: [
      { title: "Suggested Regimen — AI Titration Engine | Tremor AI" },
      {
        name: "description",
        content:
          "AI-driven circadian regimen adjustment, simulation model, and kinematic telemetry supporting titration.",
      },
      { property: "og:title", content: "Suggested Regimen — AI Titration Engine | Tremor AI" },
    ],
  }),
  component: SuggestedRegimenRouteComponent,
});

function SuggestedRegimenView() {
  const navigate = useNavigate();
  const { user, setIsAuthenticated } = useRole();

  const handleNavigate = (tabId: string) => {
    if (tabId === "log-medicine" || tabId === "kinematics") {
      navigate({ to: "/" });
    }
  };

  return (
    <SuggestedRegimen
      initials={user?.initials || "RS"}
      onSignOut={() => setIsAuthenticated(false)}
      onNavigate={handleNavigate}
    />
  );
}

function SuggestedRegimenRouteComponent() {
  return (
    <RoleProvider initialRole="doctor">
      <SuggestedRegimenView />
    </RoleProvider>
  );
}
