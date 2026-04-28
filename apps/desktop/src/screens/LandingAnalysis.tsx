import type {
  LandingReport,
  TrajectoryRecord,
  UseSimResult,
} from "../sim/useSim";

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
          <span
            style={{ color: "var(--fg-3)", fontSize: 9, marginLeft: 6 }}
          >
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
        <div
          style={{ height: "100%", width: `${v}%`, background: color }}
        ></div>
      </div>
    </div>
  );
}

function TrajectoryReplay({
  history,
  report,
  runway,
  aircraftColor,
}: {
  history: TrajectoryRecord[];
  report: LandingReport;
  runway: { runway: string; lengthFt: number };
  aircraftColor: string;
}) {
  const W = 1200;
  const H = 280;
  const padL = 60,
    padR = 30,
    padT = 30,
    padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xMin = -12,
    xMax = 0.5;
  const xToPx = (nmFromThr: number) =>
    padL + ((nmFromThr - xMin) / (xMax - xMin)) * innerW;
  const yMin = -300,
    yMax = 300;
  const yToPx = (ft: number) =>
    padT + ((yMax - ft) / (yMax - yMin)) * innerH;

  const points = history.map((h) => ({
    x: xToPx(-h.distNm),
    y: yToPx(h.locDev * 75),
  }));
  const path = points.length
    ? "M " +
      points.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")
    : "";

  const td = points[points.length - 1];

  const rwyLeft = xToPx(-0.05);
  const rwyRight = xToPx(0.45);
  const rwyTop = yToPx(60);
  const rwyBottom = yToPx(-60);

  const distTicks = [-12, -10, -8, -6, -4, -2, -1, 0];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="runway-svg"
      style={{ height: H }}
    >
      <defs>
        <pattern
          id="dotgrid"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="0" cy="0" r="0.6" fill="var(--grid)" />
        </pattern>
      </defs>
      <rect
        x={padL}
        y={padT}
        width={innerW}
        height={innerH}
        fill="url(#dotgrid)"
      />

      <line
        x1={padL}
        y1={yToPx(0)}
        x2={W - padR}
        y2={yToPx(0)}
        stroke="var(--border-2)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      <line
        x1={padL}
        y1={yToPx(150)}
        x2={W - padR}
        y2={yToPx(150)}
        stroke="var(--border)"
        strokeWidth="0.5"
      />
      <line
        x1={padL}
        y1={yToPx(-150)}
        x2={W - padR}
        y2={yToPx(-150)}
        stroke="var(--border)"
        strokeWidth="0.5"
      />

      {distTicks.map((d) => (
        <g key={d}>
          <line
            x1={xToPx(d)}
            y1={padT + innerH}
            x2={xToPx(d)}
            y2={padT + innerH + 4}
            stroke="var(--fg-3)"
            strokeWidth="0.6"
          />
          <text
            x={xToPx(d)}
            y={padT + innerH + 18}
            fontFamily="JetBrains Mono"
            fontSize="10"
            fill="var(--fg-3)"
            textAnchor="middle"
          >
            {d === 0 ? "THR" : `${Math.abs(d)}`}
          </text>
        </g>
      ))}
      <text
        x={xToPx(-6)}
        y={padT + innerH + 32}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        textAnchor="middle"
        letterSpacing="0.1em"
      >
        DISTANCE TO THRESHOLD (NM)
      </text>

      <path
        d={`M ${xToPx(0)} ${yToPx(0)} L ${xToPx(-12)} ${yToPx(380)} L ${xToPx(-12)} ${yToPx(-380)} Z`}
        fill="var(--accent-bg)"
        opacity="0.25"
      />

      <rect
        x={rwyLeft}
        y={rwyTop}
        width={rwyRight - rwyLeft}
        height={rwyBottom - rwyTop}
        fill="var(--panel-3)"
        stroke="var(--fg-3)"
        strokeWidth="0.8"
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={i}
          x={rwyLeft + 4 + i * 8}
          y={rwyTop + 6}
          width={4}
          height={rwyBottom - rwyTop - 12}
          fill="var(--fg-2)"
        />
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x={rwyLeft + 60 + i * ((rwyRight - rwyLeft - 60) / 12)}
          y={(rwyTop + rwyBottom) / 2 - 1}
          width={((rwyRight - rwyLeft - 60) / 12) * 0.5}
          height={2}
          fill="var(--fg-3)"
        />
      ))}
      <rect
        x={rwyLeft + 30}
        y={rwyTop + 8}
        width={3}
        height={rwyBottom - rwyTop - 16}
        fill="var(--fg-2)"
      />

      <text
        x={rwyLeft + 6}
        y={rwyTop - 6}
        fontFamily="JetBrains Mono"
        fontSize="10"
        fill="var(--fg-3)"
        letterSpacing="0.1em"
      >
        {runway.runway}
      </text>
      <text
        x={rwyRight - 6}
        y={rwyBottom + 16}
        fontFamily="JetBrains Mono"
        fontSize="10"
        fill="var(--fg-3)"
        letterSpacing="0.1em"
        textAnchor="end"
      >
        {runway.lengthFt} FT
      </text>

      <path
        d={path}
        fill="none"
        stroke={aircraftColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points
        .filter((_, i) => i % 12 === 0)
        .map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.6"
            fill={aircraftColor}
            opacity="0.6"
          />
        ))}

      {td && (
        <g>
          <circle
            cx={td.x}
            cy={td.y}
            r="6"
            fill="none"
            stroke="var(--good)"
            strokeWidth="1.5"
          />
          <circle cx={td.x} cy={td.y} r="2.5" fill="var(--good)" />
          <text
            x={td.x + 12}
            y={td.y - 8}
            fontFamily="JetBrains Mono"
            fontSize="10"
            fill="var(--good)"
            letterSpacing="0.1em"
          >
            TD · {report.distFromThreshFt} FT · {report.centerlineDevFt} FT L/R
          </text>
        </g>
      )}

      <text
        x={padL - 8}
        y={yToPx(150) + 4}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        textAnchor="end"
      >
        +150
      </text>
      <text
        x={padL - 8}
        y={yToPx(0) + 4}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        textAnchor="end"
      >
        CL
      </text>
      <text
        x={padL - 8}
        y={yToPx(-150) + 4}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        textAnchor="end"
      >
        −150
      </text>
      <text
        x={padL - 32}
        y={H / 2}
        fontFamily="JetBrains Mono"
        fontSize="9"
        fill="var(--fg-3)"
        transform={`rotate(-90, ${padL - 32}, ${H / 2})`}
        textAnchor="middle"
        letterSpacing="0.1em"
      >
        LATERAL (FT)
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
            maxWidth: 360,
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
            NO LANDING RECORDED
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            Complete an approach to view the debrief. The panel records
            telemetry from final approach through rollout, then scores
            touchdown rate, centerline tracking, G-load, heading and speed
            control.
          </div>
          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <button
              className="btn primary"
              onClick={() => sim.actions.jumpTo("approach")}
            >
              FLY APPROACH
            </button>
          </div>
        </div>
      </div>
    );
  }

  const verdict =
    r.overall >= 85
      ? { color: "var(--good)", text: "STABLE LANDING" }
      : r.overall >= 70
        ? { color: "var(--warn)", text: "SAFE BUT IMPROVABLE" }
        : { color: "var(--bad)", text: "UNSTABLE — REVIEW" };

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">DEBRIEF</span>
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--fg-3)" }}
            >
              SESSION 2026-04-28T18:42Z · {s.aircraft.code} · KSFO/{s.runway.runway}
            </span>
          </div>
          <div
            className="card-body"
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr 1fr",
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
                  letterSpacing: "-0.04em",
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
                {r.overall}
                <span style={{ color: "var(--fg-3)", fontSize: 14 }}>
                  {" "}
                  / 100
                </span>
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
            <div
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {r.breakdown.slice(0, 3).map((b, i) => (
                <ScoreBar key={i} {...b} />
              ))}
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {r.breakdown.slice(3).map((b, i) => (
                <ScoreBar key={i} {...b} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">APPROACH TRAJECTORY · TOP-DOWN</span>
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--fg-3)" }}
            >
              {s.trajectoryHistory.length} samples · 12 NM final
            </span>
          </div>
          <div className="card-body" style={{ padding: 12 }}>
            <TrajectoryReplay
              history={s.trajectoryHistory}
              report={r}
              runway={s.runway}
              aircraftColor={s.aircraft.color}
            />
          </div>
        </div>
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
                  r.vsTouchdown < -300
                    ? "bad"
                    : r.vsTouchdown < -200
                      ? "warn"
                      : "good"
                }`}
              >
                {r.vsTouchdown}
                <span className="unit">FPM</span>
              </div>
              <div className="sub">Tgt &gt; −180</div>
            </div>
            <div className="metric">
              <div className="lbl">Speed</div>
              <div className="val">
                {r.iasTouchdown}
                <span className="unit">KIAS</span>
              </div>
              <div className="sub">VRef {s.aircraft.vRef}</div>
            </div>
            <div className="metric">
              <div className="lbl">G-load</div>
              <div
                className={`val ${
                  r.gForce > 1.5 ? "bad" : r.gForce > 1.3 ? "warn" : "good"
                }`}
              >
                {r.gForce.toFixed(2)}
                <span className="unit">G</span>
              </div>
              <div className="sub">Peak vertical</div>
            </div>
            <div className="metric">
              <div className="lbl">Pitch</div>
              <div className="val">{r.pitchDeg.toFixed(1)}°</div>
              <div className="sub">Bank {r.bankDeg.toFixed(1)}°</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">ACCURACY</span>
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">From threshold</div>
              <div className="val">
                {r.distFromThreshFt}
                <span className="unit">FT</span>
              </div>
              <div className="sub">TDZ 750 – 3000 ft</div>
            </div>
            <div className="metric">
              <div className="lbl">Centerline</div>
              <div
                className={`val ${
                  Math.abs(r.centerlineDevFt) > 15 ? "warn" : "good"
                }`}
              >
                {r.centerlineDevFt}
                <span className="unit">FT</span>
              </div>
              <div className="sub">Lateral offset</div>
            </div>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val">{r.headingDevDeg.toFixed(1)}°</div>
              <div className="sub">vs runway course</div>
            </div>
            <div className="metric">
              <div className="lbl">Flare</div>
              <div
                className={`val ${
                  r.flareQuality === "Good" ? "good" : "warn"
                }`}
                style={{ fontSize: 22 }}
              >
                {r.flareQuality.toUpperCase()}
              </div>
              <div className="sub">
                {r.bounce ? `${r.bounce} bounce` : "No bounce"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">NOTES</span>
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
            {r.overall >= 85 && (
              <>
                <div>
                  · Approach was stable from 1000 ft AGL through touchdown — all
                  five gates green.
                </div>
                <div>
                  · Touchdown rate{" "}
                  <strong style={{ color: "var(--fg)" }}>
                    {r.vsTouchdown} fpm
                  </strong>{" "}
                  within target window. Gentle on the gear.
                </div>
                <div>
                  · Touchdown{" "}
                  <strong style={{ color: "var(--fg)" }}>
                    {r.distFromThreshFt} ft
                  </strong>{" "}
                  past threshold places you in the touchdown zone.
                </div>
              </>
            )}
            {r.overall < 85 && r.overall >= 70 && (
              <>
                <div>
                  · Approach was within tolerances but glideslope tracking
                  drifted in the last 3 NM.
                </div>
                <div>
                  · Speed was{" "}
                  <strong style={{ color: "var(--warn)" }}>
                    {r.iasTouchdown - s.aircraft.vRef > 0 ? "+" : ""}
                    {r.iasTouchdown - s.aircraft.vRef} kt
                  </strong>{" "}
                  over VRef at touchdown — risk of float and long landing.
                </div>
                <div>
                  · Consider trimming earlier and reducing power before the
                  flare.
                </div>
              </>
            )}
            {r.overall < 70 && (
              <>
                <div>
                  ·{" "}
                  <strong style={{ color: "var(--bad)" }}>
                    Hard landing detected
                  </strong>{" "}
                  ({r.vsTouchdown} fpm, {r.gForce.toFixed(2)} g). Maintenance
                  inspection may be required.
                </div>
                <div>
                  · Centerline deviation{" "}
                  <strong style={{ color: "var(--bad)" }}>
                    {r.centerlineDevFt} ft
                  </strong>{" "}
                  at touchdown — go-around criteria not met but worth reviewing
                  crosswind technique.
                </div>
                <div>
                  · Flare was{" "}
                  <strong style={{ color: "var(--bad)" }}>
                    {r.flareQuality.toLowerCase()}
                  </strong>
                  . Aim for VRef + 0 at 50 ft and flare progressively from 30
                  ft AGL.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
