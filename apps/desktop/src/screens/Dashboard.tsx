import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg, sign } from "../sim/format";
import { StatusPill } from "./common";

function bridgeKind(status: string): "good" | "warn" | "bad" {
  if (status === "connected") return "good";
  if (status === "error") return "bad";
  return "warn";
}

function ageLabel(date: Date | null): string | null {
  if (!date) return null;
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  return seconds < 2 ? "now" : `${seconds}s ago`;
}

export function Dashboard({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const selectedRunway = s.navdata.selectedRunway;
  const phaseClass =
    s.phase === "preflight" ? "" : s.phase === "landed" ? "good" : "live";
  const lastMessageAge = ageLabel(s.lastMessageAt);

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">FLIGHT STATUS</span>
            <span className={`badge ${phaseClass}`}>{s.phase.toUpperCase()}</span>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <div className="metric">
                <div className="lbl">Aircraft</div>
                <div className="val mono" style={{ fontSize: 18 }}>
                  {s.aircraft.name ?? "—"}
                </div>
                <div className="sub">
                  {s.aircraft.operator ?? "Waiting for aircraft identity"}
                </div>
              </div>
              <div className="metric">
                <div className="lbl">Approach Runway</div>
                <div className="val mono" style={{ fontSize: 18 }}>
                  {s.runway.airport && s.runway.runway
                    ? `${s.runway.airport}/${s.runway.runway}`
                    : "—"}
                </div>
                <div className="sub">
                  {selectedRunway ? "Selected via navdata" : "Select in Airport Setup"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">BRIDGE</span>
            <StatusPill kind={bridgeKind(s.bridgeStatus)}>
              {s.bridgeStatus}
            </StatusPill>
          </div>
          <div className="card-body">
            <div className="kv">
              <div className="k">WebSocket</div>
              <div className={s.connected ? "v good" : "v warn"}>{s.bridgeUrl}</div>
              <div className="k">Telemetry</div>
              <div className={s.hasTelemetry ? "v good" : "v warn"}>
                {s.hasTelemetry ? "LIVE" : "WAITING"}
              </div>
              <div className="k">Last message</div>
              <div className="v">{lastMessageAge ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">LIVE TELEMETRY</span>
            <span className={`badge ${s.hasTelemetry ? "live" : ""}`}>
              {s.hasTelemetry ? "LIVE" : "NO DATA"}
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
                <span className="unit">DEG</span>
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
                {s.gearDown === null ? "—" : s.gearDown ? "DOWN" : "UP"}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Flaps</div>
              <div className="val" style={{ fontSize: 18 }}>
                {s.flapsLabel ?? "—"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">ACTIVE RUNWAY</span>
            <StatusPill kind={selectedRunway ? "good" : "warn"}>
              {selectedRunway ? "SELECTED" : "NONE"}
            </StatusPill>
          </div>
          <div className="card-body">
            {!selectedRunway && (
              <div className="todo-note" style={{ marginBottom: 14 }}>
                Use Airport Setup to search and select a runway.
              </div>
            )}
            <div className="grid-4" style={{ gap: 22 }}>
              <div className="metric">
                <div className="lbl">Runway</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {selectedRunway
                    ? `${selectedRunway.airportIdent}/${selectedRunway.runwayIdent}`
                    : "—"}
                </div>
              </div>
              <div className="metric">
                <div className="lbl">Course</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {selectedRunway ? `${padHdg(selectedRunway.headingDegT)} DEG` : "—"}
                </div>
              </div>
              <div className="metric">
                <div className="lbl">Length</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {selectedRunway ? `${fmt(selectedRunway.lengthFt)} FT` : "—"}
                </div>
              </div>
              <div className="metric">
                <div className="lbl">Width</div>
                <div className="val mono" style={{ fontSize: 16 }}>
                  {selectedRunway ? `${fmt(selectedRunway.widthFt)} FT` : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card flex-1">
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
                    <div className="v">{s.report.score}/100</div>
                    <div className="k">Rate</div>
                    <div className="v">
                      {fmt(s.report.touchdownVerticalSpeedFpm)} fpm
                    </div>
                    <div className="k">G</div>
                    <div className="v">
                      {s.report.touchdownGForce === null
                        ? "—"
                        : s.report.touchdownGForce.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ color: "var(--fg-3)", fontSize: 12, fontStyle: "italic" }}
              >
                No landings recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
