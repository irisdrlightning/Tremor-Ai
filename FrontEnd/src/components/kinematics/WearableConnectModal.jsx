import {
  X,
  RefreshCw,
  Link as LinkIcon,
  Radio,
  Bluetooth,
  CheckCircle2,
  Unlink,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { BLE_STATE } from "@/hooks/useBluetooth";

export default function WearableConnectModal({
  isOpen,
  onClose,
  onConnectBle,
  onConnectGlove,
  onDisconnectGlove,
  bleState,
  deviceName,
  errorMessage,
  isBleSupported = true,
}) {
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setScanning(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = bleState === BLE_STATE.CONNECTED;

  const handleScanBle = async () => {
    setScanning(true);
    try {
      if (onConnectBle) {
        await onConnectBle();
      } else if (onConnectGlove) {
        await onConnectGlove();
      }
    } finally {
      setScanning(false);
      if (bleState === BLE_STATE.CONNECTED) {
        onClose();
      }
    }
  };

  const handleDisconnect = () => {
    if (onDisconnectGlove) {
      onDisconnectGlove();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        className="w-full max-w-[490px] rounded-3xl border border-[rgba(255,255,255,0.12)] bg-[#070d0a] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-[#00e599] animate-pulse" : "bg-[#8a9992]"}`} />
              <h3 className="font-display text-lg font-bold tracking-tight text-[#ededed]">
                Connect Bluetooth Wearable
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#8a9992]">
              Pair your original physical ESP32 MPU6050 glove via Web Bluetooth
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-1.5 text-[#8a9992] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[#ededed]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scanning / Connection status banner */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0c1410] px-4 py-2.5 font-mono-tech text-[10px]">
          <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-[#ededed]">
            <Radio
              className={`h-3.5 w-3.5 ${
                isConnected
                  ? "text-[#00e599]"
                  : scanning
                  ? "text-[#00e599] animate-ping"
                  : "text-[#8a9992]"
              }`}
            />
            {isConnected
              ? "Hardware Connected & Active"
              : scanning
              ? "Browser Device Scanner Active…"
              : "Original Physical Bluetooth Device"}
          </span>
          <span className="text-[#00e599] font-medium">
            {isConnected ? "100 Hz Streaming" : "MPU6050 0x68"}
          </span>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-mono-tech text-[11px]">{errorMessage}</span>
          </div>
        )}

        {/* Dynamic Hardware Device Section */}
        <div className="mt-4 space-y-3">
          {isConnected ? (
            /* Active Connected Physical Device Card */
            <div className="rounded-2xl border border-[#00e599]/40 bg-[#0d1c15] p-4 shadow-[0_0_20px_rgba(0,229,153,0.12)]">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#00e599]/20 text-[#00e599] border border-[#00e599]/30">
                    <Bluetooth className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm font-bold text-[#ededed]">
                        {deviceName || "TremorAI-Glove"}
                      </h4>
                      <span className="rounded bg-[#00e599]/20 border border-[#00e599]/40 px-2 py-0.5 font-mono-tech text-[9px] font-bold text-[#00e599]">
                        CONNECTED
                      </span>
                    </div>
                    <p className="mt-1 font-mono-tech text-[10px] text-[#8a9992]">
                      Stream: 100 Hz MPU6050 (6-DOF) • Web Bluetooth GATT
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1.5 font-display text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-white"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-[rgba(255,255,255,0.06)] pt-2.5 font-mono-tech text-[10px] text-[#00e599]">
                <Zap className="h-3 w-3 animate-pulse" />
                <span>Transmitting live accelerometer and gyroscope vectors</span>
              </div>
            </div>
          ) : (
            /* Genuine Physical Hardware Discovery Options */
            <>
              <div className="group flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0d1612] p-4 transition-all hover:border-[#00e599]/50 hover:bg-[#111c17]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00e599]/15 text-[#00e599] border border-[#00e599]/25 group-hover:scale-105 transition-transform">
                    <Bluetooth className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="truncate font-display text-sm font-semibold text-[#ededed]">
                        Scan TremorAI ESP32 Glove
                      </h4>
                      <span className="rounded bg-[#00e599]/10 border border-[#00e599]/20 px-1.5 py-0.2 font-mono-tech text-[8px] font-bold text-[#00e599]">
                        WIRELESS BLE
                      </span>
                    </div>
                    <p className="mt-0.5 truncate font-mono-tech text-[11px] text-[#8a9992]">
                      Pair physical ESP32 via browser Bluetooth device list
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleScanBle}
                  disabled={scanning || !isBleSupported}
                  className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#00e599] px-4 py-2 font-display text-xs font-bold text-[#021a11] shadow-sm transition-transform active:scale-95 hover:opacity-90 disabled:opacity-50"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>{scanning ? "Scanning…" : "Pair BLE"}</span>
                </button>
              </div>

              {/* Hardware Instructions Note */}
              <div className="rounded-2xl border border-dashed border-[rgba(255,255,255,0.12)] bg-[#09120e] p-3 text-center">
                <p className="font-mono-tech text-[11px] text-[#8a9992]">
                  Ensure physical ESP32 is powered on running tremor_ai_esp32.ino with MPU6050 (SDA: 21, SCL: 22).
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions Footer */}
        <div className="mt-5 flex items-center justify-between gap-2 border-t border-[rgba(255,255,255,0.06)] pt-4">
          <button
            type="button"
            onClick={handleScanBle}
            disabled={scanning}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[#101b15] px-4 py-2 font-display text-xs font-semibold text-[#ededed] transition-colors hover:border-[#00e599]/40 hover:text-[#00e599] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scanning ? "animate-spin text-[#00e599]" : ""}`} />
            <span>Scan Bluetooth</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#101b15] px-4 py-2 font-display text-xs font-semibold text-[#8a9992] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ededed]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}



