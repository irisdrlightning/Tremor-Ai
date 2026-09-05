import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/lib/api";

const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

export interface IMUSample {
  timestamp: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  mag: number;
}

export function useWebBluetooth(activePatientId = "PD_01") {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [ringId, setRingId] = useState("RING-7842");
  const [latestSample, setLatestSample] = useState<IMUSample | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [sampleRate, setSampleRate] = useState(100);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<any>(null);
  const charRef = useRef<any>(null);
  const bufferRef = useRef<number[][]>([]);
  const batchTimerRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);
  const textDecoderRef = useRef(new TextDecoder());
  const partialPacketRef = useRef("");
  const rateCounterRef = useRef(0);
  const rateTimerRef = useRef<any>(null);

  // Send batch to backend
  const flushBatch = useCallback(async () => {
    if (bufferRef.current.length === 0) return;
    const batch = bufferRef.current.splice(0, bufferRef.current.length);
    try {
      await api.ingestTelemetryBatch(ringId, activePatientId, batch);
    } catch (err) {
      // Non-fatal, keep receiving samples
    }
  }, [ringId, activePatientId]);

  // Start batch flush timer
  useEffect(() => {
    if (isConnected) {
      batchTimerRef.current = setInterval(flushBatch, 200); // 5 Hz ingest batches
      rateTimerRef.current = setInterval(() => {
        setSampleRate(rateCounterRef.current);
        rateCounterRef.current = 0;
      }, 1000);
    } else {
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      if (rateTimerRef.current) clearInterval(rateTimerRef.current);
    }
    return () => {
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      if (rateTimerRef.current) clearInterval(rateTimerRef.current);
    };
  }, [isConnected, flushBatch]);

  // Request screen wake lock
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch (err) {
      console.warn("WakeLock request failed:", err);
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      // ignore
    }
  };

  // Handle incoming notification
  const handleCharacteristicValueChanged = (event: any) => {
    const value = event.target.value;
    const chunk = textDecoderRef.current.decode(value);
    partialPacketRef.current += chunk;

    const lines = partialPacketRef.current.split("\n");
    // Keep last incomplete segment
    partialPacketRef.current = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const parts = trimmed.split(",");
      if (parts.length >= 7) {
        const ts = parseFloat(parts[0]);
        const ax = parseFloat(parts[1]);
        const ay = parseFloat(parts[2]);
        const az = parseFloat(parts[3]);
        const gx = parseFloat(parts[4]);
        const gy = parseFloat(parts[5]);
        const gz = parseFloat(parts[6]);
        const mag = Math.sqrt(ax * ax + ay * ay + az * az);

        if (!isNaN(ts) && !isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
          bufferRef.current.push([ts, ax, ay, az, gx, gy, gz]);
          rateCounterRef.current += 1;
          setSampleCount((prev) => prev + 1);
          setLatestSample({
            timestamp: ts,
            ax,
            ay,
            az,
            gx,
            gy,
            gz,
            mag: Math.round(mag * 1000) / 1000,
          });
        }
      }
    }
  };

  const onDisconnected = () => {
    setIsConnected(false);
    setIsConnecting(false);
    releaseWakeLock();
    setError("Bluetooth ring disconnected");
  };

  // Connect to ESP32 Ring
  const connect = async () => {
    setError(null);
    if (!navigator || !("bluetooth" in navigator)) {
      setError("Web Bluetooth is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      setIsConnecting(true);
      const navBt = (navigator as any).bluetooth;

      const device = await navBt.requestDevice({
        filters: [{ namePrefix: "TremorAi" }],
        optionalServices: [SERVICE_UUID],
      });

      deviceRef.current = device;
      const detectedName = device.name || "TremorAi-RING-7842";
      const cleanRingId = detectedName.replace("TremorAi-", "");
      setRingId(cleanRingId);

      device.addEventListener("gattserverdisconnected", onDisconnected);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHAR_UUID);
      charRef.current = characteristic;

      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", handleCharacteristicValueChanged);

      setIsConnected(true);
      setIsConnecting(false);
      await requestWakeLock();
    } catch (err: any) {
      setIsConnecting(false);
      if (err.name !== "NotFoundError") {
        setError(err.message || "Failed to connect to Bluetooth Ring");
      }
    }
  };

  // Explicit disconnect
  const disconnect = () => {
    if (deviceRef.current && deviceRef.current.gatt && deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setIsConnected(false);
    setIsConnecting(false);
    releaseWakeLock();
  };

  return {
    isConnected,
    isConnecting,
    ringId,
    latestSample,
    sampleCount,
    sampleRate,
    error,
    connect,
    disconnect,
  };
}
