import {
  X,
  RefreshCw,
  Link2,
  Radio,
  Bluetooth,
  Unlink,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useBluetooth, BLE_STATE } from "@/hooks/useBluetooth";

export default function WearableConnectModal({
  isOpen,
  onClose,
  onConnectBle: propConnectBle,
  onConnectGlove: propConnectGlove,
  onDisconnectGlove: propDisconnectGlove,
  bleState: propBleState,
  deviceName: propDeviceName,
  errorMessage: propErrorMessage,
  isBleSupported: propIsBleSupported,
}) {
  const internalBt = useBluetooth();

  const connectBle = propConnectBle || propConnectGlove || internalBt.connectBle;
  const disconnectGlove = propDisconnectGlove || internalBt.disconnect;
  const bleState = propBleState !== undefined ? propBleState : internalBt.bleState;
  const deviceName = propDeviceName !== undefined ? propDeviceName : internalBt.deviceName;
  const errorMessage = propErrorMessage !== undefined ? propErrorMessage : internalBt.errorMessage;
  const isBleSupported = propIsBleSupported !== undefined ? propIsBleSupported : internalBt.isBleSupported;

  const [scanning, setScanning] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setScanning(false);
      setLocalError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnected = bleState === BLE_STATE.CONNECTED;

  const handleScanBle = async () => {
    setLocalError(null);
    setScanning(true);
    try {
      if (typeof navigator !== "undefined" && !navigator.bluetooth) {
        setLocalError(
          "Web Bluetooth is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera over HTTPS/localhost."
        );
        return;
      }
      if (connectBle) {
        await connectBle();
      }
    } catch (err) {
      console.warn("[WearableModal] Scan BLE error:", err);
      if (err?.name !== "NotFoundError" && err?.name !== "AbortError") {
        setLocalError(err?.message || "Failed to initiate Bluetooth scan.");
      }
    } finally {
      setScanning(false);
    }
  };

  const handleDisconnect = () => {
    if (disconnectGlove) {
      disconnectGlove();
    }
  };

  const activeError = localError || errorMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        className="w-full max-w-md rounded-3xl border border-[#1e293b] bg-[#000000] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-[#10B981] animate-pulse" : "bg-[#10B981]"
                }`}
              />
              <h3 className="font-display text-lg font-semibold tracking-tight text-white">
                Connect Sensor Wearable
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Pair your telemetry glove or smart ring via Web Bluetooth
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:text-white hover:bg-slate-900 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2. Device Status Row (Top Pill Bar) */}
        <div className="mt-5 flex items-center justify-between rounded-xl border border-[#1e293b] bg-black px-4 py-2.5 font-mono text-xs">
          <span className="flex items-center gap-2 text-slate-300">
            <Radio
              className={`h-3.5 w-3.5 ${
                isConnected
                  ? "text-[#10B981]"
                  : scanning
                  ? "text-[#10B981] animate-ping"
                  : "text-slate-400"
              }`}
            />
            <span>
              {isConnected
                ? "Hardware Connected & Active"
                : scanning
                ? "Scanning for Bluetooth Wearable…"
                : "Hardware Node"}
            </span>
          </span>
          <span className="text-[#10B981] font-medium font-mono text-xs">
            {isConnected ? "100 Hz Streaming" : "MPU6050 (0x68)"}
          </span>
        </div>

        {/* Diagnostic Error Notice */}
        {activeError && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-mono text-[11px] leading-relaxed">{activeError}</span>
          </div>
        )}

        {/* 3. Primary Device Pairing / Connected Card */}
        <div className="mt-4 space-y-3">
          {isConnected ? (
            /* Active Connected State */
            <div className="w-full rounded-2xl border border-[#10B981] bg-[#0b1214] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black border border-[#10B981] text-[#10B981]">
                    <Bluetooth className="w-6 h-6 text-[#10B981]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm font-semibold text-white truncate">
                        {deviceName || "TremorAi ESP32 Glove"}
                      </h4>
                      <span className="rounded-full bg-black border border-[#10B981] px-2 py-0.5 font-mono text-[9px] font-bold text-[#10B981]">
                        CONNECTED
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                      100 Hz MPU6050 (6-DOF) • Web BLE GATT
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/30 px-3.5 py-2 font-display text-xs font-semibold text-red-400 transition-colors hover:bg-red-900/60 hover:text-white cursor-pointer"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-[#1e293b] pt-2.5 font-mono text-[10px] text-[#10B981]">
                <Zap className="h-3 w-3 animate-pulse" />
                <span>Transmitting live accelerometer and gyroscope vectors</span>
              </div>
            </div>
          ) : (
            /* Discovery & Pairing Card */
            <>
              <div className="w-full bg-[#0b1214] border border-[#1e293b] rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-[#10B981]">
                {/* Left Side: Icon + Info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl border border-[#10B981] bg-black flex items-center justify-center shrink-0">
                    <Bluetooth className="w-6 h-6 text-[#10B981]" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">
                      TremorAi ESP32 Glove
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                      Ready to pair • 100 Hz stream
                    </p>
                  </div>
                </div>

                {/* Right Side: CTA Button */}
                <button
                  type="button"
                  onClick={handleScanBle}
                  disabled={scanning}
                  className="bg-[#10B981] text-black font-semibold text-xs px-4 py-2.5 rounded-xl hover:brightness-110 flex items-center gap-2 shrink-0 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{scanning ? "Scanning…" : "Pair Device"}</span>
                </button>
              </div>

              {/* 4. Diagnostic Firmware Guidance Notice */}
              <div className="rounded-xl border border-dashed border-slate-800 bg-black/40 p-3 text-center">
                <p className="font-mono text-[11px] text-slate-400 leading-relaxed">
                  Ensure hardware is powered on and within pairing range (I2C nodes active: SDA 21, SCL 22).
                </p>
              </div>
            </>
          )}
        </div>

        {/* 5. Modal Footer Action Bar */}
        <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-900">
          <button
            type="button"
            onClick={handleScanBle}
            disabled={scanning}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-black px-4 py-2.5 font-display text-xs font-medium text-white transition-colors hover:border-slate-500 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${scanning ? "animate-spin text-[#10B981]" : "text-slate-300"}`}
            />
            <span>Rescan Devices</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 font-display text-xs font-medium text-slate-400 transition-colors hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
