import React, { useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Zap,
} from "lucide-react";
import tremorIcon from "@/assets/tremor-icon.png";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import { useRole } from "@/context/RoleContext";

export default function LoginView() {
  const { login, quickLoginAsDoctor, quickLoginAsPatient } = useRole();

  const [activeRole, setActiveRole] = useState("doctor");
  const [email, setEmail] = useState("dr.marcus.bell@neurology.clinic");
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRoleSelect = (r) => {
    setActiveRole(r);
    setError(null);
    if (r === "doctor") {
      setEmail("dr.marcus.bell@neurology.clinic");
    } else {
      setEmail("eleanor.vance@patient.mail");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password, activeRole);
    } catch (err) {
      // If server rejects custom credentials, provide helpful message or allow quick sign in
      setError("Invalid credentials or user not registered. Use the Quick Access options below to sign in immediately.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 selection:bg-primary selection:text-primary-foreground">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-3xl border border-border bg-card p-2 shadow-md mb-4 group transition-transform hover:scale-105">
            <img
              src={tremorIconBase64 || tremorIcon || "/tremor-icon.png"}
              alt="Tremor AI logo"
              className="h-full w-full object-contain rounded-2xl"
            />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Tremor <span className="text-primary">AI</span>
          </h1>
          <p className="mt-1 text-sm font-mono-tech text-muted-foreground">
            Precision Movement Disorders Neuromonitoring
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-shell p-1 border border-border/60 mb-6">
            <button
              type="button"
              onClick={() => handleRoleSelect("doctor")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                activeRole === "doctor"
                  ? "bg-card text-primary shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Doctor Portal
            </button>
            <button
              type="button"
              onClick={() => handleRoleSelect("patient")}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${
                activeRole === "patient"
                  ? "bg-card text-primary shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Patient Portal
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono-tech uppercase tracking-widest text-muted-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeRole === "doctor"
                      ? "dr.bell@neurology.clinic"
                      : "eleanor.vance@patient.mail"
                  }
                  className="w-full rounded-2xl border border-border bg-shell/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono-tech uppercase tracking-widest text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-border bg-shell/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-display text-sm font-semibold text-primary-foreground transition-all hover:opacity-95 active:scale-[0.98] shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                "Authenticating..."
              ) : (
                <>
                  <span>Sign In to {activeRole === "doctor" ? "Clinical Dashboard" : "My Health Portal"}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <span className="relative bg-card px-3 text-[11px] font-mono-tech uppercase tracking-widest text-muted-foreground">
              Instant 1-Click Access
            </span>
          </div>

          {/* Instant Quick Login Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={quickLoginAsDoctor}
              className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-shell/80 px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-card active:scale-[0.99] group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary font-mono-tech text-xs font-bold">
                  MB
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    Dr. Marcus Bell, MD
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono-tech">
                    Movement Disorders Specialist • Full Clinical Telemetry
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>

            <button
              type="button"
              onClick={() => quickLoginAsPatient("PD_01")}
              className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-shell/80 px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-card active:scale-[0.99] group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono-tech text-xs font-bold">
                  EV
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-emerald-500 transition-colors">
                    Eleanor Vance (PD_01)
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono-tech">
                    Patient Profile • Paired Ring ID: RING-7842
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Medical disclaimer note */}
        <p className="mt-6 text-center text-[11px] font-mono-tech text-muted-foreground leading-relaxed">
          🔒 Encrypted clinical transmission. Decision-support tool only — not an automated diagnosis.
        </p>
      </div>
    </div>
  );
}
