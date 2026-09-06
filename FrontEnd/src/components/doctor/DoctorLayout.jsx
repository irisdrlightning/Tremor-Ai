import React, { useState } from "react";
import DoctorSidebar from "./DoctorSidebar";
import DoctorTopBar from "./DoctorTopBar";
import UserProfileModal from "@/components/common/UserProfileModal";
import NotificationsModal from "@/components/kinematics/NotificationsModal";
import WearableConnectModal from "@/components/kinematics/WearableConnectModal";
import { useRole } from "@/context/RoleContext";

/**
 * DoctorLayout
 * Persistent parent shell for the Doctor Neurologist Portal:
 * - Prevents unmounting of sidebar and topbar during nested tab/route transitions.
 * - Wraps `<DoctorSidebar />` and `<DoctorTopBar />` around the inner viewport `<main>`.
 * - Manages shared modals (Bluetooth sync, notifications, user profile).
 */
export default function DoctorLayout({
  activeTab = "analyser",
  onSelectTab = () => {},
  onSignOut = () => {},
  children,
}) {
  const {
    user,
    patients,
    selectedPatient,
    selectPatient,
  } = useRole();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isWearableOpen, setIsWearableOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#000000] text-foreground overflow-hidden font-sans antialiased selection:bg-[#10B981]/30 selection:text-[#10B981]">
      {/* Persistent Left Capsule Sidebar */}
      <DoctorSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onSignOut={onSignOut}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Persistent Top Navigation & Sub-Tab Bar */}
        <DoctorTopBar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          selectedPatient={selectedPatient}
          patients={patients}
          selectPatient={selectPatient}
          clinicianName={user?.name || "Dr. Rita Sharma"}
          onOpenBluetooth={() => {
            // If selecting Bluetooth, we can switch to device sync tab or open the wearable modal
            onSelectTab("sync");
          }}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
        />

        {/* Dynamic Sub-Route Inner Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Shared Modals */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSignOut={onSignOut}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <WearableConnectModal
        isOpen={isWearableOpen}
        onClose={() => setIsWearableOpen(false)}
      />
    </div>
  );
}
