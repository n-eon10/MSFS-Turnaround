import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg, sign } from "../sim/format";
import { StatusPill } from "./common";

export function Dashboard({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const phaseClass =
    s.phase === "preflight" ? "" : s.phase === "landed" ? "good" : "live";

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">FLIGHT STATUS</span>
            <span className={`badge ${phaseClass}`}>{s.phase.toUpperCase()}</span>
          </div>
          <div className="card-body">
            <div className="grid-3">
              <div className="metric">
                <div className="lbl">Aircraft</div>
                <div className="val mono" style={{ fontSize: 18 }}>
                  {s.aircraft.code}
                </div>
                <div className="sub">{s.aircraft.operator}</div>
              </div>
              <div className="metric">
                <div className="lbl">Departure</div>
                <div className="val mono" style={{ fontSize: 18 }}>
                  —
                </div>
                <div className="sub">No flight plan loaded</div>
              </div>
              <div className="metric">
                <div className="lbl">Destination</div>
                <div className="val mono" style={{ fontSize: 18 }}>
                  {s.runway.airport}/{s.runway.runway}
                </div>
                <div className="sub">{s.runway.airportName}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ width: 320 }}>
          <div className="card-head">
            <span className="lbl">BRIDGE</span>
            <StatusPill kind="good">SIMCONNECT</StatusPill>
          </div>
          <div className="card-body">
            <div className="kv">
              <div className="k">SimConnect</div>
              <div className="v good">CONNECTED</div>
              <div className="k">WebSocket</div>
              <div className="v good">ws://127.0.0.1:8421</div>
              <div className="k">Bridge PID</div>
              <div className="v">14288</div>
              <div className="k">Latency</div>
              <div className="v">12 ms</div>
              <div className="k">Sim rate</div>
              <div className="v">{s.simRate}</div>
              <div className="k">Pause</div>
              <div className="v">{sim.actions.paused ? "YES" : "NO"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">LIVE TELEMETRY</span>
            <span className="badge live">
              <span className="live-dot">●</span> 20 Hz
            </span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Airspeed</div>
              <div className="val">
                {fmt(s.ias)}
                <span className="unit">KIAS</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Altitude MSL</div>
              <div className="val">
                {fmt(s.altMSL)}
                <span className="unit">FT</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val">
                {padHdg(s.heading)}
                <span className="unit">°M</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Vertical speed</div>
              <div className="val">
                {sign(s.vs)}
                {fmt(s.vs)}
                <span className="unit">FPM</span>
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Ground speed</div>
              <div className="val">
                {fmt(s.groundSpeedKt)}
                <span className="unit">KT</span>
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Radio Alt</div>
              <div className="val">
                {fmt(s.altAGL)}
                <span className="unit">FT AGL</span>
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Gear</div>
              <div
                className={`val ${s.gearDown ? "good" : ""}`}
                style={{ fontSize: 18 }}
              >
                {s.gearDown ? "DOWN" : "UP"}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Flaps</div>
              <div className="val" style={{ fontSize: 18 }}>
                {s.flapsLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">ACTIVE APPROACH</span>
            {s.phase === "preflight" ? (
              <span className="badge">NOT ARMED</span>
            ) : (
              <StatusPill kind="good">ARMED</StatusPill>
            )}
          </div>
          <div className="card-body">
            <div className="grid-4" style={{ gap: 22 }}>
              <div className="metric">
                <div className="lbl">Approach</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {s.approach.full}
                </div>
              </div>
              <div className="metric">
                <div className="lbl">Course</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {padHdg(s.approach.course)}°
                </div>
              </div>
              <div className="metric">
                <div className="lbl">{s.approach.minimumsKind}</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {s.approach.minimumsFt} FT
                </div>
              </div>
              <div className="metric">
                <div className="lbl">VApp</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {s.aircraft.vApp} KT
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ width: 320 }}>
          <div className="card-head">
            <span className="lbl">LAST LANDING</span>
          </div>
          <div className="card-body">
            {s.report ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 56,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--good)",
                  }}
                >
                  {s.report.letter}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="kv">
                    <div className="k">Score</div>
                    <div className="v">{s.report.overall}/100</div>
                    <div className="k">Rate</div>
                    <div className="v">{s.report.vsTouchdown} fpm</div>
                    <div className="k">G</div>
                    <div className="v">{s.report.gForce.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ color: "var(--fg-3)", fontSize: 12, fontStyle: "italic" }}
              >
                No landing recorded this session.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
