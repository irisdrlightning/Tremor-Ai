/**
 * useBluetooth — Web Bluetooth API hook for Tremor AI ESP32 glove
 *
 * BLE Service / Characteristic UUIDs must match those programmed on the ESP32 firmware.
 * Defaults below are standard Nordic UART Service (NUS) UUIDs — update if your firmware
 * uses a custom service UUID.
 *
 * Web Bluetooth requires:
 *   • HTTPS or localhost
 *   • Desktop Chrome or Edge (no iOS Safari / Firefox)
 *   • A user gesture to trigger navigator.bluetooth.requestDevice()
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── BLE UUIDs — must match tremor_ai_esp32.ino exactly ───────────────────
const TREMOR_SERVICE_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000001";
const TREMOR_TX_CHAR_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000002"; // Data (Notify)
const DEVICE_NAME_PREFIX  = "TremorAI-Glove";
// Firmware also exposes:
//   Command char: "6f3c1200-1a2b-4c3d-9e8f-000000000003" (write 0x00/0x01 to stop/start)
//   Battery char: "6f3c1200-1a2b-4c3d-9e8f-000000000004" (read battery %)

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Parse a binary BLE notification payload from the ESP32 firmware.
 *
 * Packet layout (112 bytes = 4 samples × 28 bytes each, little-endian):
 *   Per sample:
 *     uint32_t  timestamp_ms   (4 bytes)
 *     float     ax, ay, az     (12 bytes — 3×4)
 *     float     gx, gy, gz     (12 bytes — 3×4)
 *   Total per sample: 28 bytes
 *
 * Returns the LAST sample in the batch as the "current" reading,
 * keeping tremorRate as the magnitude of the accel vector.
 */
function parsePayload(dataView) {
  try {
    const SAMPLE_BYTES = 28; // 4 + 6*4
    const BATCH_SIZE   = 4;
    const expected     = SAMPLE_BYTES * BATCH_SIZE; // 112 bytes

    if (dataView.byteLength < expected) return null;

    // Read all 4 samples; use the last one as the "live" reading
    let lastSample = null;
    for (let i = 0; i < BATCH_SIZE; i++) {
      const offset = i * SAMPLE_BYTES;
      const ts = dataView.getUint32(offset,      true); // little-endian
      const ax = dataView.getFloat32(offset + 4,  true);
      const ay = dataView.getFloat32(offset + 8,  true);
      const az = dataView.getFloat32(offset + 12, true);
      const gx = dataView.getFloat32(offset + 16, true);
      const gy = dataView.getFloat32(offset + 20, true);
      const gz = dataView.getFloat32(offset + 24, true);
      lastSample = { ts, ax, ay, az, gx, gy, gz };
    }

    if (!lastSample) return null;

    // Derive a scalar tremor rate from accel vector magnitude (minus gravity)
    const mag = Math.sqrt(
      lastSample.ax ** 2 + lastSample.ay ** 2 + lastSample.az ** 2
    );
    const tremorRate = parseFloat(Math.abs(mag - 1.0).toFixed(3)); // deviation from 1g baseline
    const rms = parseFloat(
      Math.sqrt((lastSample.ax ** 2 + lastSample.ay ** 2 + lastSample.az ** 2) / 3).toFixed(3)
    );

    return {
      tremorRate,
      rms,
      accelX: lastSample.ax,
      accelY: lastSample.ay,
      accelZ: lastSample.az,
      gyroX:  lastSample.gx,
      gyroY:  lastSample.gy,
      gyroZ:  lastSample.gz,
      timestampMs: lastSample.ts,
      raw: lastSample,
    };
  } catch {
    return null;
  }
}

// ─── Connection states ────────────────────────────────────────────────────────
export const BLE_STATE = {
  IDLE:         "idle",
  SCANNING:     "scanning",
  CONNECTING:   "connecting",
  CONNECTED:    "connected",
  DISCONNECTED: "disconnected",
  ERROR:        "error",
  UNSUPPORTED:  "unsupported",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBluetooth() {
  const [bleState, setBleState]         = useState(() =>
    typeof navigator !== "undefined" && navigator.bluetooth
      ? BLE_STATE.IDLE
      : BLE_STATE.UNSUPPORTED
  );
  const [deviceName, setDeviceName]     = useState(null);
  const [bleData, setBleData]           = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const deviceRef = useRef(null);
  const serverRef = useRef(null);
  const charRef   = useRef(null);

  const isSupported = bleState !== BLE_STATE.UNSUPPORTED;

  const handleNotification = useCallback((event) => {
    const parsed = parsePayload(event.target.value);
    if (parsed) setBleData(parsed);
  }, []);

  const handleDisconnect = useCallback(() => {
    setBleState(BLE_STATE.DISCONNECTED);
    setDeviceName(null);
    setBleData(null);
    charRef.current   = null;
    serverRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage("Web Bluetooth is not supported in this browser.");
      return;
    }
    setErrorMessage(null);
    setBleState(BLE_STATE.SCANNING);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: DEVICE_NAME_PREFIX },
        ],
        optionalServices: [TREMOR_SERVICE_UUID],
      });

      deviceRef.current = device;
      setDeviceName(device.name ?? "ESP32 Glove");
      device.addEventListener("gattserverdisconnected", handleDisconnect);

      setBleState(BLE_STATE.CONNECTING);
      const server  = await device.gatt.connect();
      serverRef.current = server;

      const service = await server.getPrimaryService(TREMOR_SERVICE_UUID);
      const char    = await service.getCharacteristic(TREMOR_TX_CHAR_UUID);
      charRef.current = char;

      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", handleNotification);

      setBleState(BLE_STATE.CONNECTED);
    } catch (err) {
      if (err.name === "NotFoundError" || err.name === "AbortError") {
        setBleState(BLE_STATE.IDLE);
      } else {
        setErrorMessage(err.message ?? "Bluetooth connection failed.");
        setBleState(BLE_STATE.ERROR);
      }
    }
  }, [isSupported, handleNotification, handleDisconnect]);

  const disconnect = useCallback(() => {
    if (charRef.current) {
      charRef.current.removeEventListener("characteristicvaluechanged", handleNotification);
      charRef.current.stopNotifications().catch(() => {});
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    if (deviceRef.current) {
      deviceRef.current.removeEventListener("gattserverdisconnected", handleDisconnect);
    }
    handleDisconnect();
  }, [handleNotification, handleDisconnect]);

  useEffect(() => {
    return () => {
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  return { bleState, deviceName, bleData, errorMessage, isSupported, connect, disconnect };
}
