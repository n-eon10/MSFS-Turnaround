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
  | {
      type: string;
      payload?: unknown;
    };

export type BridgeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
