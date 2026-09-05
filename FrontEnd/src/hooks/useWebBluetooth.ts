import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

export const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
export const CHAR_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

export interface BLESample {
  timestamp: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  mag: number;
}

export interface BluetoothState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  ringId: string;
  sampleCount: number;
  latestSample: BLESample | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useWebBluetooth(patientId: string = "PD_01"): BluetoothState {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ringId, setRingId] = useState<string>("TremorAi-RING-7842");
  const [sampleCount, setSampleCount] = useState<number>(0);
  const [latestSample, setLatestSample] = useState<BLESample | null>(null);

  const activeDeviceRef = useRef<any>(null);
  const activeCharRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);
  const watchdogRef = useRef<any>(null);
  const sampleBatchRef = useRef<number[][]>([]);
  const lastPostTimeRef = useRef<number>(Date.now());
  const lastSampleTimeRef = useRef<number>(Date.now());
  const totalSentRef = useRef<number>(0);
  const userDisconnectedRef = useRef<boolean>(false);

  // Request Screen Wake Lock
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {
      // ignore
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // Flush accumulated batch to backend
  const flushBatch = useCallback(
    async (deviceName: string) => {
      if (sampleBatchRef.current.length === 0) return;
      const batch = [...sampleBatchRef.current];
      sampleBatchRef.current = [];
      const cleanRingId = deviceName.replace("TremorAi-", "");

      try {
        await api.ingestTelemetryBatch(cleanRingId, patientId, batch);
        totalSentRef.current += batch.length;
        setSampleCount(totalSentRef.current);
      } catch (err) {
        console.warn("[WebBluetooth] Batch ingest error:", err);
      }
    },
    [patientId]
  );

  // Sample handler
  const handleCharacteristicValueChanged = useCallback(
    (event: any) => {
      lastSampleTimeRef.current = Date.now();
      const value = event.target.value;
      const text = new TextDecoder().decode(value);
      const parts = text.trim().split(",");

      if (parts.length >= 7) {
        const [ts, ax, ay, az, gx, gy, gz] = parts.map(Number);
        const mag = Math.sqrt(ax * ax + ay * ay + az * az);

        const sample: BLESample = {
          timestamp: ts,
          ax,
          ay,
          az,
          gx,
          gy,
          gz,
          mag,
        };

        setLatestSample(sample);
        sampleBatchRef.current.push([ts, ax, ay, az, gx, gy, gz]);

        // Post batch to backend every 200 ms
        if (Date.now() - lastPostTimeRef.current >= 200) {
          lastPostTimeRef.current = Date.now();
          const devName = activeDeviceRef.current?.name || "TremorAi-RING-7842";
          flushBatch(devName);
        }
      }
    },
    [flushBatch]
  );

  // Clean disconnect
  const cleanup = useCallback(
    (reason?: string) => {
      setIsConnected(false);
      setIsConnecting(false);
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      releaseWakeLock();
      if (reason) setError(reason);
    },
    [releaseWakeLock]
  );

  const disconnect = useCallback(() => {
    userDisconnectedRef.current = true;
    if (activeDeviceRef.current && activeDeviceRef.current.gatt?.connected) {
      activeDeviceRef.current.gatt.disconnect();
    }
    cleanup("Ring disconnected by user.");
  }, [cleanup]);

  // Establish GATT connection with retry
  const establishGatt = useCallback(
    async (device: any) => {
      let server = null;
      let service = null;
      let characteristic = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (!device.gatt.connected) {
            server = await device.gatt.connect();
          } else {
            server = device.gatt;
          }

          // Allow Windows/Chromium BLE stack to settle
          await new Promise((r) => setTimeout(r, 350));

          if (!server || !server.connected) {
            server = await device.gatt.connect();
            await new Promise((r) => setTimeout(r, 350));
          }

          service = await server.getPrimaryService(SERVICE_UUID);
          characteristic = await service.getCharacteristic(CHAR_UUID);
          await characteristic.startNotifications();
          characteristic.addEventListener(
            "characteristicvaluechanged",
            handleCharacteristicValueChanged
          );

          activeCharRef.current = characteristic;
          return server;
        } catch (err: any) {
          console.warn(`[WebBluetooth] GATT connect attempt ${attempt} failed:`, err);
          if (attempt === 3) throw err;
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    },
    [handleCharacteristicValueChanged]
  );

  // Connect via Web Bluetooth
  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError("Web Bluetooth is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    setIsConnecting(true);
    setError(null);
    userDisconnectedRef.current = false;

    try {
      let device: any;
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: "TremorAi" }],
          optionalServices: [SERVICE_UUID],
        });
      } catch (filterErr) {
        // Fallback: accept all devices if prefix filter doesn't match
        console.warn("[WebBluetooth] Prefix filter fallback:", filterErr);
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [SERVICE_UUID],
        });
      }

      activeDeviceRef.current = device;
      setRingId(device.name || "TremorAi-RING-7842");

      await establishGatt(device);

      setIsConnected(true);
      setIsConnecting(false);
      lastSampleTimeRef.current = Date.now();
      requestWakeLock();

      // Watchdog for drops
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      watchdogRef.current = setInterval(() => {
        if (
          !userDisconnectedRef.current &&
          activeDeviceRef.current &&
          Date.now() - lastSampleTimeRef.current > 4500
        ) {
          console.warn("[WebBluetooth] Watchdog heartbeat timeout. Re-evaluating connection...");
          if (!activeDeviceRef.current.gatt?.connected) {
            cleanup("Bluetooth connection dropped. Click Connect to resume.");
          }
        }
      }, 2000);

      device.addEventListener("gattserverdisconnected", () => {
        if (userDisconnectedRef.current) {
          cleanup("Ring disconnected by user.");
        } else {
          cleanup("Ring signal dropped. Please re-connect.");
        }
      });
    } catch (err: any) {
      console.warn("[WebBluetooth] Pairing error:", err);
      setIsConnecting(false);
      if (err.name !== "NotFoundError") {
        setError(err.message || "Failed to pair with ring.");
      }
    }
  }, [cleanup, establishGatt, requestWakeLock]);

  // Teardown on unmount
  useEffect(() => {
    return () => {
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      releaseWakeLock();
      if (activeCharRef.current) {
        activeCharRef.current.removeEventListener(
          "characteristicvaluechanged",
          handleCharacteristicValueChanged
        );
      }
    };
  }, [handleCharacteristicValueChanged, releaseWakeLock]);

  return {
    isConnected,
    isConnecting,
    error,
    ringId,
    sampleCount,
    latestSample,
    connect,
    disconnect,
  };
}
