import type { LandingReport, TrajectoryRecord, UseSimResult } from "../sim/useSim";
import { fmt, padHdg } from "../sim/format";
import { StatusPill, TodoValue } from "./common";
import type { LandingStableApproachGate } from "../types/telemetry";

function ScoreBar({ k, v, weight }: { k: string; v: number; weight: number }) {
  const color =
    v >= 85 ? "var(--good)" : v >= 65 ? "var(--warn)" : "var(--bad)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--fg-2)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {k}{" "}
          <span style={{ color: "var(--fg-3)", fontSize: 9, marginLeft: 6 }}>
            {weight}%
          </span>
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{v}</span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--panel-3)",
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ height: "100%", width: `${v}%`, background: color }}></div>
      </div>
    </div>
  );
}

function landingLateralLabel(valueM: number | undefined): string {
  if (valueM == null) return "-";
  if (Math.abs(valueM) < 1) return "ON CENTRELINE";
  return `${fmt(Math.abs(valueM))} M ${valueM > 0 ? "RIGHT" : "LEFT"}`;
}

function landingGlidepathLabel(valueFt: number | undefined): string {
  if (valueFt == null) return "-";
  if (Math.abs(valueFt) < 1) return "ON PATH";
  return `${fmt(Math.abs(valueFt))} FT ${valueFt > 0 ? "HIGH" : "LOW"}`;
}

function LandingGateSummary({
  label,
  gate,
}: {
  label: string;
  gate: LandingStableApproachGate | undefined;
}) {
  return (
    <div className="card" style={{ flex: 1 }}>
      <div className="card-head">
        <span className="lbl">{label}</span>
        {gate?.captured ? (
          <StatusPill kind={gate.stable ? "good" : "bad"}>
            {gate.stable ? "STABLE" : "UNSTABLE"}
          </StatusPill>
        ) : (
          <StatusPill kind="warn">NOT CAPTURED</StatusPill>
        )}
      </div>
      <div className="card-body">
        {gate?.captured ? (
          <>
            <div className="grid-4" style={{ gap: 16 }}>
              <div className="metric sm">
                <div className="lbl">Distance</div>
                <div className="val">
                  {fmt(gate.distanceNm, 1)}
                  <span className="unit">NM</span>
                </div>
              </div>
              <div className="metric sm">
                <div className="lbl">Course</div>
                <div className="val">
                  {fmt(gate.courseErrorDeg, 1)}
                  <span className="unit">DEG</span>
                </div>
              </div>
              <div className="metric sm">
                <div className="lbl">Centreline</div>
                <div className="val">{landingLateralLabel(gate.lateralDeviationM)}</div>
              </div>
              <div className="metric sm">
                <div className="lbl">Glidepath</div>
                <div className="val">{landingGlidepathLabel(gate.glidepathDeviationFt)}</div>
              </div>
              <div className="metric sm">
                <div className="lbl">V/S</div>
                <div className="val">
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
          <div className="todo-note">Gate was not captured for this landing.</div>
        )}
      </div>
    </div>
  );
}

function TelemetryTrack({
  history,
  report,
}: {
  history: TrajectoryRecord[];
  report: LandingReport;
}) {
  const points = [
    ...history.map((h) => ({
      lat: h.latitudeDeg,
      lon: h.longitudeDeg,
      touchdown: false,
    })),
    {
      lat: report.touchdownLatitudeDeg,
      lon: report.touchdownLongitudeDeg,
      touchdown: true,
    },
  ].filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  if (points.length < 2) {
    return (
      <div className="todo-note">
        Waiting for enough live telemetry samples to draw the real aircraft track.
      </div>
    );
  }

  const W = 1200;
  const H = 280;
  const pad = 30;
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latSpan = Math.max(0.00001, maxLat - minLat);
  const lonSpan = Math.max(0.00001, maxLon - minLon);
  const x = (lon: number) => pad + ((lon - minLon) / lonSpan) * (W - pad * 2);
  const y = (lat: number) => H - pad - ((lat - minLat) / latSpan) * (H - pad * 2);
  const path =
    "M " +
    points
      .filter((p) => !p.touchdown)
      .map((p) => `${x(p.lon).toFixed(1)} ${y(p.lat).toFixed(1)}`)
      .join(" L ");
  const touchdown = points.find((p) => p.touchdown) ?? points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="runway-svg" style={{ height: H }}>
      <rect
        x={pad}
        y={pad}
        width={W - pad * 2}
        height={H - pad * 2}
        fill="var(--panel-2)"
        stroke="var(--border)"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points
        .filter((p) => !p.touchdown)
        .filter((_, i) => i % 12 === 0)
        .map((p, i) => (
          <circle
            key={i}
            cx={x(p.lon)}
            cy={y(p.lat)}
            r="1.8"
            fill="var(--accent)"
            opacity="0.7"
          />
        ))}
      <circle
        cx={x(touchdown.lon)}
        cy={y(touchdown.lat)}
        r="6"
        fill="none"
        stroke="var(--good)"
        strokeWidth="1.5"
      />
      <circle cx={x(touchdown.lon)} cy={y(touchdown.lat)} r="2.5" fill="var(--good)" />
      <text
        x={x(touchdown.lon) + 12}
        y={y(touchdown.lat) - 8}
        fontFamily="JetBrains Mono"
        fontSize="10"
        fill="var(--good)"
        letterSpacing="0.1em"
      >
        TOUCHDOWN
      </text>
      <text
        x={pad}
        y={H - 8}
        fontFamily="JetBrains Mono"
        fontSize="10"
        fill="var(--fg-3)"
      >
        Real latitude/longitude track from bridge telemetry
      </text>
    </svg>
  );
}

export function LandingAnalysis({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const r = s.report;

  if (!r) {
    return (
      <div
        className="card"
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "var(--fg-3)",
            maxWidth: 420,
          }}
        >
          <div
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            NO LANDING ANALYSIS FROM BACKEND
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            The bridge will emit a landing.analysis message when SimConnect
            reports a transition from airborne to on-ground. This screen no
            longer fabricates a debrief.
          </div>
        </div>
      </div>
    );
  }

  const verdict =
    r.score >= 85
      ? { color: "var(--good)", text: "GOOD TOUCHDOWN" }
      : r.score >= 70
        ? { color: "var(--warn)", text: "REVIEW TOUCHDOWN" }
        : { color: "var(--bad)", text: "HARD LANDING REVIEW" };

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">DEBRIEF</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              BACKEND LANDING.ANALYSIS
            </span>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 32,
              alignItems: "center",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 96,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: verdict.color,
                }}
              >
                {r.letter}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--fg)",
                  marginTop: 4,
                }}
              >
                {r.score}
                <span style={{ color: "var(--fg-3)", fontSize: 14 }}> / 100</span>
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 9,
                  color: verdict.color,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  marginTop: 8,
                }}
              >
                {verdict.text}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {r.breakdown.map((b, i) => (
                <ScoreBar key={i} {...b} />
              ))}
              <div className="todo-note">
                Score is backend-calculated from touchdown quality and stable
                approach gates when available. TODO: expand backend scoring with
                touchdown zone, centerline, heading alignment, flare, and bounce.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">AIRCRAFT TRACK</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              {s.trajectoryHistory.length} live samples
            </span>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            <TelemetryTrack history={s.trajectoryHistory} report={r} />
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <LandingGateSummary
          label="1000 FT STABLE GATE"
          gate={r.stableApproach?.gate1000}
        />
        <LandingGateSummary
          label="500 FT STABLE GATE"
          gate={r.stableApproach?.gate500}
        />
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">TOUCHDOWN</span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Vertical rate</div>
              <div
                className={`val ${
                  r.touchdownVerticalSpeedFpm < -300
                    ? "bad"
                    : r.touchdownVerticalSpeedFpm < -200
                      ? "warn"
                      : "good"
                }`}
              >
                {fmt(r.touchdownVerticalSpeedFpm)}
                <span className="unit">FPM</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Speed</div>
              <div className="val">
                {fmt(r.touchdownAirspeedKt)}
                <span className="unit">KIAS</span>
              </div>
              <div className="sub">TODO: compare to VRef</div>
            </div>
            <div className="metric">
              <div className="lbl">G-load</div>
              <div
                className={`val ${
                  r.touchdownGForce === null
                    ? ""
                    : r.touchdownGForce > 1.5
                      ? "bad"
                      : r.touchdownGForce > 1.3
                        ? "warn"
                        : "good"
                }`}
              >
                {fmt(r.touchdownGForce, 2)}
                <span className="unit">G</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val">
                {padHdg(r.touchdownHeadingDeg)}
                <span className="unit">DEG</span>
              </div>
              <div className="sub">TODO: compare to runway course</div>
            </div>
            <div className="metric">
              <div className="lbl">Pitch</div>
              <div className="val">
                {fmt(r.touchdownPitchDeg, 1)}
                <span className="unit">DEG</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Bank</div>
              <div className="val">
                {fmt(r.touchdownBankDeg, 1)}
                <span className="unit">DEG</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Latitude</div>
              <div className="val" style={{ fontSize: 18 }}>
                {r.touchdownLatitudeDeg.toFixed(5)}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Longitude</div>
              <div className="val" style={{ fontSize: 18 }}>
                {r.touchdownLongitudeDeg.toFixed(5)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">NOT IMPLEMENTED END TO END</span>
            <StatusPill kind="warn">TODO</StatusPill>
          </div>
          <div
            className="card-body"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 12.5,
              lineHeight: 1.6,
              color: "var(--fg-2)",
            }}
          >
            <div>
              <TodoValue /> touchdown distance from threshold is not calculated
              in landing analysis yet.
            </div>
            <div>
              <TodoValue /> touchdown centerline deviation is not calculated in
              landing analysis yet.
            </div>
            <div>
              <TodoValue /> flare quality and bounce detection require a short
              touchdown-window telemetry buffer in the backend.
            </div>
            <div>
              <TodoValue /> speed score needs aircraft VRef/VApp data from either
              SimConnect or a backend aircraft profile.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
