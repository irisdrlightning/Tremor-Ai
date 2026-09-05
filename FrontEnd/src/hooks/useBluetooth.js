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

// ─── BLE UUIDs (update to match your ESP32 firmware) ────────────────────────
const TREMOR_SERVICE_UUID    = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"; // Nordic NUS
const TREMOR_TX_CHAR_UUID    = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // NUS TX (notify)
// const TREMOR_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // NUS RX (write)

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Parse a UTF-8 BLE notification payload into a telemetry object.
 * Expected firmware JSON format:
 *   {"tr":5.1,"rms":3.8,"ax":0.12,"ay":-0.05,"az":9.81}
 */
function parsePayload(dataView) {
  try {
    const text = new TextDecoder("utf-8").decode(dataView.buffer);
    const json = JSON.parse(text);
    return {
      tremorRate: json.tr  ?? null,
      rms:        json.rms ?? null,
      accelX:     json.ax  ?? null,
      accelY:     json.ay  ?? null,
      accelZ:     json.az  ?? null,
      raw:        json,
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
          { services: [TREMOR_SERVICE_UUID] },
          { namePrefix: "TremorGlove" },
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
