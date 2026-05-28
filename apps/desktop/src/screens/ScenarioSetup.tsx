import { useEffect, useMemo, useRef, useState } from "react";

import type {
  ScenarioPreset,
  ScenarioStatus,
  SpawnStatus,
  SpawnLifecycleState,
} from "../types/telemetry";
import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg } from "../sim/format";
import { StatusPill, TodoValue } from "./common";

const FEET_PER_NM = 6076.12;

const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "short_final",
    label: "Short Final",
    description: "3 NM final for touchdown practice",
    distanceNm: 3.0,
    glidepathDeg: 3.0,
    airspeedKt: 135.0,
    gearDown: true,
    flapsIndex: 4,
  },
  {
    id: "landing_practice",
    label: "Landing Practice",
    description: "5 NM final with landing configuration",
    distanceNm: 5.0,
    glidepathDeg: 3.0,
    airspeedKt: 140.0,
    gearDown: true,
    flapsIndex: 3,
  },
  {
    id: "standard_final",
    label: "Standard Final",
    description: "8 NM final for a normal stabilised approach",
    distanceNm: 8.0,
    glidepathDeg: 3.0,
    airspeedKt: 150.0,
    gearDown: true,
    flapsIndex: 3,
  },
  {
    id: "intercept_practice",
    label: "Intercept Practice",
    description: "10 NM final for alignment and descent practice",
    distanceNm: 10.0,
    glidepathDeg: 3.0,
    airspeedKt: 170.0,
    gearDown: true,
    flapsIndex: 2,
  },
  {
    id: "full_setup",
    label: "Full Setup",
    description: "12 NM final for configuring the aircraft yourself",
    distanceNm: 12.0,
    glidepathDeg: 3.0,
    airspeedKt: 180.0,
    gearDown: false,
    flapsIndex: 1,
  },
];

function plannedAltitudeFt(
  thresholdElevationFt: number,
  distanceNm: number,
  glidepathDeg: number
): number {
  return (
    thresholdElevationFt +
    distanceNm * FEET_PER_NM * Math.tan((glidepathDeg * Math.PI) / 180)
  );
}

function scenarioStatusKind(phase: ScenarioStatus["phase"]) {
  switch (phase) {
    case "confirmed":
      return "good";
    case "failed":
      return "bad";
    case "warning":
    case "validating":
    case "spawn_requested":
    case "spawned":
    default:
      return "warn";
  }
}

function spawnStatusKind(state: SpawnLifecycleState) {
  switch (state) {
    case "READY_TO_RELEASE":
    case "FLYING":
      return "good";
    case "FAILED":
      return "bad";
    case "IDLE":
    case "CALCULATE_FINAL_POSITION":
    case "TELEPORT_WITH_INITPOSITION":
    case "FREEZE_HOLD":
    case "CONFIGURE_AIRCRAFT":
    case "STABILISE_SIM_STATE":
    case "SMOOTH_RELEASE":
    default:
      return "warn";
  }
}

function scenarioStatusLabel(phase: ScenarioStatus["phase"]) {
  switch (phase) {
    case "spawn_requested":
      return "REQUESTED";
    case "spawned":
      return "SPAWNED";
    case "validating":
      return "VALIDATING";
    case "confirmed":
      return "CONFIRMED";
    case "warning":
      return "WARNING";
    case "failed":
      return "FAILED";
    default:
      return "WAITING";
  }
}

function spawnStatusLabel(status: SpawnStatus) {
  return status.label?.toUpperCase() ?? status.state.replace(/_/g, " ");
}

function spawnIsActive(state: SpawnLifecycleState | undefined) {
  return (
    state === "CALCULATE_FINAL_POSITION" ||
    state === "TELEPORT_WITH_INITPOSITION" ||
    state === "FREEZE_HOLD" ||
    state === "CONFIGURE_AIRCRAFT" ||
    state === "STABILISE_SIM_STATE" ||
    state === "READY_TO_RELEASE" ||
    state === "SMOOTH_RELEASE"
  );
}

function adapterDisplayName(name: string | undefined) {
  if (!name) {
    return "Unknown";
  }

  return name.replace(/AircraftAdapter$/, "");
}

export function ScenarioSetup({
  sim,
  onSpawnSuccess,
}: {
  sim: UseSimResult;
  onSpawnSuccess?: () => void;
}) {
  const s = sim.state;
  const selectedRunway = s.navdata.selectedRunway;
  const lastResult = s.scenario.lastSpawnResult;
  const latestStatus = s.scenario.status;
  const latestSpawnStatus = s.scenario.spawnStatus;
  const aircraftAdapter = s.aircraftAdapter;
  const [selectedPresetId, setSelectedPresetId] = useState("standard_final");
  const [distanceNm, setDistanceNm] = useState(8);
  const [glidepathDeg, setGlidepathDeg] = useState(3);
  const [airspeedKt, setAirspeedKt] = useState(150);
  const [gearDown, setGearDown] = useState(true);
  const [flapsIndex, setFlapsIndex] = useState(3);

  const selectedPreset =
    SCENARIO_PRESETS.find((preset) => preset.id === selectedPresetId) ?? null;

  useEffect(() => {
    if (!selectedPreset) {
      return;
    }

    setDistanceNm(selectedPreset.distanceNm);
    setGlidepathDeg(selectedPreset.glidepathDeg);
    setAirspeedKt(selectedPreset.airspeedKt);
    setGearDown(selectedPreset.gearDown);
    setFlapsIndex(selectedPreset.flapsIndex);
  }, [selectedPreset]);

  const plannedAltitude = useMemo(() => {
    if (!selectedRunway) {
      return null;
    }

    return plannedAltitudeFt(
      selectedRunway.elevationFt,
      distanceNm,
      glidepathDeg
    );
  }, [distanceNm, glidepathDeg, selectedRunway]);

  const disabledReason = !s.connected
    ? "Bridge is not connected"
    : !selectedRunway
      ? !s.hasTelemetry
        ? "Select a runway in Airport Setup or wait for live telemetry"
        : null
      : null;
  const spawnActive = spawnIsActive(latestSpawnStatus?.state);
  const readyToRelease = latestSpawnStatus?.readyToRelease === true;
  const showCancel =
    spawnActive || latestSpawnStatus?.state === "FAILED";
  const spawnDisabled = disabledReason !== null || spawnActive;
  const spawnSummary = selectedRunway
    ? `${fmt(distanceNm, 1)} NM final, ${fmt(glidepathDeg, 1)} DEG, heading ${padHdg(selectedRunway.headingDegT)}`
    : "No runway selected; bridge will use the runway nearest the current aircraft position";
  const runwayStatus = selectedRunway
    ? "RUNWAY READY"
    : s.hasTelemetry
      ? "AUTO FROM SIM"
      : "NO RUNWAY";

  const [pending, setPending] = useState(false);
  const resultCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pending) return;

    const terminalStatus =
      latestSpawnStatus?.state === "FLYING" ||
      latestSpawnStatus?.state === "FAILED" ||
      latestStatus?.phase === "confirmed" ||
      latestStatus?.phase === "warning" ||
      latestStatus?.phase === "failed";

    if (terminalStatus || s.scenario.error || (lastResult && !lastResult.ok)) {
      setPending(false);
      resultCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });

      if (
        (latestSpawnStatus?.state === "FLYING" ||
          latestStatus?.phase === "confirmed") &&
        onSpawnSuccess
      ) {
        const id = setTimeout(onSpawnSuccess, 1200);
        return () => clearTimeout(id);
      }
    }
  }, [
    pending,
    latestStatus,
    latestSpawnStatus,
    lastResult,
    s.scenario.error,
    onSpawnSuccess,
  ]);

  useEffect(() => {
    if (!readyToRelease) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.code === "Space") {
        event.preventDefault();
        sim.actions.releaseSpawn();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readyToRelease, sim.actions]);

  const spawnOnFinal = () => {
    setPending(true);
    sim.actions.spawnFinal({
      ...(selectedRunway
        ? {
            airportIdent: selectedRunway.airportIdent,
            runwayIdent: selectedRunway.runwayIdent,
          }
        : {}),
      distanceNm,
      glidepathDeg,
      airspeedKt,
      gearDown,
      flapsIndex,
    });
  };

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">SCENARIO SETUP</span>
            <StatusPill kind={selectedRunway ? "good" : "warn"}>
              {runwayStatus}
            </StatusPill>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Selected runway</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway ? (
                  `${selectedRunway.airportIdent} ${selectedRunway.runwayIdent}`
                ) : (
                  <TodoValue label="NONE" />
                )}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Preset</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedPreset?.label ?? "-"}
              </div>
              <div className="sub">
                {selectedPreset?.description ?? "Manual scenario"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Threshold elev</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway ? `${fmt(selectedRunway.elevationFt)} FT` : "-"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Planned altitude</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {plannedAltitude === null ? "-" : `${fmt(plannedAltitude)} FT`}
              </div>
              <div className="sub">MSL on selected glidepath</div>
            </div>
            <div className="metric">
              <div className="lbl">Distance</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {fmt(distanceNm, 1)} NM
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway ? `${padHdg(selectedRunway.headingDegT)} DEG` : "-"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Airspeed</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {fmt(airspeedKt)} KT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Configuration</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {gearDown ? "GEAR DN" : "GEAR UP"}
              </div>
              <div className="sub">Flaps index {fmt(flapsIndex)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">FINAL APPROACH PRESETS</span>
            <StatusPill kind={s.connected ? "good" : "warn"}>
              {s.connected ? "BRIDGE READY" : "BRIDGE OFFLINE"}
            </StatusPill>
          </div>
          <div className="card-body">
            <div className="tile-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`tile ${selectedPresetId === preset.id ? "sel" : ""}`}
                  onClick={() => setSelectedPresetId(preset.id)}
                  style={{ textAlign: "left" }}
                >
                  <div className="code">{preset.label}</div>
                  <div className="meta">{preset.description}</div>
                  <div className="meta" style={{ marginTop: 8 }}>
                    {fmt(preset.distanceNm, 1)} NM / {fmt(preset.airspeedKt)} KT / F{preset.flapsIndex}
                  </div>
                </button>
              ))}
            </div>

            <div className="grid-4" style={{ gap: 18, marginTop: 18 }}>
              <label className="metric sm">
                <span className="lbl">Distance</span>
                <input
                  className="mono"
                  type="number"
                  min={1}
                  max={25}
                  step={0.1}
                  value={distanceNm}
                  onChange={(event) => setDistanceNm(Number(event.target.value))}
                />
              </label>
              <label className="metric sm">
                <span className="lbl">Glidepath</span>
                <input
                  className="mono"
                  type="number"
                  min={2}
                  max={4.5}
                  step={0.1}
                  value={glidepathDeg}
                  onChange={(event) => setGlidepathDeg(Number(event.target.value))}
                />
              </label>
              <label className="metric sm">
                <span className="lbl">Airspeed</span>
                <input
                  className="mono"
                  type="number"
                  min={40}
                  max={250}
                  step={1}
                  value={airspeedKt}
                  onChange={(event) => setAirspeedKt(Number(event.target.value))}
                />
              </label>
              <label className="metric sm">
                <span className="lbl">Flaps index</span>
                <input
                  className="mono"
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={flapsIndex}
                  onChange={(event) => setFlapsIndex(Number(event.target.value))}
                />
              </label>
            </div>

            <div className="row" style={{ gap: 18, marginTop: 18, alignItems: "stretch" }}>
              <div className="metric sm" style={{ minWidth: 220 }}>
                <div className="lbl">Preview</div>
                <div className="todo-note">
                  {selectedRunway
                    ? `${selectedRunway.airportIdent} ${selectedRunway.runwayIdent} at ${fmt(distanceNm, 1)} NM final, ${fmt(airspeedKt)} KT, flaps ${fmt(flapsIndex)}`
                    : "Spawn will target the runway nearest the current aircraft position."}
                </div>
                <div className="todo-note" style={{ marginTop: 8 }}>
                  Spawn freezes, configures, verifies, then waits for release.
                </div>
              </div>
              <div className="metric sm" style={{ minWidth: 260 }}>
                <div className="lbl">Aircraft / adapter</div>
                <div className="val mono" style={{ fontSize: 18 }}>
                  {aircraftAdapter?.identity.title ?? "Unknown"}
                </div>
                <div className="sub">
                  Adapter: {adapterDisplayName(aircraftAdapter?.adapter.name)}
                </div>
                <div className="todo-note" style={{ marginTop: 8 }}>
                  Landing config:{" "}
                  {aircraftAdapter?.adapter.capabilities.canVerifyGear ||
                  aircraftAdapter?.adapter.capabilities.canVerifyFlaps
                    ? "Verified where possible"
                    : "Best effort"}
                </div>
                <div className="todo-note" style={{ marginTop: 8 }}>
                  FMC/FMS setup:{" "}
                  {aircraftAdapter?.adapter.capabilities.canConfigureFms
                    ? "Supported"
                    : "Not supported by generic adapter"}
                </div>
              </div>
              <div className="metric sm">
                <div className="lbl">Configuration</div>
                <label className="check active" style={{ marginTop: 0 }}>
                  <input
                    type="checkbox"
                    checked={gearDown}
                    onChange={(event) => setGearDown(event.target.checked)}
                  />
                  <span className="lbl">Gear down</span>
                </label>
                <div className="check active">
                  <div className="box"></div>
                  <div className="lbl">Freeze/hold after spawn is automatic</div>
                </div>
              </div>
            </div>

            <div
              className="row"
              style={{ alignItems: "center", justifyContent: "space-between", marginTop: 18 }}
            >
              <div className="todo-note">
                {disabledReason ? disabledReason : spawnSummary}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {spawnActive && !readyToRelease && (
                  <StatusPill kind="warn">SPAWNING...</StatusPill>
                )}
                {showCancel && (
                  <button
                    className="btn"
                    type="button"
                    onClick={sim.actions.cancelSpawn}
                    title="Abort spawn and unfreeze the aircraft"
                  >
                    {latestSpawnStatus?.state === "FAILED" ? "UNFREEZE" : "CANCEL"}
                  </button>
                )}
                {readyToRelease && (
                  <button
                    className="btn primary"
                    type="button"
                    onClick={sim.actions.releaseSpawn}
                    title="Ctrl + Shift + Space"
                  >
                    RELEASE AIRCRAFT
                  </button>
                )}
                <button
                  className="btn primary"
                  type="button"
                  disabled={spawnDisabled || pending}
                  onClick={spawnOnFinal}
                  title={disabledReason ?? undefined}
                >
                  {spawnActive ? "SPAWN ACTIVE" : "SPAWN ON FINAL"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }} ref={resultCardRef}>
          <div className="card-head">
            <span className="lbl">SCENARIO STATUS</span>
            <StatusPill
              kind={
                latestSpawnStatus
                  ? spawnStatusKind(latestSpawnStatus.state)
                  : latestStatus
                    ? scenarioStatusKind(latestStatus.phase)
                    : "warn"
              }
            >
              {latestSpawnStatus
                ? spawnStatusLabel(latestSpawnStatus)
                : latestStatus
                  ? scenarioStatusLabel(latestStatus.phase)
                  : "WAITING"}
            </StatusPill>
          </div>
          <div className="card-body">
            {latestSpawnStatus ? (
              <>
                <div className="todo-note" style={{ marginBottom: 12 }}>
                  {latestSpawnStatus.message}
                  {latestSpawnStatus.readyToRelease
                    ? " Use Release Aircraft or Ctrl + Shift + Space."
                    : ""}
                </div>
                {(latestSpawnStatus.warnings ?? []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {(latestSpawnStatus.warnings ?? []).map((warning) => (
                      <div key={warning} className="check active">
                        <div className="box"></div>
                        <div className="lbl">{warning}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : latestStatus ? (
              <>
                <div className="todo-note" style={{ marginBottom: 12 }}>
                  {latestStatus.message}
                </div>
                {(latestStatus.warnings ?? []).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {(latestStatus.warnings ?? []).map((warning) => (
                      <div key={warning} className="check active">
                        <div className="box"></div>
                        <div className="lbl">{warning}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="todo-note" style={{ marginBottom: 12 }}>
                No scenario.status message received yet.
              </div>
            )}

            {s.scenario.error && (
              <div className="todo-note" style={{ color: "var(--bad)", marginBottom: 12 }}>
                {s.scenario.error}
              </div>
            )}

            <div className="card-head" style={{ paddingLeft: 0, paddingRight: 0, borderBottom: 0 }}>
              <span className="lbl">LAST SPAWN RESULT</span>
              {lastResult ? (
                <StatusPill kind={lastResult.ok ? "good" : "bad"}>
                  {lastResult.ok ? "SPAWNED" : "FAILED"}
                </StatusPill>
              ) : (
                <StatusPill kind="warn">WAITING</StatusPill>
              )}
            </div>

            {lastResult?.ok ? (
              <div className="kv">
                <div className="k">Runway</div>
                <div className="v">
                  {lastResult.airportIdent} {lastResult.runwayIdent}
                </div>
                <div className="k">Start</div>
                <div className="v">{fmt(lastResult.distanceNm, 1)} NM</div>
                <div className="k">Altitude</div>
                <div className="v">{fmt(lastResult.spawnAltitudeFt)} ft MSL</div>
                <div className="k">Heading</div>
                <div className="v">{padHdg(lastResult.spawnHeadingDeg)} deg</div>
                <div className="k">Airspeed</div>
                <div className="v">{fmt(lastResult.airspeedKt)} kt</div>
                <div className="k">Config</div>
                <div className="v">
                  Gear {lastResult.gearRequested ? "down" : "up"}, flaps{" "}
                  {lastResult.flapsRequested ? "requested" : "clean"}
                </div>
              </div>
            ) : (
              <div className="todo-note">
                No scenario.spawn_final.result message received yet.
              </div>
            )}

            {lastResult?.warnings && lastResult.warnings.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {lastResult.warnings.map((warning) => (
                  <div key={warning} className="check active">
                    <div className="box"></div>
                    <div className="lbl">{warning}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
