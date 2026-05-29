import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg, sign } from "../sim/format";
import { StatusPill } from "./common";
import type { ApproachStabilityGate } from "../types/telemetry";

function valueClass(value: number | null, warnAt: number, badAt: number): string {
  if (value === null) return "";
  const abs = Math.abs(value);
  if (abs >= badAt) return "bad";
  if (abs >= warnAt) return "warn";
  return "";
}

function lateralLabel(valueM: number): string {
  if (Math.abs(valueM) < 1) return "ON CENTRELINE";
  return `${fmt(Math.abs(valueM))} M ${valueM > 0 ? "RIGHT" : "LEFT"}`;
}

function glidepathLabel(valueFt: number): string {
  if (Math.abs(valueFt) < 1) return "ON PATH";
  return `${fmt(Math.abs(valueFt))} FT ${valueFt > 0 ? "HIGH" : "LOW"}`;
}

function GateSummary({
  label,
  gate,
}: {
  label: string;
  gate: ApproachStabilityGate | null;
}) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-head">
        <span className="lbl">{label}</span>
        {gate ? (
          <StatusPill kind={gate.stable ? "good" : "bad"}>
            {gate.stable ? "STABLE" : "UNSTABLE"}
          </StatusPill>
        ) : (
          <StatusPill kind="warn">NOT CAPTURED</StatusPill>
        )}
      </div>
      <div className="card-body">
        {gate ? (
          <>
            <div className="grid-4" style={{ gap: "var(--gap)" }}>
              <div className="metric sm">
                <div className="lbl">Distance</div>
                <div className="val">
                  {fmt(gate.distanceNm, 1)}
                  <span className="unit">NM</span>
                </div>
              </div>
              <div className="metric sm">
                <div className="lbl">Course error</div>
                <div className="val">
                  {sign(gate.courseErrorDeg)}
                  {fmt(gate.courseErrorDeg, 1)}
                  <span className="unit">DEG</span>
                </div>
              </div>
              <div className="metric sm">
                <div className="lbl">Centreline</div>
                <div className="val">{lateralLabel(gate.lateralDeviationM)}</div>
              </div>
              <div className="metric sm">
                <div className="lbl">Glidepath</div>
                <div className="val">{glidepathLabel(gate.glidepathDeviationFt)}</div>
              </div>
              <div className="metric sm">
                <div className="lbl">Vertical speed</div>
                <div className="val">
                  {sign(gate.verticalSpeedFpm)}
                  {fmt(gate.verticalSpeedFpm)}
                  <span className="unit">FPM</span>
                </div>
              </div>
              <div className="metric sm">
                <div className="lbl">Bank</div>
                <div className="val">
                  {fmt(gate.bankDeg, 1)}
                  <span className="unit">DEG</span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              {gate.issues.length > 0 ? (
                gate.issues.map((issue) => (
                  <div key={issue} className="check active">
                    <div className="box"></div>
                    <div className="lbl">{issue}</div>
                  </div>
                ))
              ) : (
                <div className="check done">
                  <div className="box"></div>
                  <div className="lbl">No gate issues</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="todo-note">Waiting for descent through this gate.</div>
        )}
      </div>
    </div>
  );
}

export function LiveMonitor({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const guidance = s.navdata.approachGuidance;
  const selectedRunway = s.navdata.selectedRunway;
  const gate1000 = s.navdata.stabilityGate1000;
  const gate500 = s.navdata.stabilityGate500;
  const telemetryKind = s.hasTelemetry ? "good" : "warn";
  const vsClass =
    s.vs === null ? "" : s.vs < -1100 ? "bad" : s.vs < -900 ? "warn" : "";

  return (
    <>
      <div className="row" style={{ gap: "var(--gap)" }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">PRIMARY TELEMETRY</span>
            <StatusPill kind={telemetryKind}>
              {s.hasTelemetry ? "LIVE" : "WAITING"}
            </StatusPill>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div className="metric lg">
              <div className="lbl">IAS</div>
              <div className="val">
                {fmt(s.ias)}
                <span className="unit">KT</span>
              </div>
              {/* TODO: VApp target from aircraft adapter — show deviation from target approach speed */}
            </div>
            <div className="metric lg">
              <div className="lbl">Radio Alt</div>
              <div className="val">
                {fmt(s.altAGL)}
                <span className="unit">FT AGL</span>
              </div>
              <div className="sub">MSL {fmt(s.altMSL)} FT</div>
            </div>
            <div className="metric lg">
              <div className="lbl">Vertical speed</div>
              <div className={`val ${vsClass}`}>
                {sign(s.vs)}
                {fmt(s.vs)}
                <span className="unit">FPM</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">POSITION</span>
          </div>
          <div
            className="card-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <div className="metric sm">
              <div className="lbl">Latitude</div>
              <div className="val mono">
                {s.lat === null ? "—" : s.lat.toFixed(5)}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Longitude</div>
              <div className="val mono">
                {s.lon === null ? "—" : s.lon.toFixed(5)}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Runway distance</div>
              <div className="val">
                {guidance ? fmt(guidance.distanceNm, 1) : "—"}
                {guidance && <span className="unit">NM</span>}
              </div>
              <div className="sub">
                {selectedRunway
                  ? `${selectedRunway.airportIdent}/${selectedRunway.runwayIdent}`
                  : "No runway selected"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: "var(--gap)" }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">ATTITUDE / LOAD</span>
          </div>
          <div className="card-body grid-4" style={{ gap: "var(--gap)" }}>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val">
                {padHdg(s.heading)}
                <span className="unit">DEG</span>
              </div>
              <div className="sub">
                RWY {guidance ? padHdg(guidance.runwayHeadingDeg) : "—"} DEG
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Pitch</div>
              <div className={`val ${valueClass(s.pitchDeg, 8, 12)}`}>
                {fmt(s.pitchDeg, 1)}
                <span className="unit">DEG</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Bank</div>
              <div className={`val ${valueClass(s.bankDeg, 10, 20)}`}>
                {fmt(s.bankDeg, 1)}
                <span className="unit">DEG</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">G-force</div>
              <div
                className={`val ${
                  s.gForce === null
                    ? ""
                    : s.gForce > 1.5
                      ? "bad"
                      : s.gForce > 1.3
                        ? "warn"
                        : ""
                }`}
              >
                {fmt(s.gForce, 2)}
                <span className="unit">G</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: "var(--gap)" }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">APPROACH GUIDANCE</span>
            {guidance ? (
              <StatusPill kind={guidance.stable ? "good" : "warn"}>
                {guidance.stable ? "STABLE" : "UNSTABLE"}
              </StatusPill>
            ) : (
              <StatusPill kind="warn">NO GUIDANCE</StatusPill>
            )}
          </div>
          <div className="card-body grid-4" style={{ gap: "var(--gap)" }}>
            <div className="metric sm">
              <div className="lbl">Selected runway</div>
              <div className="val">
                {guidance
                  ? `${guidance.airportIdent} ${guidance.runwayIdent}`
                  : selectedRunway
                    ? `${selectedRunway.airportIdent} ${selectedRunway.runwayIdent}`
                    : "—"}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Bearing to threshold</div>
              <div className="val">
                {guidance ? fmt(guidance.bearingToThresholdDeg, 1) : "—"}
                {guidance && <span className="unit">DEG</span>}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Runway heading</div>
              <div className="val">
                {guidance ? fmt(guidance.runwayHeadingDeg, 1) : "—"}
                {guidance && <span className="unit">DEG</span>}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Course error</div>
              <div
                className={`val ${
                  guidance && Math.abs(guidance.courseErrorDeg) > 10 ? "warn" : ""
                }`}
              >
                {guidance ? `${sign(guidance.courseErrorDeg)}${fmt(guidance.courseErrorDeg, 1)}` : "—"}
                {guidance && <span className="unit">DEG</span>}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Centreline</div>
              <div
                className={`val ${
                  guidance && Math.abs(guidance.lateralDeviationM) > 300
                    ? "warn"
                    : ""
                }`}
              >
                {guidance ? lateralLabel(guidance.lateralDeviationM) : "—"}
              </div>
              <div className="sub">Positive is right inbound</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Along-track</div>
              <div className="val">
                {guidance ? fmt(guidance.alongTrackDistanceNm, 1) : "—"}
                {guidance && <span className="unit">NM</span>}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Glide target</div>
              <div className="val">
                {guidance ? fmt(guidance.glidepathTargetAltitudeFt) : "—"}
                {guidance && <span className="unit">FT</span>}
              </div>
              <div className="sub">
                {guidance ? `${fmt(guidance.glidepathDeg, 1)} DEG path` : ""}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Glide deviation</div>
              <div
                className={`val ${
                  guidance && Math.abs(guidance.glidepathDeviationFt) > 300
                    ? "warn"
                    : ""
                }`}
              >
                {guidance ? glidepathLabel(guidance.glidepathDeviationFt) : "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">STABILITY GATES</span>
            {guidance ? (
              <StatusPill kind={guidance.stable ? "good" : "bad"}>
                {guidance.stable ? "STABLE" : "ISSUES"}
              </StatusPill>
            ) : (
              <StatusPill kind="warn">WAITING</StatusPill>
            )}
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            {guidance ? (
              guidance.issues.length > 0 ? (
                guidance.issues.map((issue) => (
                  <div key={issue} className="check active">
                    <div className="box"></div>
                    <div className="lbl">{issue}</div>
                  </div>
                ))
              ) : (
                <div className="check done">
                  <div className="box"></div>
                  <div className="lbl">No active guidance issues</div>
                </div>
              )
            ) : (
              <div className="todo-note">
                  Select a runway and wait for live telemetry to receive approach guidance.
                </div>
            )}
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: "var(--gap)" }}>
        <GateSummary label="1000 FT STABLE GATE" gate={gate1000} />
        <GateSummary label="500 FT STABLE GATE" gate={gate500} />
      </div>

      <div className="row" style={{ gap: "var(--gap)" }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">CONFIGURATION</span>
          </div>
          <div className="card-body grid-4" style={{ gap: "var(--gap)" }}>
            <div className="metric sm">
              <div className="lbl">Flaps</div>
              <div className="val">{s.flapsLabel ?? "—"}</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Gear</div>
              <div
                className={`val ${
                  s.gearDown === null ? "" : s.gearDown ? "good" : "warn"
                }`}
              >
                {s.gearDown === null ? "—" : s.gearDown ? "DOWN" : "UP"}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Ground speed</div>
              <div className="val">
                {fmt(s.groundSpeedKt)}
                <span className="unit">KT</span>
              </div>
            </div>
            {/* TODO: Spoilers — SPOILERS HANDLE POSITION simvar, show as pct or armed/deployed */}
            {/* TODO: Autobrake — AUTOBRAKES ACTIVE / AUTO BRAKE SWITCH CB simvar */}
            {/* TODO: N1 — ENG N1 RPM PCT for each engine, check for adequate go-around thrust */}
            {/* TODO: Wind — AMBIENT WIND VELOCITY + AMBIENT WIND DIRECTION simvars */}
            {/* TODO: Landing checklist items — requires adapter-level checklist verification support */}
          </div>
        </div>
      </div>
    </>
  );
}
