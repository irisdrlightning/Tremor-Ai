import { createFileRoute, useNavigate } from "@tanstack/react-router";
import DoctorPortal from "@/components/doctor/DoctorPortal";
import { useRole } from "@/context/RoleContext";

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

function SuggestedRegimenRouteComponent() {
  const navigate = useNavigate();
  const { role, setIsAuthenticated } = useRole();

  // Strictly restrict this view: only doctor should have access, not the patient
  if (role !== "doctor") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4 font-sans">
        <div className="max-w-md rounded-2xl border border-[#152326] bg-[#0b1112] p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto h-12 w-12 rounded-xl bg-black border border-[#10B981] text-[#10B981] flex items-center justify-center font-bold text-lg font-mono">
            Rx
          </div>
          <h2 className="text-lg font-bold text-white">Clinician Access Only</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            The Suggested Regimen &amp; Titration Engine is restricted to licensed movement disorder specialists and attending neurologists.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="w-full rounded-xl bg-[#10B981] py-2.5 text-xs font-bold text-black hover:brightness-110 transition-all cursor-pointer"
          >
            Return to Patient Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <DoctorPortal
      initialTab="suggested-regimen"
      onSignOut={() => setIsAuthenticated(false)}
    />
  );
}
