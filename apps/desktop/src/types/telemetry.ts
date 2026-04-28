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
      type: string;
      payload?: unknown;
    };

export type BridgeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
