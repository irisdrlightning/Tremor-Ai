/**
 * useBluetooth — Hardware Telemetry Hook for Tremor AI ESP32 Glove & IMU
 *
 * Exclusively connects to original physical hardware:
 *   1. Web Bluetooth API (navigator.bluetooth.requestDevice) for BLE ESP32 / Wearables
 *   2. Web Serial API (navigator.serial.requestPort) at 115200 baud for USB ESP32 boards
 *
 * Real-time MPU6050 6-DOF telemetry streaming (ax, ay, az, gx, gy, gz) with 0 mock devices.
 */

import { useCallback, useEffect, useRef, useState } from "react";

// ─── BLE UUIDs ────────────────────────────────────────────────────────────────
const TREMOR_SERVICE_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000001";
const TREMOR_TX_CHAR_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000002"; // Data (Notify)
const TREMOR_CMD_CHAR_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000003"; // Write (0x01/0x00)
const TREMOR_BATT_CHAR_UUID = "6f3c1200-1a2b-4c3d-9e8f-000000000004"; // Battery

// Standard Nordic UART Service (NUS)
const NUS_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // Notify from device
const NUS_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"; // Write to device

// Standard Bluetooth SIG UUIDs for discovery
const BATTERY_SERVICE_UUID = "0000180f-0000-1000-8000-00805f9b34fb";
const GENERIC_ACCESS_UUID = "00001800-0000-1000-8000-00805f9b34fb";
const DEV_INFO_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";

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

function parsePayload(dataView) {
  if (!dataView || dataView.byteLength === 0) return null;

  try {
    const byteLen = dataView.byteLength;

    // 1. Batch Binary Payload (112 bytes = 4 × 28 bytes)
    if (byteLen >= 112) {
      const SAMPLE_BYTES = 28;
      const count = Math.floor(byteLen / SAMPLE_BYTES);
      const samples = [];

      for (let i = 0; i < count; i++) {
        const offset = i * SAMPLE_BYTES;
        const ts = dataView.getUint32(offset, true);
        const ax = dataView.getFloat32(offset + 4, true);
        const ay = dataView.getFloat32(offset + 8, true);
        const az = dataView.getFloat32(offset + 12, true);
        const gx = dataView.getFloat32(offset + 16, true);
        const gy = dataView.getFloat32(offset + 20, true);
        const gz = dataView.getFloat32(offset + 24, true);
        samples.push({ ts, ax, ay, az, gx, gy, gz });
      }

      if (samples.length > 0) {
        const lastSample = samples[samples.length - 1];
        const res = buildTelemetryObject(lastSample);
        res.batch = samples;
        return res;
      }
    }

    // 2. Single Sample Binary (28 bytes)
    if (byteLen >= 28 && byteLen < 112) {
      const ts = dataView.getUint32(0, true);
      const ax = dataView.getFloat32(4, true);
      const ay = dataView.getFloat32(8, true);
      const az = dataView.getFloat32(12, true);
      const gx = dataView.getFloat32(16, true);
      const gy = dataView.getFloat32(20, true);
      const gz = dataView.getFloat32(24, true);
      const single = { ts, ax, ay, az, gx, gy, gz };
      const res = buildTelemetryObject(single);
      res.batch = [single];
      return res;
    }

    // 3. Text / CSV / JSON string payload
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

export const HARDWARE_TRANSPORT = {
  BLE: "ble",
  SERIAL: "serial",
  NONE: "none",
};

export function useBluetooth() {
  const [bleState, setBleState] = useState(BLE_STATE.DISCONNECTED);
  const [deviceName, setDeviceName] = useState(null);
  const [transportType, setTransportType] = useState(HARDWARE_TRANSPORT.NONE);
  const [bleData, setBleData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const deviceRef = useRef(null);
  const serverRef = useRef(null);
  const charRef = useRef(null);
  const serialPortRef = useRef(null);
  const serialReaderRef = useRef(null);
  const serialKeepReadingRef = useRef(false);

  const isBleSupported =
    typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
  const isSerialSupported =
    typeof navigator !== "undefined" && Boolean(navigator.serial);
  const isSupported = isBleSupported || isSerialSupported;

  const handleNotification = useCallback((event) => {
    const parsed = parsePayload(event.target.value);
    if (parsed) setBleData(parsed);
  }, []);

  const handleDisconnect = useCallback(() => {
    serialKeepReadingRef.current = false;
    setBleState(BLE_STATE.DISCONNECTED);
    setDeviceName(null);
    setTransportType(HARDWARE_TRANSPORT.NONE);
    setBleData(null);
    charRef.current = null;
    serverRef.current = null;
  }, []);

  // ─── 1. Connect Original Physical Bluetooth BLE Device ─────────────────────────
  const connectBle = useCallback(async () => {
    if (!isBleSupported) {
      setErrorMessage("Web Bluetooth is not supported in this browser. Please use Chrome or Edge.");
      setBleState(BLE_STATE.ERROR);
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

      // Request physical BLE device from browser picker (targeted filter with fallback)
      let device = null;
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [
            { name: "TremorAI-Glove" },
            { namePrefix: "Tremor" },
            { namePrefix: "ESP" },
            { services: [TREMOR_SERVICE_UUID] },
          ],
          optionalServices,
        });
      } catch (filterErr) {
        if (filterErr.name === "NotFoundError" || filterErr.name === "AbortError") {
          throw filterErr;
        }
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices,
        });
      }

      if (!device) {
        setBleState(BLE_STATE.DISCONNECTED);
        return;
      }

      deviceRef.current = device;
      setDeviceName(device.name || "TremorAI-Glove");
      setTransportType(HARDWARE_TRANSPORT.BLE);
      device.addEventListener("gattserverdisconnected", handleDisconnect);

      setBleState(BLE_STATE.CONNECTING);
      const server = await device.gatt.connect();
      serverRef.current = server;

      let activeChar = null;

      try {
        const tremorService = await server.getPrimaryService(TREMOR_SERVICE_UUID);
        activeChar = await tremorService.getCharacteristic(TREMOR_TX_CHAR_UUID);
      } catch {
        // Fallback to NUS or generic notify
      }

      if (!activeChar) {
        try {
          const nusService = await server.getPrimaryService(NUS_SERVICE_UUID);
          activeChar = await nusService.getCharacteristic(NUS_TX_CHAR_UUID);
        } catch {
          // Fallback to discovering characteristics
        }
      }

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
          `Connected to "${device.name || "BLE Device"}", but no telemetry GATT characteristic was found.`
        );
      }

      charRef.current = activeChar;
      await activeChar.startNotifications();
      activeChar.addEventListener("characteristicvaluechanged", handleNotification);

      setBleState(BLE_STATE.CONNECTED);
    } catch (err) {
      if (err.name === "NotFoundError" || err.name === "AbortError") {
        setBleState(BLE_STATE.DISCONNECTED);
      } else {
        const msg = err.message || "Failed to connect to physical Bluetooth device.";
        console.error("[useBluetooth] BLE Connection error:", err);
        setErrorMessage(msg);
        setBleState(BLE_STATE.ERROR);
      }
    }
  }, [isBleSupported, handleNotification, handleDisconnect]);

  // ─── 2. Connect Original Physical USB Serial Device (ESP32) ───────────────────
  const connectSerial = useCallback(async () => {
    if (!isSerialSupported) {
      setErrorMessage("Web Serial is not supported in this browser. Please use Chrome or Edge.");
      setBleState(BLE_STATE.ERROR);
      return;
    }

    setErrorMessage(null);
    setBleState(BLE_STATE.SCANNING);

    try {
      // Prompt user to pick physical USB serial port
      const port = await navigator.serial.requestPort();
      if (!port) {
        setBleState(BLE_STATE.DISCONNECTED);
        return;
      }

      setBleState(BLE_STATE.CONNECTING);
      await port.open({ baudRate: 115200 });

      serialPortRef.current = port;
      setDeviceName("ESP32 USB Serial (115200 baud)");
      setTransportType(HARDWARE_TRANSPORT.SERIAL);
      setBleState(BLE_STATE.CONNECTED);

      serialKeepReadingRef.current = true;
      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable).catch(() => {});
      const reader = textDecoder.readable.getReader();
      serialReaderRef.current = reader;

      let lineBuffer = "";
      (async () => {
        try {
          while (serialKeepReadingRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              lineBuffer += value;
              const lines = lineBuffer.split("\n");
              lineBuffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) continue;

                const parts = trimmed.split(",").map((p) => p.trim());
                if (parts.length >= 7) {
                  const ts = parseFloat(parts[0]) || Date.now();
                  const ax = parseFloat(parts[1]) || 0;
                  const ay = parseFloat(parts[2]) || 0;
                  const az = parseFloat(parts[3]) || 0;
                  const gx = parseFloat(parts[4]) || 0;
                  const gy = parseFloat(parts[5]) || 0;
                  const gz = parseFloat(parts[6]) || 0;
                  setBleData(buildTelemetryObject({ ts, ax, ay, az, gx, gy, gz }));
                }
              }
            }
          }
        } catch (readErr) {
          console.debug("[useBluetooth] Serial read loop ended:", readErr);
        } finally {
          handleDisconnect();
        }
      })();
    } catch (err) {
      if (err.name === "NotFoundError" || err.name === "AbortError") {
        setBleState(BLE_STATE.DISCONNECTED);
      } else {
        const msg = err.message || "Failed to open physical USB Serial port.";
        console.error("[useBluetooth] Serial Connection error:", err);
        setErrorMessage(msg);
        setBleState(BLE_STATE.ERROR);
      }
    }
  }, [isSerialSupported, handleDisconnect]);

  // Generic connect router for compatibility
  const connect = useCallback(
    async (option = null) => {
      if (option === "serial" || option?.type === "serial") {
        return connectSerial();
      }
      return connectBle();
    },
    [connectBle, connectSerial]
  );

  const disconnect = useCallback(async () => {
    serialKeepReadingRef.current = false;

    if (serialReaderRef.current) {
      try {
        await serialReaderRef.current.cancel();
      } catch {}
      serialReaderRef.current = null;
    }

    if (serialPortRef.current) {
      try {
        await serialPortRef.current.close();
      } catch {}
      serialPortRef.current = null;
    }

    if (charRef.current) {
      try {
        charRef.current.removeEventListener(
          "characteristicvaluechanged",
          handleNotification
        );
        await charRef.current.stopNotifications();
      } catch {}
      charRef.current = null;
    }

    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }

    if (deviceRef.current) {
      deviceRef.current.removeEventListener(
        "gattserverdisconnected",
        handleDisconnect
      );
      deviceRef.current = null;
    }

    handleDisconnect();
  }, [handleNotification, handleDisconnect]);

  useEffect(() => {
    return () => {
      serialKeepReadingRef.current = false;
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  return {
    bleState,
    deviceName,
    transportType,
    bleData,
    errorMessage,
    isBleSupported,
    isSerialSupported,
    isSupported,
    connect,
    connectBle,
    connectSerial,
    disconnect,
  };
}



