import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg, sign } from "../sim/format";
import { StatusPill, TodoValue } from "./common";

function valueClass(value: number | null, warnAt: number, badAt: number): string {
  if (value === null) return "";
  const abs = Math.abs(value);
  if (abs >= badAt) return "bad";
  if (abs >= warnAt) return "warn";
  return "";
}

function todoMetric(label: string, note: string) {
  return (
    <div className="metric sm">
      <div className="lbl">{label}</div>
      <div className="val">
        <TodoValue />
      </div>
      <div className="sub">{note}</div>
    </div>
  );
}

export function LiveMonitor({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const telemetryKind = s.hasTelemetry ? "good" : "warn";
  const vsClass =
    s.vs === null ? "" : s.vs < -1100 ? "bad" : s.vs < -900 ? "warn" : "";

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
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
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 28,
            }}
          >
            <div className="metric lg">
              <div className="lbl">IAS</div>
              <div className="val">
                {fmt(s.ias)}
                <span className="unit">KT</span>
              </div>
              <div className="sub">TODO: VApp target from aircraft data</div>
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
              <div className="sub">Real SimConnect vertical speed</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ width: 260 }}>
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
                {s.lat === null ? "-" : s.lat.toFixed(5)}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Longitude</div>
              <div className="val mono">
                {s.lon === null ? "-" : s.lon.toFixed(5)}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Runway distance</div>
              <div className="val">
                <TodoValue />
              </div>
              <div className="sub">TODO: runway/navdata required</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">ATTITUDE / LOAD</span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val">
                {padHdg(s.heading)}
                <span className="unit">DEG</span>
              </div>
              <div className="sub">TODO: runway course target</div>
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

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">APPROACH DEVIATIONS</span>
            <StatusPill kind="warn">TODO</StatusPill>
          </div>
          <div className="card-body grid-3" style={{ gap: 22 }}>
            {todoMetric("Localizer", "TODO: NAV CDI/localizer SimConnect data")}
            {todoMetric("Glideslope", "TODO: NAV GSI/glideslope SimConnect data")}
            {todoMetric("Heading target", "TODO: active runway/procedure course")}
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">STABILITY GATES</span>
            <StatusPill kind="warn">PARTIAL</StatusPill>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: 10 }}
          >
            <div className="todo-note">
              Live vertical speed, gear, flaps, altitude, attitude, and G-force
              are connected. TODO: stable-approach scoring needs VApp,
              runway-relative distance, localizer/glideslope deviation, and
              configured landing flap target from backend data.
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">CONFIGURATION</span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric sm">
              <div className="lbl">Flaps</div>
              <div className="val">{s.flapsLabel ?? <TodoValue />}</div>
              <div className="sub">SimConnect handle index</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Gear</div>
              <div
                className={`val ${
                  s.gearDown === null ? "" : s.gearDown ? "good" : "warn"
                }`}
              >
                {s.gearDown === null ? <TodoValue /> : s.gearDown ? "DOWN" : "UP"}
              </div>
              <div className="sub">SimConnect gear handle</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Ground speed</div>
              <div className="val">
                {fmt(s.groundSpeedKt)}
                <span className="unit">KT</span>
              </div>
            </div>
            {todoMetric("Spoilers", "TODO: publish spoiler armed/deployed state")}
            {todoMetric("Autobrake", "TODO: publish autobrake state")}
            {todoMetric("N1", "TODO: publish engine telemetry")}
            {todoMetric("Wind", "TODO: publish ambient wind")}
            {todoMetric("Checklist", "TODO: backend checklist model")}
          </div>
        </div>
      </div>
    </>
  );
}
