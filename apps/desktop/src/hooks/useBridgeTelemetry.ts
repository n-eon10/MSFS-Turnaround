import { useEffect, useRef, useState } from "react";
import type {
  AircraftTelemetry,
  BridgeConnectionStatus,
  BridgeMessage,
} from "../types/telemetry";

const BRIDGE_URL = "ws://localhost:48787";

export function useBridgeTelemetry() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<BridgeConnectionStatus>("connecting");
  const [telemetry, setTelemetry] = useState<AircraftTelemetry | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);

  useEffect(() => {
    let shouldReconnect = true;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      clearReconnectTimer();

      setStatus("connecting");

      const socket = new WebSocket(BRIDGE_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as BridgeMessage;

          if (message.type === "aircraft.telemetry") {
            setTelemetry(message.payload as AircraftTelemetry);
            setLastMessageAt(new Date());
          }
        } catch {
          // Ignore malformed bridge messages for now.
        }
      };

      socket.onerror = () => {
        setStatus("error");
      };

      socket.onclose = () => {
        socketRef.current = null;

        if (!shouldReconnect) {
          setStatus("disconnected");
          return;
        }

        setStatus("disconnected");

        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, 1000);
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      clearReconnectTimer();

      if (socketRef.current !== null) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    status,
    telemetry,
    lastMessageAt,
    bridgeUrl: BRIDGE_URL,
  };
}