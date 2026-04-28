import { useState } from "react";
import {
  APPROACH_PRESETS,
  type ApproachKey,
  type UseSimResult,
} from "../sim/useSim";
import { padHdg } from "../sim/format";
import { StatusPill } from "./common";

const RUNWAYS = [
  { code: "28R", len: 11870, ils: true, rnav: true, course: 281 },
  { code: "28L", len: 11381, ils: true, rnav: true, course: 281 },
  { code: "10L", len: 11870, ils: false, rnav: true, course: 101 },
  { code: "10R", len: 11381, ils: false, rnav: true, course: 101 },
  { code: "01L", len: 7650, ils: false, rnav: true, course: 11 },
  { code: "01R", len: 8650, ils: true, rnav: true, course: 11 },
  { code: "19L", len: 8650, ils: false, rnav: true, course: 191 },
  { code: "19R", len: 7650, ils: false, rnav: true, course: 191 },
];

const SETUP_CHECKS: Array<{
  id: string;
  label: string;
  value: string;
  done: boolean;
  active?: boolean;
}> = [
  { id: "altim", label: "Altimeter set", value: "29.92 / 1013", done: true },
  { id: "brief", label: "Approach briefing", value: "COMPLETE", done: true },
  { id: "auto", label: "Autobrake", value: "MED", done: true },
  { id: "spoil", label: "Spoilers", value: "ARMED", done: false, active: true },
  { id: "flap", label: "Flaps configuration", value: "CONF FULL @ FAF", done: false },
  { id: "gear", label: "Landing gear", value: "DOWN @ G/S CAPTURE", done: false },
  { id: "cabin", label: "Cabin secure", value: "—", done: false },
];

export function ApproachSetup({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const [airport, setAirport] = useState("KSFO");
  const [runway, setRunway] = useState("28R");
  const rw = RUNWAYS.find((r) => r.code === runway);

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">AIRPORT</span>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", gap: 18, alignItems: "center" }}
          >
            <input
              className="mono"
              value={airport}
              onChange={(e) =>
                setAirport(e.target.value.toUpperCase().slice(0, 4))
              }
              style={{
                width: 120,
                fontSize: 28,
                fontWeight: 700,
                padding: "8px 12px",
                background: "var(--panel-2)",
                border: "1px solid var(--border-2)",
                color: "var(--fg)",
                borderRadius: 6,
                outline: "none",
                letterSpacing: "0.06em",
              }}
            />
            <div style={{ flex: 1 }}>
              <div className="metric">
                <div className="lbl">Name</div>
                <div className="val mono" style={{ fontSize: 14 }}>
                  San Francisco Intl
                </div>
              </div>
            </div>
            <div className="kv">
              <div className="k">Elev</div>
              <div className="v">13 ft</div>
              <div className="k">Var</div>
              <div className="v">14°E</div>
              <div className="k">METAR</div>
              <div className="v">28010KT 10SM CLR 18/12</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1.2 }}>
          <div className="card-head">
            <span className="lbl">RUNWAY</span>
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--fg-3)" }}
            >
              8 RUNWAYS · 4 ILS-CAPABLE
            </span>
          </div>
          <div className="card-body">
            <div className="tile-grid">
              {RUNWAYS.map((r) => (
                <div
                  key={r.code}
                  className={`tile ${runway === r.code ? "sel" : ""}`}
                  onClick={() => setRunway(r.code)}
                >
                  <div className="code">RWY {r.code}</div>
                  <div className="meta">
                    {r.len} FT · {r.ils ? "ILS · RNAV" : "RNAV"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">APPROACH TYPE</span>
          </div>
          <div
            className="card-body"
            style={{ gap: 10, display: "flex", flexDirection: "column" }}
          >
            {(Object.entries(APPROACH_PRESETS) as Array<
              [ApproachKey, (typeof APPROACH_PRESETS)[ApproachKey]]
            >).map(([k, v]) => {
              const supported =
                k === "ILS" ? !!rw?.ils : k === "RNAV" ? !!rw?.rnav : true;
              const sel = s.approach.name === v.name;
              return (
                <div
                  key={k}
                  onClick={() => supported && sim.actions.setApproach(k)}
                  style={{
                    padding: "12px 14px",
                    border:
                      "1px solid " +
                      (sel ? "var(--accent)" : "var(--border)"),
                    background: sel ? "var(--accent-bg)" : "var(--panel-2)",
                    borderRadius: 6,
                    cursor: supported ? "pointer" : "not-allowed",
                    opacity: supported ? 1 : 0.4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: sel ? "var(--accent)" : "var(--fg)",
                      }}
                    >
                      {v.name}
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10.5,
                        color: "var(--fg-3)",
                        marginTop: 3,
                      }}
                    >
                      {v.full}
                    </div>
                  </div>
                  {!supported && <span className="pill">UNAVAILABLE</span>}
                  {sel && <StatusPill kind="good">SELECTED</StatusPill>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">PROCEDURE DATA</span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Course</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {padHdg(s.approach.course)}°
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Frequency</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {s.approach.freq}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">{s.approach.minimumsKind || "MIN"}</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {s.approach.minimumsFt} FT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">G/S Angle</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {s.approach.glideslopeDeg.toFixed(1)}°
              </div>
            </div>
            <div className="metric">
              <div className="lbl">RWY length</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {rw?.len} FT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Threshold elev</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                13 FT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">VRef</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {s.aircraft.vRef} KT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">VApp</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {s.aircraft.vApp} KT
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">FINAL CHECKLIST · {s.aircraft.code}</span>
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--fg-3)" }}
            >
              3 / 7 COMPLETE
            </span>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            {SETUP_CHECKS.map((c) => (
              <div
                key={c.id}
                className={`check ${c.done ? "done" : c.active ? "active" : "pending"}`}
              >
                <div className="box"></div>
                <div className="lbl">{c.label}</div>
                <div className="v">{c.value}</div>
              </div>
            ))}
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
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--fg-3)",
                  lineHeight: 1.6,
                }}
              >
                Once armed, the panel will switch to Live Approach Monitor
                automatically when the aircraft passes the FAF.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                className="btn primary"
                onClick={() => sim.actions.jumpTo("approach")}
              >
                ARM APPROACH
              </button>
              <button
                className="btn ghost"
                onClick={() => sim.actions.jumpTo("preflight")}
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
