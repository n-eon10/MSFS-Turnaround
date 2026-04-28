import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AircraftTelemetry,
  ApproachGuidance,
  BridgeConnectionStatus,
  BridgeMessage,
  LandingAnalysisPayload,
  NavAirport,
  NavRunwayEnd,
} from "../types/telemetry";

const BRIDGE_URL = "ws://localhost:48787";

export function useBridgeTelemetry() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<BridgeConnectionStatus>("connecting");
  const [telemetry, setTelemetry] = useState<AircraftTelemetry | null>(null);
  const [landingAnalysis, setLandingAnalysis] =
    useState<LandingAnalysisPayload | null>(null);
  const [airportSearchQuery, setAirportSearchQuery] = useState("");
  const [airportResults, setAirportResults] = useState<NavAirport[]>([]);
  const [runwayAirportIdent, setRunwayAirportIdent] = useState("");
  const [runwayResults, setRunwayResults] = useState<NavRunwayEnd[]>([]);
  const [selectedRunway, setSelectedRunway] = useState<NavRunwayEnd | null>(null);
  const [approachGuidance, setApproachGuidance] =
    useState<ApproachGuidance | null>(null);
  const [navdataError, setNavdataError] = useState<string | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
  const pendingSelectedRunwayRef = useRef<NavRunwayEnd | null>(null);

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

          if (message.type === "landing.analysis") {
            setLandingAnalysis(message.payload as LandingAnalysisPayload);
            setLastMessageAt(new Date());
          }

          if (message.type === "navdata.search_airports.result") {
            const result = message as Extract<
              BridgeMessage,
              { type: "navdata.search_airports.result" }
            >;
            setAirportSearchQuery(result.query ?? "");
            setAirportResults(result.airports ?? []);
            setNavdataError(result.error ?? null);
          }

          if (message.type === "navdata.get_runways.result") {
            const result = message as Extract<
              BridgeMessage,
              { type: "navdata.get_runways.result" }
            >;
            setRunwayAirportIdent(result.airportIdent ?? "");
            setRunwayResults(result.runways ?? []);
            setNavdataError(result.error ?? null);
          }

          if (message.type === "approach.select_runway.result") {
            const result = message as Extract<
              BridgeMessage,
              { type: "approach.select_runway.result" }
            >;

            if (result.ok) {
              setSelectedRunway(pendingSelectedRunwayRef.current);
              setApproachGuidance(null);
              setNavdataError(null);
            } else {
              setNavdataError(result.error ?? "Runway selection failed");
            }
          }

          if (message.type === "approach.guidance") {
            setApproachGuidance(message as ApproachGuidance);
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

  const sendBridgeMessage = useCallback((message: object) => {
    const socket = socketRef.current;
    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      setNavdataError("Bridge is not connected");
      return false;
    }

    socket.send(JSON.stringify(message));
    return true;
  }, []);

  const searchAirports = useCallback(
    (query: string, limit = 20) => {
      setAirportSearchQuery(query);
      setNavdataError(null);

      if (query.trim() === "") {
        setAirportResults([]);
        return;
      }

      sendBridgeMessage({
        type: "navdata.search_airports",
        query,
        limit,
      });
    },
    [sendBridgeMessage]
  );

  const requestRunways = useCallback(
    (airportIdent: string) => {
      setRunwayAirportIdent(airportIdent);
      setRunwayResults([]);
      setNavdataError(null);

      sendBridgeMessage({
        type: "navdata.get_runways",
        airportIdent,
      });
    },
    [sendBridgeMessage]
  );

  const selectRunway = useCallback(
    (runway: NavRunwayEnd) => {
      pendingSelectedRunwayRef.current = runway;
      setApproachGuidance(null);
      setNavdataError(null);

      sendBridgeMessage({
        type: "approach.select_runway",
        airportIdent: runway.airportIdent,
        runwayIdent: runway.runwayIdent,
      });
    },
    [sendBridgeMessage]
  );

  return {
    status,
    telemetry,
    landingAnalysis,
    airportSearchQuery,
    airportResults,
    runwayAirportIdent,
    runwayResults,
    selectedRunway,
    approachGuidance,
    navdataError,
    searchAirports,
    requestRunways,
    selectRunway,
    lastMessageAt,
    bridgeUrl: BRIDGE_URL,
  };
}
