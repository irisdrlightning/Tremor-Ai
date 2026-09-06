import { useState, useEffect } from "react";
import {
  Lock,
  User,
  Stethoscope,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Fingerprint,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  X,
  RefreshCw,
} from "lucide-react";
import { tremorIconBase64 } from "@/assets/tremorIconBase64";
import tremorIcon from "@/assets/tremor-icon.png";
import { useRole } from "@/context/RoleContext";
import api from "@/services/api";

export default function SignInPortal({ onAuthenticated = () => {} }) {
  const { login } = useRole();
  const [portal, setPortal] = useState("patient"); // "patient" | "doctor"
  const [identifier, setIdentifier] = useState("TR-90241");
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(null); // "google" | "apple" | null
  const [error, setError] = useState(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Forgot PIN state
  const [resetId, setResetId] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPass, setNewPass] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1 = request code, 2 = enter new pass
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedId = localStorage.getItem("tremor_remembered_id");
      if (savedId) setIdentifier(savedId);
    }
  }, []);

  const handlePortalSwitch = (newPortal) => {
    setPortal(newPortal);
    setError(null);
    if (newPortal === "doctor") {
      setIdentifier("DR-10822");
      setPasscode("");
    } else {
      setIdentifier("TR-90241");
      setPasscode("");
    }
  };

  const handleQuickAutofill = () => {
    setError(null);
    if (portal === "doctor") {
      setIdentifier("DR-10822");
      setPasscode("10822");
    } else {
      setIdentifier("TR-90241");
      setPasscode("90241");
    }
  };

  const calculatePasscodeStrength = (pass) => {
    if (!pass) return { score: 0, label: "Empty", color: "bg-zinc-700" };
    if (pass.length < 4) return { score: 1, label: "Too Short", color: "bg-red-500" };
    if (pass.length <= 5 && /^\d+$/.test(pass)) return { score: 2, label: "PIN Code", color: "bg-amber-400" };
    if (pass.length >= 6 && /[A-Z]/.test(pass) && /[0-9]/.test(pass)) {
      return { score: 4, label: "Strong SHA-256", color: "bg-[#10B981]" };
    }
    return { score: 3, label: "Standard", color: "bg-[#10B981]" };
  };

  const passStrength = calculatePasscodeStrength(passcode);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your Patient ID or Clinician ID.");
      return;
    }
    if (!passcode) {
      setError("Please enter your secure passcode or PIN.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (rememberMe && typeof window !== "undefined") {
        localStorage.setItem("tremor_remembered_id", identifier.trim());
      }
      const res = await login(portal, identifier.trim(), passcode.trim());
      if (res) {
        onAuthenticated(res);
      }
    } catch (err) {
      setError(err.message || "Invalid credentials. Please verify your ID and passcode.");
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = async (provider) => {
    setSsoLoading(provider);
    setError(null);
    try {
      // Simulate OAuth SSO exchange
      await new Promise((resolve) => setTimeout(resolve, 800));
      const ssoId = portal === "doctor" ? "DR-10822" : "TR-90241";
      const ssoPass = portal === "doctor" ? "10822" : "90241";
      const res = await login(portal, ssoId, ssoPass);
      if (res) {
        onAuthenticated(res);
      }
    } catch (err) {
      setError(`SSO authentication with ${provider} failed: ${err.message}`);
    } finally {
      setSsoLoading(null);
    }
  };

  const handleResetPinSubmit = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage(null);
    try {
      if (resetStep === 1) {
        // Step 1: Simulated verification code dispatch
        await new Promise((res) => setTimeout(res, 600));
        setResetCode(portal === "doctor" ? "10822" : "90241");
        setResetStep(2);
        setResetMessage("Verification code sent to registered clinic mobile (+1 555-***-2834).");
      } else {
        // Step 2: Set new PIN
        const res = await api.resetPin(resetId || identifier, resetCode, newPass);
        setResetMessage(res.message || "Passcode successfully reset!");
        setPasscode(newPass);
        setTimeout(() => {
          setShowForgotModal(false);
          setResetStep(1);
          setResetMessage(null);
        }, 1500);
      }
    } catch (err) {
      setResetMessage(`Reset failed: ${err.message}`);
    } finally {
      setResetLoading(false);
    }
  };

  const iconSrc = tremorIconBase64 || tremorIcon || "/tremor-icon.png";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black px-4 py-8 text-[#ededed]">
      {/* Forgot PIN / Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#152326] bg-black p-6">
            <div className="flex items-center justify-between border-b border-[#152326] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#10B981]" />
                <h4 className="text-sm font-bold text-[#ededed]">Secure PIN / Passcode Recovery</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setResetStep(1);
                  setResetMessage(null);
                }}
                className="text-[#8a9992] hover:text-[#ededed] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPinSubmit} className="mt-4 space-y-4">
              {resetStep === 1 ? (
                <>
                  <p className="text-xs text-[#8a9992] leading-relaxed">
                    Enter your Patient ID or Clinician ID to receive a secure recovery code via your registered medical contact.
                  </p>
                  <div>
                    <label className="block font-mono-tech text-[10px] uppercase tracking-wider text-[#8a9992] mb-1">
                      USER IDENTIFIER
                    </label>
                    <input
                      type="text"
                      value={resetId || identifier}
                      onChange={(e) => setResetId(e.target.value)}
                      placeholder="e.g. TR-90241 or DR-10822"
                      className="w-full rounded-xl border border-[#152326] bg-black px-4 py-2.5 font-mono-tech text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs text-[#10B981] leading-relaxed flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Enter the verification code and your new secure passcode.</span>
                  </p>
                  <div>
                    <label className="block font-mono-tech text-[10px] uppercase tracking-wider text-[#8a9992] mb-1">
                      VERIFICATION CODE
                    </label>
                    <input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="Enter 5-digit code"
                      className="w-full rounded-xl border border-[#152326] bg-black px-4 py-2.5 font-mono-tech text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-mono-tech text-[10px] uppercase tracking-wider text-[#8a9992] mb-1">
                      NEW PASSCODE / PIN
                    </label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full rounded-xl border border-[#152326] bg-black px-4 py-2.5 font-mono-tech text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {resetMessage && (
                <p className="font-mono-tech text-xs text-[#10B981] bg-black border border-[#10B981] p-2 rounded-lg">
                  {resetMessage}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[#8a9992] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-[#10B981] px-5 py-2 text-xs font-bold text-black hover:bg-[#059669] transition-colors disabled:opacity-50"
                >
                  {resetLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{resetStep === 1 ? "Send Verification Code" : "Update Passcode"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Outer rounded card frame */}
      <div className="relative flex w-full max-w-[980px] flex-col overflow-hidden rounded-[28px] border border-[#152326] bg-black md:flex-row md:min-h-[590px]">
        {/* Left Branding Column */}
        <div className="flex flex-col justify-between border-b border-[#152326] p-8 md:w-[42%] md:border-b-0 md:border-r md:p-12">
          <div>
            {/* Logo & Emblem */}
            <div className="mb-6 flex items-center">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black border border-[#10B981] p-2.5">
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
          </div>

          <div className="mt-8 flex items-center gap-2 font-mono-tech text-xs text-[#10B981]">
            <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Clinical Wearable Telemetry v3.0</span>
          </div>
        </div>

        {/* Right Authentication Form Column */}
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight text-white">
                Sign In
              </h2>
              <p className="mt-1 text-xs text-[#8a9992]">
                Select your authorized portal to authenticate securely.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-[#10B981] border border-[#10B981]">
              <Lock className="h-4 w-4" />
            </div>
          </div>

          {/* Portal Switch Pills: Patient vs Doctor */}
          <div className="mt-6 flex h-11 w-full rounded-full border border-[#152326] bg-black p-1">
            <button
              type="button"
              onClick={() => handlePortalSwitch("patient")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full font-display text-xs font-semibold transition-all ${
                portal === "patient"
                  ? "bg-[#10B981] text-black"
                  : "text-[#8a9992] hover:text-white"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>Patient Portal</span>
            </button>

            <button
              type="button"
              onClick={() => handlePortalSwitch("doctor")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full font-display text-xs font-semibold transition-all ${
                portal === "doctor"
                  ? "bg-[#10B981] text-black"
                  : "text-[#8a9992] hover:text-white"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              <span>Doctor Portal</span>
            </button>
          </div>

          {/* Form inputs */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Patient ID / Clinician ID Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-mono-tech text-[10px] font-bold tracking-widest text-[#8a9992] uppercase">
                  {portal === "patient" ? "Patient Identifier" : "Clinician ID / Email"}
                </label>
                <button
                  type="button"
                  onClick={handleQuickAutofill}
                  className="flex items-center gap-1 font-mono-tech text-[10px] text-[#10B981] hover:underline"
                  title="Auto-fill recommended demo credentials"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Auto-fill {portal === "doctor" ? "DR-10822" : "TR-90241"}</span>
                </button>
              </div>
              <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-[#152326] bg-black px-4 transition-colors focus-within:border-[#10B981]">
                <Fingerprint className="h-4 w-4 text-[#8a9992] shrink-0" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={portal === "patient" ? "e.g. TR-90241 or george.peter@patient.tremor.ai" : "e.g. DR-10822 or dr.sharma@tremor.ai"}
                  className="w-full bg-transparent font-mono-tech text-sm text-[#ededed] placeholder:text-[#8a9992]/50 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Passcode / PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-mono-tech text-[10px] font-bold tracking-widest text-[#8a9992] uppercase">
                  Security Passcode / PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="font-mono-tech text-[10px] text-[#10B981] hover:underline"
                >
                  Forgot PIN?
                </button>
              </div>
              <div className="flex h-12 w-full items-center gap-3 rounded-xl border border-[#152326] bg-black px-4 transition-colors focus-within:border-[#10B981]">
                <KeyRound className="h-4 w-4 text-[#8a9992] shrink-0" />
                <input
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={portal === "doctor" ? "Enter PIN (10822) or password" : "Enter PIN (90241) or password"}
                  className="w-full bg-transparent font-mono-tech text-sm text-[#ededed] placeholder:text-[#8a9992]/50 focus:outline-none tracking-normal"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="text-[#8a9992] hover:text-[#10B981] transition-colors p-1"
                  aria-label={showPasscode ? "Hide password" : "Show password"}
                  title={showPasscode ? "Hide password" : "Show password"}
                >
                  {showPasscode ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Passcode Security & Strength Indicator */}
              {passcode && (
                <div className="mt-2 flex items-center justify-between font-mono-tech text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#8a9992]">Security:</span>
                    <span className="font-semibold text-[#10B981]">{passStrength.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((bar) => (
                      <span
                        key={bar}
                        className={`h-1 w-5 rounded-full transition-colors ${
                          passStrength.score >= bar ? passStrength.color : "bg-[#152326]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Remember Me & Workstation Trust */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border border-[#152326] bg-black text-[#10B981] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#10B981]"
                />
                <span className="font-mono-tech text-[11px] text-[#8a9992]">Remember workstation</span>
              </label>
              <span className="font-mono-tech text-[10px] text-[#8a9992] flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-[#10B981]" /> AES-256 Cloud
              </span>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="font-mono-tech text-xs">{error}</span>
              </div>
            )}

            {/* Main Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] font-display text-sm font-bold text-black transition-all hover:bg-[#059669] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  <span>Verifying Credentials…</span>
                </>
              ) : (
                <>
                  <span>
                    {portal === "patient"
                      ? "Enter Patient Portal"
                      : "Enter Doctor Portal"}
                  </span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Social / SSO Section */}
          <div className="relative mt-7 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#152326]" />
            </div>
            <div className="relative flex justify-center text-center">
              <span className="bg-black px-3 font-mono-tech text-[10px] uppercase tracking-widest text-[#8a9992]">
                OR CLINICAL SSO AUTHENTICATION
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={Boolean(ssoLoading)}
              onClick={() => handleSsoLogin("Google Workspace")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#152326] bg-black text-xs font-medium text-[#ededed] transition-colors hover:border-[#10B981]/50 hover:bg-black disabled:opacity-50 cursor-pointer"
            >
              {ssoLoading === "Google Workspace" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#10B981]" />
              ) : (
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
              )}
              <span>Google Identity</span>
            </button>

            <button
              type="button"
              disabled={Boolean(ssoLoading)}
              onClick={() => handleSsoLogin("Apple Health ID")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#152326] bg-black text-xs font-medium text-[#ededed] transition-colors hover:border-[#10B981]/50 hover:bg-black disabled:opacity-50 cursor-pointer"
            >
              {ssoLoading === "Apple Health ID" ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#10B981]" />
              ) : (
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.62 1.35-.57.65-1.07 1.72-.94 2.74 1 .08 2.02-.49 2.63-1.24z" />
                </svg>
              )}
              <span>Apple Health ID</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
