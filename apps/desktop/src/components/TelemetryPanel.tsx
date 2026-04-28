import type {
  AircraftTelemetry,
  BridgeConnectionStatus,
} from "../types/telemetry";
import { DataCell } from "./DataCell";

type TelemetryPanelProps = {
  status: BridgeConnectionStatus;
  telemetry: AircraftTelemetry | null;
  lastMessageAt: Date | null;
  bridgeUrl: string;
};

function formatNumber(value: number | undefined, digits = 0): string {
  if (value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(digits);
}

function flag(
  value: number | undefined,
  trueText: string,
  falseText: string
): string {
  if (value === undefined || Number.isNaN(value)) return "--";
  return value >= 0.5 ? trueText : falseText;
}

function statusText(status: BridgeConnectionStatus): string {
  switch (status) {
    case "connected":
      return "CONNECTED";
    case "connecting":
      return "CONNECTING";
    case "disconnected":
      return "OFFLINE";
    case "error":
      return "ERROR";
  }
}

export function TelemetryPanel({
  status,
  telemetry,
  lastMessageAt,
  bridgeUrl,
}: TelemetryPanelProps) {
  return (
    <div>
      <div className="grid grid-cols-2 border-b-2 border-[#8a857d]">
        <div className="border-r-2 border-[#8a857d] bg-[#173955] p-8 text-white">
          <div className="mb-6 text-[72px] font-bold leading-none">
            live.
          </div>
          <div className="text-[72px] font-bold leading-none text-[#dbe7ef]">
            telemetry
          </div>

          <div className="mt-10 rounded-[6px] border-2 border-[#c7d3dc] bg-[#244865] p-4 text-[18px]">
            Aircraft data received through the C++ SimConnect bridge.
          </div>
        </div>

        <div className="bg-[#f3f0ea] p-6">
          <div className="mb-4 rounded-[6px] border-2 border-[#2c2c2c] bg-white p-4">
            <div className="mb-2 text-[14px] uppercase tracking-[0.14em] text-[#555]">
              Bridge
            </div>
            <div className="text-[18px] font-semibold">{bridgeUrl}</div>
          </div>

          <div className="mb-4 rounded-[6px] border-2 border-[#2c2c2c] bg-white p-4">
            <div className="mb-2 text-[14px] uppercase tracking-[0.14em] text-[#555]">
              Last Packet
            </div>
            <div className="text-[18px] font-semibold">
              {lastMessageAt ? lastMessageAt.toLocaleTimeString() : "--:--:--"}
            </div>
          </div>

          <div className="rounded-[6px] border-2 border-[#2c2c2c] bg-[#efe6b8] p-4">
            <div className="mb-2 text-[14px] uppercase tracking-[0.14em] text-[#555]">
              Status
            </div>
            <div className="text-[28px] font-bold">{statusText(status)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 p-5">
        <DataCell
          label="IAS"
          value={telemetry ? formatNumber(telemetry.indicatedAirspeedKt) : "--"}
          unit="KT"
          tone="blue"
        />
        <DataCell
          label="Altitude"
          value={telemetry ? formatNumber(telemetry.altitudeFt) : "--"}
          unit="FT"
        />
        <DataCell
          label="V/S"
          value={telemetry ? formatNumber(telemetry.verticalSpeedFpm) : "--"}
          unit="FPM"
          tone="red"
        />
        <DataCell
          label="Heading"
          value={telemetry ? formatNumber(telemetry.headingDeg) : "--"}
          unit="DEG"
          tone="yellow"
        />
        <DataCell
          label="Gear"
          value={
            telemetry ? flag(telemetry.gearHandlePosition, "DOWN", "UP") : "--"
          }
          tone="green"
        />
        <DataCell
          label="Flaps"
          value={telemetry ? formatNumber(telemetry.flapsHandleIndex) : "--"}
        />
        <DataCell
          label="State"
          value={telemetry ? flag(telemetry.simOnGround, "GROUND", "AIR") : "--"}
          tone="blue"
        />
        <DataCell
          label="Position"
          value={
            telemetry
              ? `${formatNumber(telemetry.latitudeDeg, 3)}, ${formatNumber(
                  telemetry.longitudeDeg,
                  3
                )}`
              : "--"
          }
        />
      </div>
    </div>
  );
}