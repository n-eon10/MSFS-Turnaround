import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AircraftAdapterStatus,
  AircraftTelemetry,
  ApproachGuidance,
  ApproachStabilityGate,
  BridgeConnectionStatus,
  BridgeMessage,
  LandingAnalysisPayload,
  NavAirport,
  NavRunwayEnd,
  ScenarioStatus,
  SpawnStatus,
  SpawnFinalRequest,
  SpawnFinalResult,
} from "../types/telemetry";

const BRIDGE_URL = "ws://localhost:48787";

function simBool(value: number | undefined): boolean {
  return typeof value === "number" && Math.abs(value) >= 0.5;
}

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
  const [stabilityGate1000, setStabilityGate1000] =
    useState<ApproachStabilityGate | null>(null);
  const [stabilityGate500, setStabilityGate500] =
    useState<ApproachStabilityGate | null>(null);
  const [navdataError, setNavdataError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [lastSpawnResult, setLastSpawnResult] =
    useState<SpawnFinalResult | null>(null);
  const [scenarioStatus, setScenarioStatus] = useState<ScenarioStatus | null>(null);
  const [spawnStatus, setSpawnStatus] = useState<SpawnStatus | null>(null);
  const [aircraftAdapterStatus, setAircraftAdapterStatus] =
    useState<AircraftAdapterStatus | null>(null);
  const [lastMessageAt, setLastMessageAt] = useState<Date | null>(null);
  const pendingSelectedRunwayRef = useRef<NavRunwayEnd | null>(null);
  const previousOnGroundRef = useRef<boolean | null>(null);

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
      const isCurrentSocket = () => socketRef.current === socket;

      socket.onopen = () => {
        if (!isCurrentSocket()) {
          return;
        }

        setStatus("connected");
      };

      socket.onmessage = (event) => {
        if (!isCurrentSocket()) {
          return;
        }

        try {
          const message = JSON.parse(event.data) as BridgeMessage;

          if (message.type === "aircraft.telemetry") {
            const telemetryPayload = message.payload as AircraftTelemetry;
            const isOnGround = simBool(telemetryPayload.simOnGround);
            if (previousOnGroundRef.current === true && !isOnGround) {
              setStabilityGate1000(null);
              setStabilityGate500(null);
            }
            previousOnGroundRef.current = isOnGround;

            setTelemetry(telemetryPayload);
            setLastMessageAt(new Date());
          }

          if (message.type === "landing.analysis") {
            setLandingAnalysis(message.payload as LandingAnalysisPayload);
            setLastMessageAt(new Date());
          }

          if (message.type === "aircraft.adapter") {
            setAircraftAdapterStatus(message as AircraftAdapterStatus);
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
              setStabilityGate1000(null);
              setStabilityGate500(null);
              setNavdataError(null);
            } else {
              setNavdataError(result.error ?? "Runway selection failed");
            }
          }

          if (message.type === "approach.guidance") {
            setApproachGuidance(message as ApproachGuidance);
          }

          if (message.type === "approach.stability_gate") {
            const gate = message as ApproachStabilityGate;
            if (gate.gateAglFt === 1000) {
              setStabilityGate1000(gate);
            }
            if (gate.gateAglFt === 500) {
              setStabilityGate500(gate);
            }
          }

          if (message.type === "scenario.spawn_final.result") {
            const result = message as SpawnFinalResult;
            setLastSpawnResult(result);
            setScenarioError(result.ok ? null : result.error ?? "Spawn failed");
            if (result.ok) {
              if (result.runway) {
                setSelectedRunway(result.runway);
                pendingSelectedRunwayRef.current = result.runway;
              }
              setApproachGuidance(null);
              setStabilityGate1000(null);
              setStabilityGate500(null);
            }
            setLastMessageAt(new Date());
          }

          if (message.type === "scenario.status") {
            const statusMessage = message as ScenarioStatus;
            setScenarioStatus(statusMessage);
            if (statusMessage.phase === "failed") {
              setScenarioError(statusMessage.message);
            }
            setLastMessageAt(new Date());
          }

          if (message.type === "spawn.status") {
            const statusMessage = message as SpawnStatus;
            setSpawnStatus(statusMessage);
            if (statusMessage.state === "FAILED") {
              setScenarioError(statusMessage.message);
            }
            setLastMessageAt(new Date());
          }

          if (
            message.type === "spawn.release.result" ||
            message.type === "spawn.cancel.result"
          ) {
            const result = message as { ok?: boolean; error?: string };
            if (result.ok === false) {
              setScenarioError(result.error ?? "Spawn action failed");
            }
            setLastMessageAt(new Date());
          }
        } catch {
          // Ignore malformed bridge messages for now.
        }
      };

      socket.onerror = () => {
        if (!isCurrentSocket()) {
          return;
        }

        setStatus("error");
      };

      socket.onclose = () => {
        if (!isCurrentSocket()) {
          return;
        }

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

      if (!sendBridgeMessage({
        type: "navdata.search_airports",
        query,
        limit,
      })) {
        setNavdataError("Bridge is not connected");
      }
    },
    [sendBridgeMessage]
  );

  const requestRunways = useCallback(
    (airportIdent: string) => {
      setRunwayAirportIdent(airportIdent);
      setRunwayResults([]);
      setNavdataError(null);

      if (!sendBridgeMessage({
        type: "navdata.get_runways",
        airportIdent,
      })) {
        setNavdataError("Bridge is not connected");
      }
    },
    [sendBridgeMessage]
  );

  const selectRunway = useCallback(
    (runway: NavRunwayEnd) => {
      pendingSelectedRunwayRef.current = runway;
      setApproachGuidance(null);
      setStabilityGate1000(null);
      setStabilityGate500(null);
      setNavdataError(null);

      if (!sendBridgeMessage({
        type: "approach.select_runway",
        airportIdent: runway.airportIdent,
        runwayIdent: runway.runwayIdent,
      })) {
        setNavdataError("Bridge is not connected");
      }
    },
    [sendBridgeMessage]
  );

  const spawnFinal = useCallback(
    (request: Omit<SpawnFinalRequest, "type">) => {
      setScenarioError(null);
      setLastSpawnResult(null);
      setScenarioStatus(null);
      setSpawnStatus(null);

      if (!sendBridgeMessage({ type: "scenario.spawn_final", ...request })) {
        setScenarioError("Bridge is not connected");
      }
    },
    [sendBridgeMessage]
  );

  const releaseSpawn = useCallback(() => {
    setScenarioError(null);
    if (!sendBridgeMessage({ type: "spawn.release" })) {
      setScenarioError("Bridge is not connected");
    }
  }, [sendBridgeMessage]);

  const cancelSpawn = useCallback(() => {
    setScenarioError(null);
    if (!sendBridgeMessage({ type: "spawn.cancel" })) {
      setScenarioError("Bridge is not connected");
    }
  }, [sendBridgeMessage]);

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
    stabilityGate1000,
    stabilityGate500,
    navdataError,
    scenarioError,
    lastSpawnResult,
    scenarioStatus,
    spawnStatus,
    aircraftAdapterStatus,
    searchAirports,
    requestRunways,
    selectRunway,
    spawnFinal,
    releaseSpawn,
    cancelSpawn,
    lastMessageAt,
    bridgeUrl: BRIDGE_URL,
  };
}
