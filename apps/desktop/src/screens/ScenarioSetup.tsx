import { useEffect, useMemo, useRef, useState } from "react";

import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg } from "../sim/format";
import { StatusPill, TodoValue } from "./common";

const DISTANCE_PRESETS = [3, 5, 8, 10, 12];
const FEET_PER_NM = 6076.12;

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

export function ScenarioSetup({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const selectedRunway = s.navdata.selectedRunway;
  const lastResult = s.scenario.lastSpawnResult;
  const [distanceNm, setDistanceNm] = useState(8);
  const [glidepathDeg, setGlidepathDeg] = useState(3);
  const [airspeedKt, setAirspeedKt] = useState(140);
  const [gearDown, setGearDown] = useState(true);
  const [flapsIndex, setFlapsIndex] = useState(3);
  const [pauseAfterSpawn, setPauseAfterSpawn] = useState(false);

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
  const spawnDisabled = disabledReason !== null;
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
    if (lastResult || s.scenario.error) {
      setPending(false);
      resultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [pending, lastResult, s.scenario.error]);

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
      pauseAfterSpawn,
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
                {selectedRunway
                  ? `${selectedRunway.airportIdent} ${selectedRunway.runwayIdent}`
                  : <TodoValue label="NONE" />}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway ? `${padHdg(selectedRunway.headingDegT)} DEG` : "-"}
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
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">FINAL APPROACH PRESET</span>
            <StatusPill kind={s.connected ? "good" : "warn"}>
              {s.connected ? "BRIDGE READY" : "BRIDGE OFFLINE"}
            </StatusPill>
          </div>
          <div className="card-body">
            <div className="row" style={{ alignItems: "center", flexWrap: "wrap" }}>
              <div className="seg">
                {DISTANCE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={distanceNm === preset ? "sel" : ""}
                    onClick={() => setDistanceNm(preset)}
                  >
                    {preset} NM
                  </button>
                ))}
              </div>
              <label className="metric sm" style={{ minWidth: 150 }}>
                <span className="lbl">Custom distance</span>
                <input
                  className="mono"
                  type="number"
                  min={1}
                  max={25}
                  step={0.1}
                  value={distanceNm}
                  onChange={(event) => setDistanceNm(Number(event.target.value))}
                  style={{
                    padding: "8px 10px",
                    background: "var(--panel-2)",
                    border: "1px solid var(--border-2)",
                    color: "var(--fg)",
                    borderRadius: 6,
                  }}
                />
              </label>
            </div>

            <div className="grid-4" style={{ gap: 18, marginTop: 18 }}>
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
                <label className="check active">
                  <input
                    type="checkbox"
                    checked={pauseAfterSpawn}
                    onChange={(event) => setPauseAfterSpawn(event.target.checked)}
                  />
                  <span className="lbl">Pause after spawn</span>
                </label>
              </div>
            </div>

            <div
              className="row"
              style={{ alignItems: "center", justifyContent: "space-between", marginTop: 18 }}
            >
              <div className="todo-note">
                {disabledReason
                  ? disabledReason
                  : spawnSummary}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {pending && <StatusPill kind="warn">SPAWNING…</StatusPill>}
                <button
                  className="btn primary"
                  type="button"
                  disabled={spawnDisabled || pending}
                  onClick={spawnOnFinal}
                  title={disabledReason ?? undefined}
                >
                  {pending ? "SPAWNING…" : "SPAWN ON FINAL"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ width: 380 }} ref={resultCardRef}>
          <div className="card-head">
            <span className="lbl">LAST SPAWN RESULT</span>
            {lastResult ? (
              <StatusPill kind={lastResult.ok ? "good" : "bad"}>
                {lastResult.ok ? "SPAWNED" : "FAILED"}
              </StatusPill>
            ) : (
              <StatusPill kind="warn">WAITING</StatusPill>
            )}
          </div>
          <div className="card-body">
            {s.scenario.error && (
              <div className="todo-note" style={{ color: "var(--bad)", marginBottom: 12 }}>
                {s.scenario.error}
              </div>
            )}
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
                  Gear {lastResult.gearRequested ? "down" : "up"},{" "}
                  {lastResult.flapsRequested ? "flaps requested" : "flaps clean"}
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
