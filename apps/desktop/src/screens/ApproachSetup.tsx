import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg } from "../sim/format";
import { StatusPill, TodoValue } from "./common";

export function ApproachSetup({ sim }: { sim: UseSimResult }) {
  const s = sim.state;

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">SETUP STATUS</span>
            <StatusPill kind="warn">TODO</StatusPill>
          </div>
          <div className="card-body">
            <div className="todo-note">
              TODO: approach setup is not implemented end to end. The frontend no
              longer carries hardcoded KSFO/runway/procedure data; the bridge needs
              to publish flight plan, selected runway, approach procedure, minimums,
              and aircraft performance data before this panel can arm a real
              approach.
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">AIRPORT / RUNWAY</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              BACKEND DATA REQUIRED
            </span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Airport</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                <TodoValue />
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Runway</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                <TodoValue />
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Course</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                <TodoValue />
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Threshold elev</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                <TodoValue />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">APPROACH TYPE</span>
          </div>
          <div className="card-body">
            <div className="todo-note" style={{ marginBottom: 14 }}>
              TODO: replace this with backend-driven procedure choices.
            </div>
            <div className="grid-3">
              {["ILS", "RNAV", "VISUAL"].map((label) => (
                <div key={label} className="tile" style={{ cursor: "default" }}>
                  <div className="code">{label}</div>
                  <div className="meta">TODO</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">LIVE AIRCRAFT CONTEXT</span>
            <span className={`badge ${s.hasTelemetry ? "live" : ""}`}>
              {s.hasTelemetry ? "FROM BRIDGE" : "WAITING"}
            </span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Latitude</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {s.lat === null ? "-" : s.lat.toFixed(5)}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Longitude</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {s.lon === null ? "-" : s.lon.toFixed(5)}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Altitude</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {fmt(s.altMSL)} FT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {padHdg(s.heading)} DEG
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">FINAL CHECKLIST</span>
            <StatusPill kind="warn">TODO</StatusPill>
          </div>
          <div className="card-body">
            <div className="todo-note">
              TODO: checklist state, spoiler arming, autobrake mode, cabin state,
              and approach arming are not backed by SimConnect messages yet.
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{ width: 280, display: "flex", flexDirection: "column" }}
        >
          <div className="card-head">
            <span className="lbl">ARM</span>
          </div>
          <div
            className="card-body"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              justifyContent: "space-between",
            }}
          >
            <div className="todo-note">
              TODO: arming requires a backend approach-tracking state machine.
            </div>
            <button className="btn primary" disabled>
              ARM APPROACH
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
