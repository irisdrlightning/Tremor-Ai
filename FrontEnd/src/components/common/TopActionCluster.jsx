import { Bluetooth, Bell, User } from "lucide-react";

/**
 * TopActionCluster - Universal 3-circle action header bar
 *
 * Strictly follows the canonical reference design (Reference Image 1):
 * - Exactly 3 circular action buttons arranged in a horizontal row (`flex items-center gap-3`)
 * - Pure solid black background (`bg-black` or `bg-[#000000]`)
 * - Subtle dark slate/gray borders (`border border-[#262626]`)
 * - Completely circular geometry (`rounded-full h-10 w-10 md:h-11 md:w-11 flex items-center justify-center`)
 * - Clean solid white line icons (`text-white`), stroke width ~1.8
 * - Strictly NO green fills, NO tinted backgrounds, NO dots/badges, NO text initials
 *
 * Buttons:
 * 1. Bluetooth (Hardware connection toggle)
 * 2. Notifications (Clinical alerts slide-over)
 * 3. User (Profile & settings modal)
 */
export default function TopActionCluster({
  onOpenBluetooth = () => {},
  onOpenNotifications = () => {},
  onOpenProfile = () => {},
  onBluetoothClick,
  onNotificationsClick,
  onProfileClick,
  className = "",
}) {
  const handleBluetooth = onBluetoothClick || onOpenBluetooth;
  const handleNotifications = onNotificationsClick || onOpenNotifications;
  const handleProfile = onProfileClick || onOpenProfile;

  return (
    <div className={`flex items-center gap-1.5 xs:gap-2 sm:gap-3 shrink-0 ${className}`}>
      {/* 1. Bluetooth Icon Action */}
      <button
        id="top-action-bluetooth-btn"
        type="button"
        aria-label="Bluetooth Connection"
        title="Hardware BLE Connection"
        onClick={handleBluetooth}
        className="flex h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-full border border-[#262626] bg-black text-white hover:border-[#404040] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Bluetooth className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 stroke-[1.8] text-white" />
      </button>

      {/* 2. Notifications Icon Action */}
      <button
        id="top-action-notifications-btn"
        type="button"
        aria-label="Notifications"
        title="Notifications & Clinical Alerts"
        onClick={handleNotifications}
        className="flex h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-full border border-[#262626] bg-black text-white hover:border-[#404040] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Bell className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 stroke-[1.8] text-white" />
      </button>

      {/* 3. Profile / User Silhouette Icon Action */}
      <button
        id="top-action-profile-btn"
        type="button"
        aria-label="User Profile"
        title="User Profile & Settings"
        onClick={handleProfile}
        className="flex h-8 w-8 xs:h-9 xs:w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-full border border-[#262626] bg-black text-white hover:border-[#404040] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <User className="h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 stroke-[1.8] text-white" />
      </button>
    </div>
  );
}
