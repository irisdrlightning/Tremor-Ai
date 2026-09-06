import { useEffect, useRef, useState } from "react";

export const WS_URL =
  import.meta.env.VITE_WS_URL || "wss://tremor-ai-one.vercel.app/ws/live-telemetry";

/**
 * Hook for live telemetry streaming from backend WebSocket.
 * Includes auto-reconnect and cleanly yields live data when connected.
 */
export function useLiveTelemetry() {
  const [liveData, setLiveData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    let unmounted = false;
    let reconnectTimeout = null;

    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!unmounted) {
            setIsConnected(true);
            console.log("[Tremor WS] Connected to live glove telemetry stream.");
          }
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data?.type === "telemetry_update") {
              setLiveData(data);
            }
          } catch (e) {
            console.warn("[Tremor WS] Failed to parse message:", e);
          }
        };

        ws.onclose = () => {
          if (!unmounted) {
            setIsConnected(false);
            // Reconnect attempt after 3s
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          if (ws) ws.close();
        };
      } catch (err) {
        console.warn("[Tremor WS] WebSocket creation failed:", err);
        if (!unmounted) {
          reconnectTimeout = setTimeout(connect, 4000);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { liveData, isConnected };
}
