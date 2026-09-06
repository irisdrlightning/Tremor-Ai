import { Check, LogOut, Save, User, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useRole } from "@/context/RoleContext";

export default function UserProfileModal({ isOpen, onClose, onSignOut }) {
  const { user, updateProfile, role, logout } = useRole();

  const [formData, setFormData] = useState({
    name: user?.name || "George Peter",
    initials: user?.initials || "GP",
    id: user?.id || "TR-90241",
    age: user?.age || 67,
    gender: user?.gender || "Male",
    diagnosis: user?.diagnosis || "Parkinson's Disease (Stage II)",
    phone: user?.phone || "+1 (555) 019-2834",
    email: user?.email || "george.peter@patient.tremor.ai",
    attendingPhysician: user?.attendingPhysician || "Dr. Rita Sharma, MD",
    notes: user?.notes || "Resting tremor predominant, right arm onset.",
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "George Peter",
        initials: user.initials || "GP",
        id: user.id || "TR-90241",
        age: user.age || 67,
        gender: user.gender || "Male",
        diagnosis: user.diagnosis || "Parkinson's Disease (Stage II)",
        phone: user.phone || "+1 (555) 019-2834",
        email: user.email || "george.peter@patient.tremor.ai",
        attendingPhysician: user.attendingPhysician || "Dr. Rita Sharma, MD",
        notes: user.notes || "Resting tremor predominant, right arm onset.",
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleNameChange = (nameVal) => {
    let computedInitials = formData.initials;
    const parts = nameVal.trim().split(" ");
    if (parts.length >= 2) {
      computedInitials = `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    } else if (parts.length === 1 && parts[0]) {
      computedInitials = parts[0].slice(0, 2).toUpperCase();
    }
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      initials: computedInitials,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.warn("Failed to save profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutClick = () => {
    onClose();
    if (onSignOut) {
      onSignOut();
    } else if (logout) {
      logout();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[#0c100e] shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#070b09] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[#00e599]/60 bg-[#141a17] font-mono text-sm font-bold text-[#00e599] shadow-[0_0_12px_rgba(0,229,153,0.25)]">
              {formData.initials || "GP"}
            </span>
            <div>
              <h3 className="text-base font-bold text-[#ededed]">User &amp; Patient Profile</h3>
              <p className="font-mono text-[10px] text-[#8a9992]">
                Portal Role: <span className="text-[#00e599] uppercase">{role}</span> • {formData.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[rgba(255,255,255,0.08)] text-[#8a9992] hover:text-[#ededed] hover:border-[rgba(255,255,255,0.2)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 flex-1">
          {/* Row 1: Full Name & Initials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. George Peter"
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 text-xs font-semibold text-[#ededed] placeholder:text-[#8a9992]/50 focus:border-[#00e599] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                INITIALS
              </label>
              <input
                type="text"
                maxLength={4}
                value={formData.initials}
                onChange={(e) => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 font-mono text-xs font-bold text-[#00e599] focus:border-[#00e599] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Age, Gender, Patient/Clinical ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                AGE
              </label>
              <input
                type="number"
                min="1"
                max="120"
                required
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 text-xs font-semibold text-[#ededed] focus:border-[#00e599] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                GENDER
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3 py-2.5 text-xs font-semibold text-[#ededed] focus:border-[#00e599] focus:outline-none transition-colors"
              >
                <option value="Male" className="bg-[#0c100e]">Male</option>
                <option value="Female" className="bg-[#0c100e]">Female</option>
                <option value="Other" className="bg-[#0c100e]">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                RECORD ID
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 font-mono text-xs text-[#00e599] focus:border-[#00e599] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row 3: Clinical Diagnosis & Attending Physician */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
              CLINICAL DIAGNOSIS &amp; STAGING
            </label>
            <input
              type="text"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="e.g. Parkinson's Disease (Stage II)"
              className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 text-xs font-semibold text-[#ededed] focus:border-[#00e599] focus:outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                ATTENDING PHYSICIAN
              </label>
              <input
                type="text"
                value={formData.attendingPhysician}
                onChange={(e) => setFormData({ ...formData, attendingPhysician: e.target.value })}
                placeholder="e.g. Dr. Rita Sharma, MD"
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 text-xs font-semibold text-[#ededed] focus:border-[#00e599] focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                PHONE / CONTACT
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 019-2834"
                className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 text-xs font-semibold text-[#ededed] focus:border-[#00e599] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row 4: Email */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="patient@tremor.ai"
              className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2.5 text-xs font-semibold text-[#ededed] focus:border-[#00e599] focus:outline-none transition-colors"
            />
          </div>

          {/* Row 5: Clinical Notes */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
              CLINICAL NOTES &amp; WEARABLE TELEMETRY NOTES
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Resting tremor predominant, right arm onset."
              className="w-full rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-3.5 py-2 text-xs text-[#ededed] placeholder:text-[#8a9992]/50 focus:border-[#00e599] focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 font-mono text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#141a17] px-4 py-2.5 font-mono text-xs font-semibold text-[#8a9992] hover:text-[#ededed] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-xl bg-[#00e599] px-5 py-2.5 font-mono text-xs font-bold text-[#021a11] hover:bg-[#00c985] transition-all active:scale-95 shadow-[0_0_15px_rgba(0,229,153,0.3)] disabled:opacity-75"
              >
                {savedSuccess ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSaving ? "Saving..." : "Save Details"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
