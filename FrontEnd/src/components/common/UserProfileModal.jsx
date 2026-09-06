import React, { useState, useEffect } from "react";
import { Check, LogOut, Save, User, X, Stethoscope, Building, Award, Mail, Phone, FileText } from "lucide-react";
import { useRole } from "@/context/RoleContext";

export default function UserProfileModal({ isOpen, onClose, onSignOut }) {
  const { user, updateProfile, role, logout } = useRole();
  const isDoctor = role === "doctor";

  const [formData, setFormData] = useState({
    name: user?.name || (isDoctor ? "Dr. Emily Rochers, MD" : "George Peter"),
    initials: user?.initials || (isDoctor ? "ER" : "GP"),
    id: user?.id || (isDoctor ? "DR-10822" : "TR-90241"),
    age: user?.age || 67,
    gender: user?.gender || "Male",
    diagnosis: user?.diagnosis || "Parkinson's Disease (Stage II)",
    phone: user?.phone || (isDoctor ? "+1 (555) 392-8190" : "+1 (555) 019-2834"),
    email: user?.email || (isDoctor ? "e.rochers@tremor.ai" : "george.peter@patient.tremor.ai"),
    department: user?.department || "Neurology & Movement Disorders",
    hospital: user?.hospital || "Movement Disorders Center & Telemetry Lab",
    specialization: user?.specialization || "Parkinson's Disease Titration & Kinematic Biomarkers",
    attendingPhysician: user?.attendingPhysician || "Dr. Emily Rochers, MD",
    notes: user?.notes || (isDoctor ? "Senior Clinical Neurophysiologist & Movement Disorder Specialist" : "Resting tremor predominant, right arm onset."),
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || (isDoctor ? "Dr. Emily Rochers, MD" : "George Peter"),
        initials: user.initials || (isDoctor ? "ER" : "GP"),
        id: user.id || (isDoctor ? "DR-10822" : "TR-90241"),
        age: user.age || 67,
        gender: user.gender || "Male",
        diagnosis: user.diagnosis || "Parkinson's Disease (Stage II)",
        phone: user.phone || (isDoctor ? "+1 (555) 392-8190" : "+1 (555) 019-2834"),
        email: user.email || (isDoctor ? "e.rochers@tremor.ai" : "george.peter@patient.tremor.ai"),
        department: user.department || "Neurology & Movement Disorders",
        hospital: user.hospital || "Movement Disorders Center & Telemetry Lab",
        specialization: user.specialization || "Parkinson's Disease Titration & Kinematic Biomarkers",
        attendingPhysician: user.attendingPhysician || "Dr. Emily Rochers, MD",
        notes: user.notes || (isDoctor ? "Senior Clinical Neurophysiologist & Movement Disorder Specialist" : "Resting tremor predominant, right arm onset."),
      });
    }
  }, [user, isOpen, isDoctor]);

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
      <div className="relative w-full max-w-lg rounded-2xl border border-[#152326] bg-black shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#152326] bg-black px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-[#10B981] bg-black font-mono text-sm font-bold text-[#10B981]">
              {formData.initials || (isDoctor ? "ER" : "GP")}
            </span>
            <div>
              <h3 className="text-base font-bold text-[#ededed]">
                {isDoctor ? "Doctor & Clinician Profile" : "User & Patient Profile"}
              </h3>
              <p className="font-mono text-[10px] text-[#8a9992]">
                Portal Role: <span className="text-[#10B981] uppercase">{role}</span> • {formData.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg border border-[#152326] text-[#8a9992] hover:text-[#ededed] hover:border-[#10B981] transition-colors cursor-pointer"
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
                {isDoctor ? "CLINICIAN NAME" : "FULL NAME"}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none transition-colors"
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
                onChange={(e) => setFormData((p) => ({ ...p, initials: e.target.value.toUpperCase() }))}
                className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-center font-mono font-bold text-[#10B981] focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Doctor-specific fields or Patient fields */}
          {isDoctor ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                    CLINICAL ID / NPI
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData((p) => ({ ...p, id: e.target.value }))}
                    className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] font-mono focus:border-[#10B981] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                    DEPARTMENT
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                    className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                  SPECIALIZATION &amp; FOCUS
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData((p) => ({ ...p, specialization: e.target.value }))}
                  className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                  HOSPITAL / CLINIC AFFILIATION
                </label>
                <input
                  type="text"
                  value={formData.hospital}
                  onChange={(e) => setFormData((p) => ({ ...p, hospital: e.target.value }))}
                  className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                    PATIENT ID
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData((p) => ({ ...p, id: e.target.value }))}
                    className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] font-mono focus:border-[#10B981] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                    AGE
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData((p) => ({ ...p, age: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                    GENDER
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full rounded-xl border border-[#152326] bg-black px-3 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                  PRIMARY DIAGNOSIS
                </label>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData((p) => ({ ...p, diagnosis: e.target.value }))}
                  className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Contact Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                PHONE NUMBER
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
                OFFICIAL EMAIL
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-xl border border-[#152326] bg-black px-3.5 py-2.5 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>

          {/* Clinical Notes / Description */}
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8a9992]">
              {isDoctor ? "CLINICAL PROFILE SUMMARY & CREDENTIALS" : "PATIENT CLINICAL NOTES"}
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-xl border border-[#152326] bg-black p-3 text-sm text-[#ededed] focus:border-[#10B981] focus:outline-none resize-none"
            />
          </div>

          {savedSuccess && (
            <div className="rounded-xl border border-[#10B981] bg-black p-3 text-center text-xs font-semibold text-[#10B981] flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              <span>Profile details saved successfully.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-[#152326]">
            <button
              type="button"
              onClick={handleLogoutClick}
              className="flex items-center gap-1.5 text-xs text-[#ff4d4f] hover:underline font-mono cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#152326] bg-transparent px-4 py-2 text-xs font-semibold text-[#8a9992] hover:text-[#ededed] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-[#10B981] px-5 py-2 text-xs font-bold text-black hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
