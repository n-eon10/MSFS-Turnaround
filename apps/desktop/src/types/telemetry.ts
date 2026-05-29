export type AircraftTelemetry = {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeFt: number;
  indicatedAirspeedKt: number;
  verticalSpeedFpm: number;
  headingDeg: number;
  gearHandlePosition: number;
  flapsHandleIndex: number;
  simOnGround: number;
  groundSpeedKt?: number;
  altitudeAboveGroundFt?: number;
  pitchDeg?: number;
  bankDeg?: number;
  gForce?: number;
  latitudeLongitudeFreezeOn?: number;
  altitudeFreezeOn?: number;
  attitudeFreezeOn?: number;
  trueAirspeedKt?: number;
  throttlePercent?: number;
  elevatorTrimPercent?: number;
  angleOfAttackDeg?: number;
};

export type LandingAnalysisPayload = {
  touchdownVerticalSpeedFpm: number;
  touchdownAirspeedKt: number;
  touchdownHeadingDeg: number;
  touchdownLatitudeDeg: number;
  touchdownLongitudeDeg: number;
  touchdownPitchDeg?: number;
  touchdownBankDeg?: number;
  touchdownGForce?: number;
  score: number;
  stableApproach?: {
    gate1000: LandingStableApproachGate;
    gate500: LandingStableApproachGate;
  };
};

export type LandingStableApproachGate = {
  captured: boolean;
  stable: boolean;
  issues: string[];
  distanceNm?: number;
  courseErrorDeg?: number;
  lateralDeviationM?: number;
  glidepathDeviationFt?: number;
  verticalSpeedFpm?: number;
  bankDeg?: number;
};

export type NavAirport = {
  ident: string;
  name: string;
  type: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationFt: number;
  isoCountry: string;
  municipality: string;
};

export type NavRunwayEnd = {
  airportIdent: string;
  runwayIdent: string;
  oppositeIdent: string;
  latitudeDeg: number;
  longitudeDeg: number;
  elevationFt: number;
  headingDegT: number;
  displacedThresholdFt: number;
  lengthFt: number;
  widthFt: number;
  surface: string;
  lighted: boolean;
  closed: boolean;
};

export type ApproachGuidance = {
  type: "approach.guidance";
  airportIdent: string;
  runwayIdent: string;
  distanceNm: number;
  bearingToThresholdDeg: number;
  runwayHeadingDeg: number;
  courseErrorDeg: number;
  lateralDeviationM: number;
  alongTrackDistanceNm: number;
  glidepathDeg: number;
  glidepathTargetAltitudeFt: number;
  glidepathDeviationFt: number;
  stable: boolean;
  issues: string[];
};

export type ApproachStabilityGate = {
  type: "approach.stability_gate";
  gateAglFt: 1000 | 500;
  airportIdent: string;
  runwayIdent: string;
  stable: boolean;
  radioAltitudeFt: number;
  distanceNm: number;
  courseErrorDeg: number;
  lateralDeviationM: number;
  glidepathDeviationFt: number;
  indicatedAirspeedKt: number;
  verticalSpeedFpm: number;
  bankDeg: number;
  pitchDeg: number;
  issues: string[];
};

export type ScenarioPreset = {
  id: string;
  label: string;
  description: string;
  distanceNm: number;
  glidepathDeg: number;
  airspeedKt: number;
  gearDown: boolean;
  flapsIndex: number;
};

export type SpawnFinalRequest = {
  type: "scenario.spawn_final";
  airportIdent?: string;
  runwayIdent?: string;
  distanceNm: number;
  glidepathDeg: number;
  airspeedKt: number;
  gearDown: boolean;
  flapsIndex: number;
};

export type SpawnFinalResult = {
  type: "scenario.spawn_final.result";
  ok: boolean;
  error?: string;
  warnings?: string[];
  runway?: NavRunwayEnd;
  airportIdent?: string;
  runwayIdent?: string;
  distanceNm?: number;
  glidepathDeg?: number;
  airspeedKt?: number;
  spawnLatitudeDeg?: number;
  spawnLongitudeDeg?: number;
  spawnAltitudeFt?: number;
  spawnHeadingDeg?: number;
  gearRequested?: boolean;
  flapsRequested?: boolean;
  parkingBrakeRequested?: boolean;
  pauseRequested?: boolean;
};

export type ScenarioStatus = {
  type: "scenario.status";
  phase:
    | "spawn_requested"
    | "spawned"
    | "validating"
    | "confirmed"
    | "warning"
    | "failed";
  message: string;
  airportIdent?: string;
  runwayIdent?: string;
  warnings?: string[];
};

export type SpawnLifecycleState =
  | "IDLE"
  | "CALCULATE_FINAL_POSITION"
  | "TELEPORT_WITH_INITPOSITION"
  | "FREEZE_HOLD"
  | "CONFIGURE_AIRCRAFT"
  | "STABILISE_SIM_STATE"
  | "READY_TO_RELEASE"
  | "SMOOTH_RELEASE"
  | "FLYING"
  | "FAILED";

export type SpawnEnergyTarget = {
  targetIasKt: number;
  targetDescentRateFpm: number;
  targetPitchDeg: number;
  targetTrimPct: number;
  targetThrustPct: number;
  injectTrim: boolean;
  injectThrust: boolean;
  holdAutopilot: boolean;
};

export type SpawnDiagnostics = {
  stabilizationElapsedMs: number;
  releaseReady: boolean;
  withinTolerance: boolean;
  speedErrorKt: number;
  vsErrorFpm: number;
  pitchErrorDeg: number;
  bankDeg: number;
  trimError: number;
  throttleError: number;
  target: SpawnEnergyTarget;
};

export type SpawnStatus = {
  type: "spawn.status";
  state: SpawnLifecycleState;
  label?: string;
  message: string;
  readyToRelease: boolean;
  airportIdent?: string;
  runwayIdent?: string;
  warnings?: string[];
  diagnostics?: SpawnDiagnostics;
};

export type AircraftAdapterCapabilities = {
  canSetGear: boolean;
  canSetFlaps: boolean;
  canSetSpoilers: boolean;
  canSetAutobrake: boolean;
  canSetLandingLights: boolean;
  canSetAutopilot: boolean;
  canSetNavRadio: boolean;
  canSetApproachMode: boolean;
  canConfigureFms: boolean;
  canVerifyFlaps: boolean;
  canVerifyGear: boolean;
  requiresAircraftSpecificSdk: boolean;
};

export type AircraftAdapterStatus = {
  type: "aircraft.adapter";
  identity: {
    title: string;
    atcType: string;
    atcModel: string;
    detectedFamily: string;
    detectedVariant: string;
    isKnownAircraft: boolean;
  };
  adapter: {
    name: string;
    capabilities: AircraftAdapterCapabilities;
  };
};

export type BridgeMessage =
  | {
      type: "aircraft.telemetry";
      payload: AircraftTelemetry;
    }
  | {
      type: "landing.analysis";
      payload: LandingAnalysisPayload;
    }
  | {
      type: "navdata.search_airports.result";
      query: string;
      airports: NavAirport[];
      error?: string;
    }
  | {
      type: "navdata.get_runways.result";
      airportIdent: string;
      runways: NavRunwayEnd[];
      error?: string;
    }
  | {
      type: "approach.select_runway.result";
      ok: boolean;
      airportIdent: string;
      runwayIdent: string;
      error?: string;
    }
  | ApproachGuidance
  | ApproachStabilityGate
  | ScenarioStatus
  | SpawnStatus
  | AircraftAdapterStatus
  | SpawnFinalResult
  | {
      type: string;
      payload?: unknown;
    };

export type BridgeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
