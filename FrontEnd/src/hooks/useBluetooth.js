/**
 * useBluetooth — Web Bluetooth API hook for Tremor AI ESP32 glove
 *
 * Web Bluetooth requires:
 *   • HTTPS or localhost
 *   • Desktop Chrome or Edge (Chromium-based browsers)
 *   • A user gesture (button click) to trigger navigator.bluetooth.requestDevice()
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── BLE UUIDs ────────────────────────────────────────────────────────────────
// Tremor AI Custom GATT Service (matches tremor_ai_esp32.ino)
const TREMOR_SERVICE_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000001";
const TREMOR_TX_CHAR_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000002"; // Data (Notify)
const TREMOR_CMD_CHAR_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000003"; // Write (0x01/0x00)
const TREMOR_BATT_CHAR_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000004"; // Battery

// Standard Nordic UART Service (NUS)
const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_CHAR_UUID  = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify from device
const NUS_RX_CHAR_UUID  = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write to device

// Standard Bluetooth SIG UUIDs for discovery
const BATTERY_SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb";
const GENERIC_ACCESS_UUID  = "00001800-0000-1000-8000-00805f9b34fb";
const DEV_INFO_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Parse incoming BLE notification payload from ESP32.
 * Supports:
 *   1. 112-byte batch (4 samples × 28 bytes little-endian binary)
 *   2. 28-byte single sample (1 sample × 28 bytes binary)
 *   3. Text CSV line (e.g. "timestamp_ms,ax,ay,az,gx,gy,gz")
 *   4. JSON string (e.g. {"ax": 0.1, "ay": 0.2, ...})
 */
function parsePayload(dataView) {
  if (!dataView || dataView.byteLength === 0) return null;

  try {
    const byteLen = dataView.byteLength;

    // ── 1. Batch Binary Payload (112 bytes = 4 × 28 bytes) ──
    if (byteLen >= 112) {
      const SAMPLE_BYTES = 28;
      const count = Math.floor(byteLen / SAMPLE_BYTES);
      let lastSample = null;

      for (let i = 0; i < count; i++) {
        const offset = i * SAMPLE_BYTES;
        const ts = dataView.getUint32(offset, true);
        const ax = dataView.getFloat32(offset + 4, true);
        const ay = dataView.getFloat32(offset + 8, true);
        const az = dataView.getFloat32(offset + 12, true);
        const gx = dataView.getFloat32(offset + 16, true);
        const gy = dataView.getFloat32(offset + 20, true);
        const gz = dataView.getFloat32(offset + 24, true);
        lastSample = { ts, ax, ay, az, gx, gy, gz };
      }

      if (lastSample) {
        return buildTelemetryObject(lastSample);
      }
    }

    // ── 2. Single Sample Binary (28 bytes) ──
    if (byteLen >= 28 && byteLen < 112) {
      const ts = dataView.getUint32(0, true);
      const ax = dataView.getFloat32(4, true);
      const ay = dataView.getFloat32(8, true);
      const az = dataView.getFloat32(12, true);
      const gx = dataView.getFloat32(16, true);
      const gy = dataView.getFloat32(20, true);
      const gz = dataView.getFloat32(24, true);
      return buildTelemetryObject({ ts, ax, ay, az, gx, gy, gz });
    }

    // ── 3. Text / CSV / JSON string payload ──
    const decoder = new TextDecoder("utf-8");
    const rawText = decoder.decode(dataView).trim();
    if (!rawText) return null;

    if (rawText.startsWith("{") && rawText.endsWith("}")) {
      const parsed = JSON.parse(rawText);
      const sample = {
        ts: Number(parsed.ts || parsed.timestamp_ms || Date.now()),
        ax: Number(parsed.ax || parsed.accelX || 0),
        ay: Number(parsed.ay || parsed.accelY || 0),
        az: Number(parsed.az || parsed.accelZ || 0),
        gx: Number(parsed.gx || parsed.gyroX || 0),
        gy: Number(parsed.gy || parsed.gyroY || 0),
        gz: Number(parsed.gz || parsed.gyroZ || 0),
      };
      return buildTelemetryObject(sample);
    }

    // CSV format: timestamp_ms,ax,ay,az,gx,gy,gz
    const parts = rawText.split(",").map((p) => p.trim());
    if (parts.length >= 7) {
      const ts = parseFloat(parts[0]) || Date.now();
      const ax = parseFloat(parts[1]) || 0;
      const ay = parseFloat(parts[2]) || 0;
      const az = parseFloat(parts[3]) || 0;
      const gx = parseFloat(parts[4]) || 0;
      const gy = parseFloat(parts[5]) || 0;
      const gz = parseFloat(parts[6]) || 0;
      return buildTelemetryObject({ ts, ax, ay, az, gx, gy, gz });
    }
  } catch (err) {
    console.debug("[useBluetooth] Payload parse error:", err);
  }
  return null;
}

function buildTelemetryObject(sample) {
  const mag = Math.sqrt(sample.ax ** 2 + sample.ay ** 2 + sample.az ** 2);
  const rms = parseFloat(
    Math.sqrt((sample.ax ** 2 + sample.ay ** 2 + sample.az ** 2) / 3).toFixed(3)
  );

  return {
    rms,
    accelMag: parseFloat(mag.toFixed(3)),
    accelX: sample.ax,
    accelY: sample.ay,
    accelZ: sample.az,
    gyroX: sample.gx,
    gyroY: sample.gy,
    gyroZ: sample.gz,
    timestampMs: sample.ts,
    raw: sample,
  };
}

// ─── Connection states ────────────────────────────────────────────────────────
export const BLE_STATE = {
  IDLE: "idle",
  SCANNING: "scanning",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  ERROR: "error",
  UNSUPPORTED: "unsupported",
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBluetooth() {
  const [bleState, setBleState] = useState(() =>
    typeof navigator !== "undefined" && navigator.bluetooth
      ? BLE_STATE.IDLE
      : BLE_STATE.UNSUPPORTED
  );
  const [deviceName, setDeviceName] = useState(null);
  const [bleData, setBleData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const deviceRef = useRef(null);
  const serverRef = useRef(null);
  const charRef = useRef(null);

  const isSupported =
    typeof navigator !== "undefined" && Boolean(navigator.bluetooth);

  const handleNotification = useCallback((event) => {
    const parsed = parsePayload(event.target.value);
    if (parsed) setBleData(parsed);
  }, []);

  const handleDisconnect = useCallback(() => {
    setBleState(BLE_STATE.DISCONNECTED);
    setDeviceName(null);
    setBleData(null);
    charRef.current = null;
    serverRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (!isSupported) {
      setErrorMessage(
        "Web Bluetooth requires Chrome or Edge (on HTTPS or localhost)."
      );
      setBleState(BLE_STATE.UNSUPPORTED);
      return;
    }

    setErrorMessage(null);
    setBleState(BLE_STATE.SCANNING);

    try {
      const optionalServices = [
        TREMOR_SERVICE_UUID,
        NUS_SERVICE_UUID,
        BATTERY_SERVICE_UUID,
        GENERIC_ACCESS_UUID,
        DEV_INFO_SERVICE_UUID,
      ];

      // Request device with acceptAllDevices: true so ALL nearby BLE devices
      // (ESP32, TremorAI-Glove, Nordic UART, etc.) appear in the scan dialog
      let device = null;
      try {
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices,
        });
      } catch (reqErr) {
        // Fallback to namePrefix filter if acceptAllDevices is restricted by browser policy
        if (reqErr.name !== "NotFoundError" && reqErr.name !== "AbortError") {
          device = await navigator.bluetooth.requestDevice({
            filters: [
              { namePrefix: "Tremor" },
              { namePrefix: "ESP32" },
              { namePrefix: "Neuro" },
              { namePrefix: "Glove" },
            ],
            optionalServices,
          });
        } else {
          throw reqErr;
        }
      }

      if (!device) {
        setBleState(BLE_STATE.IDLE);
        return;
      }

      deviceRef.current = device;
      setDeviceName(device.name || "ESP32 Device");
      device.addEventListener("gattserverdisconnected", handleDisconnect);

      setBleState(BLE_STATE.CONNECTING);
      const server = await device.gatt.connect();
      serverRef.current = server;

      // ── Discover Service and Characteristic with fallback ──
      let activeChar = null;

      // 1. Try Custom Tremor AI GATT service
      try {
        const tremorService = await server.getPrimaryService(TREMOR_SERVICE_UUID);
        activeChar = await tremorService.getCharacteristic(TREMOR_TX_CHAR_UUID);
      } catch {
        // Continue to fallback
      }

      // 2. Try Nordic UART Service
      if (!activeChar) {
        try {
          const nusService = await server.getPrimaryService(NUS_SERVICE_UUID);
          activeChar = await nusService.getCharacteristic(NUS_TX_CHAR_UUID);
        } catch {
          // Continue to generic discovery
        }
      }

      // 3. Generic primary services scan for any notify characteristic
      if (!activeChar) {
        try {
          const services = await server.getPrimaryServices();
          for (const s of services) {
            const chars = await s.getCharacteristics();
            const notifyChar = chars.find(
              (c) => c.properties.notify || c.properties.indicate
            );
            if (notifyChar) {
              activeChar = notifyChar;
              break;
            }
          }
        } catch {
          // Handled below
        }
      }

      if (!activeChar) {
        throw new Error(
          "Connected to ESP32, but could not find a telemetry streaming characteristic."
        );
      }

      charRef.current = activeChar;
      await activeChar.startNotifications();
      activeChar.addEventListener("characteristicvaluechanged", handleNotification);

      setBleState(BLE_STATE.CONNECTED);
    } catch (err) {
      if (err.name === "NotFoundError" || err.name === "AbortError") {
        // User closed or cancelled the scan picker
        setBleState(BLE_STATE.IDLE);
      } else {
        const msg =
          err.message || "Failed to scan or connect to Bluetooth device.";
        console.error("[useBluetooth] Connection error:", err);
        setErrorMessage(msg);
        setBleState(BLE_STATE.ERROR);
      }
    }
  }, [isSupported, handleNotification, handleDisconnect]);

  const disconnect = useCallback(() => {
    if (charRef.current) {
      charRef.current.removeEventListener(
        "characteristicvaluechanged",
        handleNotification
      );
      charRef.current.stopNotifications().catch(() => {});
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    if (deviceRef.current) {
      deviceRef.current.removeEventListener(
        "gattserverdisconnected",
        handleDisconnect
      );
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

  return {
    bleState,
    deviceName,
    bleData,
    errorMessage,
    isSupported,
    connect,
    disconnect,
  };
}

