import { X, RefreshCw, Hand, Disc, Link as LinkIcon, Radio } from "lucide-react";
import { useState } from "react";

export default function WearableConnectModal({
  isOpen,
  onClose,
  onConnectGlove,
  bleState,
  deviceName,
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [connectingId, setConnectingId] = useState(null);

  if (!isOpen) return null;

  const devices = [
    {
      id: "esp32-glove",
      name: "TremorAi Glove Prototype (ESP32)",
      signal: "-48 dBm",
      battery: "88%",
      icon: Hand,
      type: "glove",
    },
    {
      id: "smart-ring",
      name: "TremorAi Smart Ring (Alpha)",
      signal: "-72 dBm",
      battery: "64%",
      icon: Disc,
      type: "ring",
    },
  ];

  const handleRescan = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  const handleDeviceConnect = async (device) => {
    setConnectingId(device.id);
    try {
      if (onConnectGlove) {
        await onConnectGlove();
      }
    } finally {
      setTimeout(() => {
        setConnectingId(null);
        onClose();
      }, 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-[460px] rounded-3xl border border-[rgba(255,255,255,0.12)] bg-[#0c100e] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-bold tracking-tight text-[#ededed]">
              Connect Hardware Wearable
            </h3>
            <p className="mt-0.5 text-xs text-[#8a9992]">
              Pair your sensor glove or ring via Web Bluetooth
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-1 text-[#8a9992] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[#ededed]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Subheader counts */}
        <div className="mt-5 flex items-center justify-between font-mono-tech text-[10px] text-[#8a9992]">
          <span className="font-bold tracking-wider uppercase text-[#ededed]/90">
            DISCOVERED DEVICES ({devices.length})
          </span>
          <span className="flex items-center gap-1 text-[#8a9992]">
            <Radio className="h-3 w-3 text-[#00e599] animate-pulse" />
            Auto-refreshing (2s)
          </span>
        </div>

        {/* Device List */}
        <div className="mt-3 space-y-2.5">
          {devices.map((device) => {
            const Icon = device.icon;
            const isConnecting = connectingId === device.id;
            return (
              <div
                key={device.id}
                className="flex items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#141a17]/80 p-3.5 transition-colors hover:border-[#00e599]/40 hover:bg-[#141a17]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00e599]/15 text-[#00e599] border border-[#00e599]/25">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-display text-xs font-semibold text-[#ededed]">
                      {device.name}
                    </h4>
                    <p className="mt-0.5 font-mono-tech text-[10px] text-[#8a9992]">
                      Signal: {device.signal} • Battery: {device.battery}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeviceConnect(device)}
                  disabled={isConnecting}
                  className="flex items-center gap-1.5 rounded-full bg-[#00e599] px-3.5 py-1.5 font-display text-xs font-bold text-[#021a11] transition-transform hover:opacity-90 active:scale-95 disabled:opacity-50"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>{isConnecting ? "Connecting…" : "Connect"}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Actions Footer */}
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRescan}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.12)] bg-[#141a17] px-4 py-2 font-display text-xs font-semibold text-[#ededed] transition-colors hover:border-[#00e599]/40 hover:text-[#00e599]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#00e599]" : ""}`} />
            <span>Rescan</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[#141a17] px-4 py-2 font-display text-xs font-semibold text-[#8a9992] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#ededed]"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
