import { useState } from "react";
import {
  Lock,
  User,
  Stethoscope,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Fingerprint,
} from "lucide-react";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import tremorIcon from "@/assets/tremor-icon.png";
import { useRole } from "@/context/RoleContext";

export default function SignInPortal({ onAuthenticated = () => {} }) {
  const { login } = useRole();
  const [portal, setPortal] = useState("patient"); // "patient" | "doctor"
  const [identifier, setIdentifier] = useState("TR-90241");
  const [passcode, setPasscode] = useState("••••");
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePortalSwitch = (newPortal) => {
    setPortal(newPortal);
    if (newPortal === "doctor") {
      setIdentifier("DR-10822");
    } else {
      setIdentifier("TR-90241");
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await login(portal, identifier, passcode);
      if (res) {
        onAuthenticated(res);
      }
    } catch (err) {
      setError("Unable to authenticate credentials. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const iconSrc = tremorIconBase64 || tremorIcon || "/tremor-icon.png";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#010a08] px-4 py-8 text-[#ededed]">
      {/* Outer rounded card frame as designed in Image 1 */}
      <div className="relative flex w-full max-w-[980px] flex-col overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.08)] bg-[#050d0a] shadow-2xl md:flex-row md:min-h-[580px]">
        {/* Left Branding Column */}
        <div className="flex flex-col justify-center border-b border-[rgba(255,255,255,0.06)] p-8 md:w-[42%] md:border-b-0 md:border-r md:p-12">
          {/* Logo & Neon Emblem */}
          <div className="mb-8 flex items-center">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#091510] border border-[#00C693]/30 p-2.5 shadow-[0_0_24px_rgba(0,198,147,0.15)]">
              <img
                src={iconSrc}
                alt="TremorAI emblem"
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
            TremorAi
          </h1>

          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#8a9992]">
            A Wearable AI glove for Monitoring Parkinson&apos;s Patients and Remote Analysis
          </p>

          <div className="mt-12 flex items-center gap-2 font-mono-tech text-xs text-[#00C693]/80">
            <span className="h-2 w-2 rounded-full bg-[#00C693] animate-pulse" />
            <span>Clinical Wearable Telemetry v1.0</span>
          </div>
        </div>

        {/* Right Authentication Form Column */}
        <div className="flex flex-1 flex-col justify-center p-8 md:p-14">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl font-bold tracking-tight text-white">
              Sign In
            </h2>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00C693]/10 text-[#00C693] border border-[#00C693]/20">
              <Lock className="h-4 w-4" />
            </div>
          </div>

          <p className="mt-1 text-xs text-[#8a9992]">
            Select your authorized portal to authenticate.
          </p>

          {/* Portal Switch Pills: Patient vs Doctor */}
          <div className="mt-6 flex h-11 w-full rounded-full border border-[rgba(255,255,255,0.1)] bg-[#091410] p-1">
            <button
              type="button"
              onClick={() => handlePortalSwitch("patient")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full font-display text-xs font-semibold transition-all ${
                portal === "patient"
                  ? "bg-[#00C693] text-[#01140e] shadow-md"
                  : "text-[#8a9992] hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch("doctor")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full font-display text-xs font-semibold transition-all ${
                portal === "doctor"
                  ? "bg-[#00C693] text-[#01140e] shadow-md"
                  : "text-[#8a9992] hover:text-white"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              <span>Doctor</span>
            </button>
          </div>

          {/* Form inputs */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Patient ID / Clinician ID Input */}
            <div>
              <label className="block font-mono-tech text-[10px] font-bold tracking-widest text-[#8a9992] uppercase">
                {portal === "patient" ? "Patient ID" : "Clinician ID"}
              </label>
              <div className="mt-1.5 flex h-12 w-full items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#08120e] px-4 transition-colors focus-within:border-[#00C693]/60">
                <Fingerprint className="h-4 w-4 text-[#8a9992] shrink-0" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={portal === "patient" ? "TR-90241" : "DR-10822"}
                  className="w-full bg-transparent font-mono-tech text-sm text-[#ededed] placeholder:text-[#8a9992]/60 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Passcode / PIN Input */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block font-mono-tech text-[10px] font-bold tracking-widest text-[#8a9992] uppercase">
                  Passcode
                </label>
                <button
                  type="button"
                  onClick={() => alert("Please consult your attending clinician to reset your secure hardware PIN.")}
                  className="font-mono-tech text-[10px] text-[#00C693] hover:underline"
                >
                  Forgot PIN?
                </button>
              </div>
              <div className="mt-1.5 flex h-12 w-full items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#08120e] px-4 transition-colors focus-within:border-[#00C693]/60">
                <KeyRound className="h-4 w-4 text-[#8a9992] shrink-0" />
                <input
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full bg-transparent font-mono-tech text-sm text-[#ededed] placeholder:text-[#8a9992]/60 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="text-[#8a9992] hover:text-white"
                  aria-label="Toggle password visibility"
                >
                  {showPasscode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="font-mono-tech text-xs text-[#ef4444]">{error}</p>
            )}

            {/* Main Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00C693] font-display text-sm font-bold text-[#01140e] transition-transform hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-[0_4px_16px_rgba(0,198,147,0.25)]"
            >
              <span>
                {loading
                  ? "Authenticating…"
                  : portal === "patient"
                  ? "Enter Patient Portal"
                  : "Enter Doctor Portal"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Social / SSO Section */}
          <div className="relative mt-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(255,255,255,0.08)]" />
            </div>
            <div className="relative flex justify-center text-center">
              <span className="bg-[#050d0a] px-3 font-mono-tech text-[10px] uppercase tracking-widest text-[#8a9992]">
                OR SIGN IN WITH
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#08120e] text-xs font-medium text-[#ededed] transition-colors hover:border-[#00C693]/40 hover:bg-[#0c1813]"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.7c-.2-.7-.4-1.5-.4-2.7 0-1.2.2-2 .4-2.7L1.6 6.4C.6 8.3 0 10.4 0 12.7s.6 4.4 1.6 6.3l3.7-4.3z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 16.4C3.5 20.3 7.4 23.5 12 23.5z"
                />
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#08120e] text-xs font-medium text-[#ededed] transition-colors hover:border-[#00C693]/40 hover:bg-[#0c1813]"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.62 1.35-.57.65-1.07 1.72-.94 2.74 1 .08 2.02-.49 2.63-1.24z" />
              </svg>
              <span>Apple</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
