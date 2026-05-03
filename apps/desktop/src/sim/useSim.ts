import { useCallback, useEffect, useMemo, useState } from "react";

import { useBridgeTelemetry } from "../hooks/useBridgeTelemetry";
import type {
  AircraftAdapterStatus,
  AircraftTelemetry,
  ApproachGuidance,
  ApproachStabilityGate,
  BridgeConnectionStatus,
  LandingAnalysisPayload,
  NavAirport,
  NavRunwayEnd,
  ScenarioStatus,
  SpawnStatus,
  SpawnFinalRequest,
  SpawnFinalResult,
} from "../types/telemetry";

export type AircraftKey = string;
export type ApproachKey = string;
export type Stability = "stable" | "caution" | "unstable";
export type Phase = "preflight" | "approach" | "landing" | "landed";

export type AircraftProfile = {
  code: string | null;
  name: string | null;
  operator: string | null;
  icao: string | null;
  flapStops: string[];
  vRef: number | null;
  vApp: number | null;
  gearSpeed: number | null;
  flapsLandingIdx: number | null;
  weightKg: number | null;
  color: string;
};

export type ApproachPreset = {
  name: string | null;
  full: string | null;
  course: number | null;
  freq: string | null;
  minimumsFt: number | null;
  minimumsKind: string | null;
  glideslopeDeg: number | null;
};

export type Runway = {
  airport: string | null;
  airportName: string | null;
  runway: string | null;
  oppositeRunway: string | null;
  course: number | null;
  lengthFt: number | null;
  widthFt: number | null;
  thresholdElevFt: number | null;
  ilsFreq: string | null;
};

export type TrajectoryRecord = {
  timestampMs: number;
  latitudeDeg: number;
  longitudeDeg: number;
  altMSL: number | null;
  altAGL: number | null;
  ias: number | null;
  vs: number | null;
  heading: number | null;
};

export type LandingReport = {
  touchdownVerticalSpeedFpm: number;
  touchdownAirspeedKt: number;
  touchdownHeadingDeg: number;
  touchdownLatitudeDeg: number;
  touchdownLongitudeDeg: number;
  touchdownPitchDeg: number | null;
  touchdownBankDeg: number | null;
  touchdownGForce: number | null;
  score: number;
  letter: "A" | "B" | "C" | "D" | "E";
  breakdown: Array<{ k: string; v: number; weight: number }>;
  stableApproach?: LandingAnalysisPayload["stableApproach"];
};

export type SimState = {
  connected: boolean;
  bridgeOk: boolean;
  bridgeStatus: BridgeConnectionStatus;
  bridgeUrl: string;
  lastMessageAt: Date | null;
  hasTelemetry: boolean;
  simRate: string | null;
  aircraft: AircraftProfile;
  approach: ApproachPreset;
  runway: Runway;
  phase: Phase;
  t: number | null;
  ias: number | null;
  groundSpeedKt: number | null;
  altMSL: number | null;
  altAGL: number | null;
  vs: number | null;
  heading: number | null;
  headingTarget: number | null;
  hdgErr: number | null;
  locDev: number | null;
  gsDev: number | null;
  flapsIdx: number | null;
  flapsLabel: string | null;
  gearDown: boolean | null;
  pitchDeg: number | null;
  bankDeg: number | null;
  gForce: number | null;
  distNm: number | null;
  lat: number | null;
  lon: number | null;
  onApproachIas: boolean;
  stability: Stability | null;
  trajectoryHistory: TrajectoryRecord[];
  report: LandingReport | null;
  navdata: {
    airportSearchQuery: string;
    airportResults: NavAirport[];
    runwayAirportIdent: string;
    runwayResults: NavRunwayEnd[];
    selectedRunway: NavRunwayEnd | null;
    approachGuidance: ApproachGuidance | null;
    stabilityGate1000: ApproachStabilityGate | null;
    stabilityGate500: ApproachStabilityGate | null;
    error: string | null;
  };
  scenario: {
    lastSpawnResult: SpawnFinalResult | null;
    status: ScenarioStatus | null;
    spawnStatus: SpawnStatus | null;
    error: string | null;
  };
  aircraftAdapter: AircraftAdapterStatus | null;
  todos: string[];
};

export type SimActions = {
  setPhase: (p: Phase) => void;
  jumpTo: (p: Phase) => void;
  setPaused: (v: boolean) => void;
  paused: boolean;
  setAircraft: (k: AircraftKey) => void;
  setApproach: (k: ApproachKey) => void;
  setStability: (s: Stability) => void;
  searchAirports: (query: string, limit?: number) => void;
  requestRunways: (airportIdent: string) => void;
  selectRunway: (runway: NavRunwayEnd) => void;
  spawnFinal: (request: Omit<SpawnFinalRequest, "type">) => void;
  releaseSpawn: () => void;
  cancelSpawn: () => void;
};

export type UseSimResult = { state: SimState; actions: SimActions };

export type UseSimOptions = {
  aircraft?: AircraftKey;
  approach?: ApproachKey;
  stability?: Stability;
  initialPhase?: Phase;
  running?: boolean;
};

const UNKNOWN_AIRCRAFT: AircraftProfile = {
  code: null,
  name: null,
  operator: null,
  icao: null,
  flapStops: [],
  vRef: null,
  vApp: null,
  gearSpeed: null,
  flapsLandingIdx: null,
  weightKg: null,
  color: "#7da9c7",
};

const UNKNOWN_APPROACH: ApproachPreset = {
  name: null,
  full: null,
  course: null,
  freq: null,
  minimumsFt: null,
  minimumsKind: null,
  glideslopeDeg: null,
};

const UNKNOWN_RUNWAY: Runway = {
  airport: null,
  airportName: null,
  runway: null,
  oppositeRunway: null,
  course: null,
  lengthFt: null,
  widthFt: null,
  thresholdElevFt: null,
  ilsFreq: null,
};

const TODOS = [
  "Backend does not publish aircraft identity/performance data yet.",
  "Backend does not publish flight plan or official approach procedure data yet.",
  "Backend does not publish official localizer/glideslope nav receiver data yet.",
  "Backend does not publish bridge PID, latency, or sim rate yet.",
  "Landing analysis does not calculate centerline, touchdown-zone distance, flare quality, or bounce yet.",
];

function numberOrNull(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function simBool(value: number | undefined): boolean {
  return typeof value === "number" && Math.abs(value) >= 0.5;
}

function derivePhase(
  telemetry: AircraftTelemetry | null,
  landingAnalysis: LandingAnalysisPayload | null
): Phase {
  if (!telemetry) {
    return "preflight";
  }

  if (simBool(telemetry.simOnGround)) {
    return landingAnalysis ? "landed" : "preflight";
  }

  const agl = numberOrNull(telemetry.altitudeAboveGroundFt);
  return agl !== null && agl <= 1000 ? "landing" : "approach";
}

function scoreToLetter(score: number): LandingReport["letter"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "E";
}

function toLandingReport(analysis: LandingAnalysisPayload): LandingReport {
  const score = Math.round(analysis.score);

  return {
    touchdownVerticalSpeedFpm: analysis.touchdownVerticalSpeedFpm,
    touchdownAirspeedKt: analysis.touchdownAirspeedKt,
    touchdownHeadingDeg: analysis.touchdownHeadingDeg,
    touchdownLatitudeDeg: analysis.touchdownLatitudeDeg,
    touchdownLongitudeDeg: analysis.touchdownLongitudeDeg,
    touchdownPitchDeg: numberOrNull(analysis.touchdownPitchDeg),
    touchdownBankDeg: numberOrNull(analysis.touchdownBankDeg),
    touchdownGForce: numberOrNull(analysis.touchdownGForce),
    score,
    letter: scoreToLetter(score),
    breakdown: [{ k: "Landing score", v: score, weight: 100 }],
    stableApproach: analysis.stableApproach,
  };
}

function flapsLabel(flapsIdx: number | null): string | null {
  if (flapsIdx === null) {
    return null;
  }

  return `INDEX ${Math.round(flapsIdx)}`;
}

export function useSim(_options: UseSimOptions = {}): UseSimResult {
  const {
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
    bridgeUrl,
  } = useBridgeTelemetry();
  const [paused, setPaused] = useState(false);
  const [trajectoryHistory, setTrajectoryHistory] = useState<TrajectoryRecord[]>(
    []
  );

  useEffect(() => {
    if (!telemetry || paused) {
      return;
    }

    setTrajectoryHistory((prev) => {
      const next: TrajectoryRecord = {
        timestampMs: Date.now(),
        latitudeDeg: telemetry.latitudeDeg,
        longitudeDeg: telemetry.longitudeDeg,
        altMSL: numberOrNull(telemetry.altitudeFt),
        altAGL: numberOrNull(telemetry.altitudeAboveGroundFt),
        ias: numberOrNull(telemetry.indicatedAirspeedKt),
        vs: numberOrNull(telemetry.verticalSpeedFpm),
        heading: numberOrNull(telemetry.headingDeg),
      };

      return [...prev.slice(-1199), next];
    });
  }, [paused, telemetry]);

  const noopPhase = useCallback((_phase: Phase) => undefined, []);
  const noopAircraft = useCallback((_aircraft: AircraftKey) => undefined, []);
  const noopApproach = useCallback((_approach: ApproachKey) => undefined, []);
  const noopStability = useCallback((_stability: Stability) => undefined, []);

  const report = useMemo(
    () => (landingAnalysis ? toLandingReport(landingAnalysis) : null),
    [landingAnalysis]
  );

  const phase = derivePhase(telemetry, landingAnalysis);
  const flapsIdx = telemetry ? numberOrNull(telemetry.flapsHandleIndex) : null;
  const runway: Runway = selectedRunway
    ? {
        airport: selectedRunway.airportIdent,
        airportName: null,
        runway: selectedRunway.runwayIdent,
        oppositeRunway: selectedRunway.oppositeIdent,
        course: selectedRunway.headingDegT,
        lengthFt: selectedRunway.lengthFt,
        widthFt: selectedRunway.widthFt,
        thresholdElevFt: selectedRunway.elevationFt,
        ilsFreq: null,
      }
    : UNKNOWN_RUNWAY;

  return {
    state: {
      connected: status === "connected",
      bridgeOk: status === "connected",
      bridgeStatus: status,
      bridgeUrl,
      lastMessageAt,
      hasTelemetry: telemetry !== null,
      simRate: null,
      aircraft: UNKNOWN_AIRCRAFT,
      approach: UNKNOWN_APPROACH,
      runway,
      phase,
      t: null,
      ias: telemetry ? numberOrNull(telemetry.indicatedAirspeedKt) : null,
      groundSpeedKt: telemetry ? numberOrNull(telemetry.groundSpeedKt) : null,
      altMSL: telemetry ? numberOrNull(telemetry.altitudeFt) : null,
      altAGL: telemetry ? numberOrNull(telemetry.altitudeAboveGroundFt) : null,
      vs: telemetry ? numberOrNull(telemetry.verticalSpeedFpm) : null,
      heading: telemetry ? numberOrNull(telemetry.headingDeg) : null,
      headingTarget: approachGuidance?.runwayHeadingDeg ?? null,
      hdgErr: approachGuidance?.courseErrorDeg ?? null,
      locDev: null,
      gsDev: null,
      flapsIdx,
      flapsLabel: flapsLabel(flapsIdx),
      gearDown: telemetry ? telemetry.gearHandlePosition >= 0.5 : null,
      pitchDeg: telemetry ? numberOrNull(telemetry.pitchDeg) : null,
      bankDeg: telemetry ? numberOrNull(telemetry.bankDeg) : null,
      gForce: telemetry ? numberOrNull(telemetry.gForce) : null,
      distNm: approachGuidance?.distanceNm ?? null,
      lat: telemetry ? numberOrNull(telemetry.latitudeDeg) : null,
      lon: telemetry ? numberOrNull(telemetry.longitudeDeg) : null,
      onApproachIas: false,
      stability: null,
      trajectoryHistory,
      report,
      navdata: {
        airportSearchQuery,
        airportResults,
        runwayAirportIdent,
        runwayResults,
        selectedRunway,
        approachGuidance,
        stabilityGate1000,
        stabilityGate500,
        error: navdataError,
      },
      scenario: {
        lastSpawnResult,
        status: scenarioStatus,
        spawnStatus,
        error: scenarioError,
      },
      aircraftAdapter: aircraftAdapterStatus,
      todos: TODOS,
    },
    actions: {
      setPhase: noopPhase,
      jumpTo: noopPhase,
      setPaused,
      paused,
      setAircraft: noopAircraft,
      setApproach: noopApproach,
      setStability: noopStability,
      searchAirports,
      requestRunways,
      selectRunway,
      spawnFinal,
      releaseSpawn,
      cancelSpawn,
    },
  };
}
