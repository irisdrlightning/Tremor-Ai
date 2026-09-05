import React, { useState } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
  Zap,
} from "lucide-react";
import tremorIcon from "@/assets/tremor-icon.png";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import { useRole } from "@/context/RoleContext";

export default function AuthModal({ isOpen, onClose, targetRole = "doctor" }) {
  const { login, quickLoginAsDoctor, quickLoginAsPatient } = useRole();

  const [email, setEmail] = useState(
    targetRole === "doctor"
      ? "dr.marcus.bell@neurology.clinic"
      : "eleanor.vance@patient.mail"
  );
  const [password, setPassword] = useState("password123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password, targetRole);
      onClose();
    } catch (err) {
      setError("Authentication failed. Please verify credentials or use 1-Click Authorization.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAuth = () => {
    if (targetRole === "doctor") {
      quickLoginAsDoctor();
    } else {
      quickLoginAsPatient("PD_01");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full border border-border/60 bg-shell text-muted-foreground transition-colors hover:text-foreground hover:bg-card"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Branding */}
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-shell p-1 shadow-sm">
            <img
              src={tremorIconBase64 || tremorIcon || "/tremor-icon.png"}
              alt="Tremor AI logo"
              className="h-full w-full object-contain rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-foreground">
                {targetRole === "doctor" ? "Doctor Authorization Required" : "Patient Portal Access"}
              </h3>
            </div>
            <p className="font-mono-tech text-xs text-muted-foreground">
              {targetRole === "doctor"
                ? "Clinical security checkpoint — enter MD credentials"
                : "Enter patient credentials to view personal health data"}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Credential Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-mono-tech uppercase tracking-widest text-muted-foreground mb-1">
              {targetRole === "doctor" ? "Doctor Email" : "Patient Email"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  targetRole === "doctor"
                    ? "dr.bell@neurology.clinic"
                    : "eleanor.vance@patient.mail"
                }
                className="w-full rounded-2xl border border-border bg-shell/70 pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono-tech uppercase tracking-widest text-muted-foreground mb-1">
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
                className="w-full rounded-2xl border border-border bg-shell/70 pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-display text-xs font-semibold text-primary-foreground shadow-md hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              "Verifying Access..."
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Authorize &amp; Switch to {targetRole === "doctor" ? "Doctor View" : "Patient View"}</span>
              </>
            )}
          </button>
        </form>

        {/* 1-Click Fast Auth Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <span className="relative bg-card px-2.5 text-[10px] font-mono-tech uppercase tracking-widest text-muted-foreground">
            Fast Clinic Verification
          </span>
        </div>

        <button
          type="button"
          onClick={handleQuickAuth}
          className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-shell/80 px-4 py-2.5 text-left transition-all hover:border-primary/50 hover:bg-card active:scale-[0.99] group shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-primary/10 text-primary font-mono-tech text-xs font-bold">
              {targetRole === "doctor" ? "MB" : "EV"}
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                {targetRole === "doctor" ? "Dr. Marcus Bell, MD" : "Eleanor Vance (PD_01)"}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono-tech">
                {targetRole === "doctor"
                  ? "Movement Disorders Specialist"
                  : "Patient • Ring ID: RING-7842"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </div>
  );
}
