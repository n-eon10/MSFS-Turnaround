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

function runwayRelative(
  lat: number,
  lon: number,
  refLat: number,
  refLon: number,
  hdgDeg: number
): [number, number] {
  const dLat = (lat - refLat) * 111319;
  const dLon = (lon - refLon) * 111319 * Math.cos((refLat * Math.PI) / 180);
  const H = (hdgDeg * Math.PI) / 180;
  const along = -(dLon * Math.sin(H) + dLat * Math.cos(H));
  const lateral = dLon * Math.cos(H) - dLat * Math.sin(H);
  return [along, lateral];
}

function altColor(altAgl: number | null, maxAlt: number): string {
  if (altAgl === null || maxAlt <= 0) return "var(--accent)";
  const t = Math.max(0, Math.min(1, altAgl / maxAlt));
  return `hsl(${Math.round(20 + t * 200)}, 75%, 62%)`;
}

function TelemetryTrack({
  history,
  report,
}: {
  history: TrajectoryRecord[];
  report: LandingReport;
}) {
  const refLat = report.touchdownLatitudeDeg;
  const refLon = report.touchdownLongitudeDeg;
  const hdg = report.touchdownHeadingDeg;

  type Pt = { along: number; lateral: number; altAGL: number | null };

  const pts: Pt[] = history
    .map((h) => {
      const [along, lateral] = runwayRelative(
        h.latitudeDeg,
        h.longitudeDeg,
        refLat,
        refLon,
        hdg
      );
      return { along, lateral, altAGL: h.altAGL };
    })
    .filter((p) => isFinite(p.along) && isFinite(p.lateral));

  if (pts.length < 2) {
    return (
      <div className="todo-note">
        Waiting for enough live telemetry samples to draw the approach track.
      </div>
    );
  }

  const maxAlt = Math.max(...pts.map((p) => p.altAGL ?? 0), 0);

  function findAltCrossing(targetFt: number): Pt | null {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i],
        b = pts[i + 1];
      if (a.altAGL === null || b.altAGL === null) continue;
      if (a.altAGL >= targetFt && b.altAGL < targetFt) {
        const t = (targetFt - a.altAGL) / (b.altAGL - a.altAGL);
        return {
          along: a.along + t * (b.along - a.along),
          lateral: a.lateral + t * (b.lateral - a.lateral),
          altAGL: targetFt,
        };
      }
    }
    return null;
  }

  const gate1000pt = findAltCrossing(1000);
  const gate500pt = findAltCrossing(500);

  const alongs = pts.map((p) => p.along);
  const laterals = pts.map((p) => p.lateral);
  const maxAlong = Math.max(...alongs, 500);
  const minAlong = Math.min(...alongs, 0);
  const lateralExtent = Math.max(Math.max(...laterals.map(Math.abs)), 150);
  const alongRange = Math.max(maxAlong - minAlong, 1);

  const W = 1200;
  const H = 360;
  const padLeft = 80;
  const padRight = 40;
  const padTop = 30;
  const padBottom = 70;
  const usableW = W - padLeft - padRight;
  const usableH = H - padTop - padBottom;

  const svgX = (lat: number) =>
    padLeft + ((lat + lateralExtent) / (2 * lateralExtent)) * usableW;
  const svgY = (along: number) =>
    padTop + usableH - ((along - minAlong) / alongRange) * usableH;

  const cx = svgX(0);
  const tdY = svgY(0);

  // Down-sample to at most 400 segments for performance
  const step = Math.max(1, Math.floor(pts.length / 400));
  const sampled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1);

  const segs = sampled.slice(0, -1).map((p, i) => ({
    x1: svgX(p.lateral),
    y1: svgY(p.along),
    x2: svgX(sampled[i + 1].lateral),
    y2: svgY(sampled[i + 1].along),
    color: altColor(p.altAGL, maxAlt),
  }));

  const nmInMeters = 1852;
  const scaleMarkers: number[] = [];
  for (let d = nmInMeters; d <= maxAlong; d += nmInMeters) {
    scaleMarkers.push(d);
  }

  function GateMarker({ pt, label, dashed }: { pt: Pt; label: string; dashed?: boolean }) {
    const gx = svgX(pt.lateral);
    const gy = svgY(pt.along);
    const anchorRight = gx < W / 2;
    return (
      <g>
        <circle
          cx={gx}
          cy={gy}
          r="5"
          fill="none"
          stroke="var(--warn)"
          strokeWidth="1.5"
          strokeDasharray={dashed ? "3 2" : undefined}
        />
        <text
          x={anchorRight ? gx + 9 : gx - 9}
          y={gy + 4}
          fontFamily="JetBrains Mono"
          fontSize="9"
          fill="var(--warn)"
          textAnchor={anchorRight ? "start" : "end"}
        >
          {label}
        </text>
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="runway-svg" style={{ height: H }}>
      <defs>
        <linearGradient id="altGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="hsl(20, 75%, 62%)" />
          <stop offset="100%" stopColor="hsl(220, 75%, 62%)" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect
        x={padLeft}
        y={padTop}
        width={usableW}
        height={usableH}
        fill="var(--panel-2)"
        stroke="var(--border)"
      />

      {/* Centerline extension */}
      <line
        x1={cx}
        y1={padTop}
        x2={cx}
        y2={tdY}
        stroke="var(--fg-3)"
        strokeWidth="1"
        strokeDasharray="10 7"
        opacity="0.4"
      />

      {/* NM distance tick marks */}
      {scaleMarkers.map((d, i) => {
        const y = svgY(d);
        return (
          <g key={i}>
            <line
              x1={cx - 10}
              y1={y}
              x2={cx + 10}
              y2={y}
              stroke="var(--fg-3)"
              strokeWidth="1"
              opacity="0.35"
            />
            <text
              x={padLeft - 6}
              y={y + 4}
              fontFamily="JetBrains Mono"
              fontSize="9"
              fill="var(--fg-3)"
              textAnchor="end"
            >
              {Math.round(d / nmInMeters)} NM
            </text>
          </g>
        );
      })}

      {/* Altitude-colored approach track */}
      {segs.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}

      {/* Gate markers */}
      {gate1000pt && <GateMarker pt={gate1000pt} label="1000 FT" />}
      {gate500pt && <GateMarker pt={gate500pt} label="500 FT" dashed />}

      {/* Touchdown marker */}
      <circle cx={cx} cy={tdY} r="7" fill="none" stroke="var(--good)" strokeWidth="1.5" />
      <circle cx={cx} cy={tdY} r="2.5" fill="var(--good)" />
      <text
        x={cx + 12}
        y={tdY - 9}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--good)"
        letterSpacing="0.08em"
      >
        TOUCHDOWN
      </text>

      {/* Runway symbol */}
      <rect
        x={cx - 22}
        y={tdY + 8}
        width={44}
        height={padBottom - 22}
        fill="var(--panel-3)"
        stroke="var(--fg-3)"
        strokeWidth="1"
        rx="2"
      />

      {/* Left / Right labels */}
      <text
        x={padLeft + 6}
        y={padTop + 14}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        opacity="0.55"
      >
        LEFT
      </text>
      <text
        x={W - padRight - 6}
        y={padTop + 14}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        textAnchor="end"
        opacity="0.55"
      >
        RIGHT
      </text>

      {/* Altitude color legend */}
      {maxAlt > 0 && (
        <>
          <text
            x={padLeft}
            y={H - 22}
            fontFamily="JetBrains Mono"
            fontSize="8"
            fill="var(--fg-3)"
          >
            LOW ALT
          </text>
          <rect x={padLeft + 54} y={H - 31} width={100} height={6} fill="url(#altGrad)" rx="2" />
          <text
            x={padLeft + 160}
            y={H - 22}
            fontFamily="JetBrains Mono"
            fontSize="8"
            fill="var(--fg-3)"
          >
            HIGH ALT
          </text>
        </>
      )}

      {/* Info label */}
      <text
        x={W - padRight}
        y={H - 8}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        textAnchor="end"
      >
        runway-aligned · {pts.length} samples · hdg {Math.round(hdg)}°
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
            <span className="lbl">APPROACH TRACK</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              {s.trajectoryHistory.length} samples · runway-aligned plan view
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
