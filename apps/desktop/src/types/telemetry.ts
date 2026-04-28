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
};

export type BridgeMessage =
  | {
      type: "aircraft.telemetry";
      payload: AircraftTelemetry;
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