import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg, sign } from "../sim/format";
import { StatusPill } from "./common";

function DeviationTape({
  value,
  label,
  scaleDots = 2,
  formatter,
  criticalAt = 1.5,
  cautionAt = 0.6,
}: {
  value: number;
  label: string;
  scaleDots?: number;
  formatter?: (v: number) => string;
  criticalAt?: number;
  cautionAt?: number;
}) {
  const abs = Math.abs(value);
  const status = abs > criticalAt ? "bad" : abs > cautionAt ? "warn" : "";
  const pct = Math.max(0, Math.min(100, 50 + (value / scaleDots) * 50));
  const center = 50;
  const left = Math.min(pct, center);
  const width = Math.abs(pct - center);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--fg-3)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {label}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 14,
            color:
              status === "bad"
                ? "var(--bad)"
                : status === "warn"
                  ? "var(--warn)"
                  : "var(--good)",
            fontWeight: 600,
          }}
        >
          {formatter ? formatter(value) : `${sign(value)}${value.toFixed(2)} dot`}
        </span>
      </div>
      <div className={`tape ${status}`}>
        <div className="center"></div>
        <div className="bar" style={{ left: `${left}%`, width: `${width}%` }}></div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 9,
          color: "var(--fg-3)",
        }}
      >
        <span>−{scaleDots}</span>
        <span>0</span>
        <span>+{scaleDots}</span>
      </div>
    </div>
  );
}

function StabilityRow({
  label,
  value,
  ok,
  hint,
}: {
  label: string;
  value: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px dashed var(--border)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: ok ? "var(--good)" : "var(--warn)",
          boxShadow: `0 0 6px ${ok ? "var(--good)" : "var(--warn)"}`,
        }}
      ></span>
      <span style={{ flex: 1, fontSize: 12 }}>{label}</span>
      <span className="mono" style={{ fontSize: 11, color: "var(--fg-2)" }}>
        {value}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: ok ? "var(--good)" : "var(--warn)",
          width: 56,
          textAlign: "right",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {hint}
      </span>
    </div>
  );
}

export function LiveMonitor({ sim }: { sim: UseSimResult }) {
  const s = sim.state;

  const gates = [
    {
      label: "Speed within VApp ±10",
      value: `${fmt(s.ias)} KIAS`,
      ok: Math.abs(s.ias - s.aircraft.vApp) < 10 || s.altAGL > 1000,
      hint:
        Math.abs(s.ias - s.aircraft.vApp) < 10 || s.altAGL > 1000
          ? "OK"
          : "FAST",
    },
    {
      label: "V/S within −1000 fpm",
      value: `${fmt(s.vs)} FPM`,
      ok: s.vs > -1100,
      hint: s.vs > -1100 ? "OK" : "HIGH",
    },
    {
      label: "Localizer ≤ 1 dot",
      value: `${sign(s.locDev)}${s.locDev.toFixed(2)}`,
      ok: Math.abs(s.locDev) < 1,
      hint: Math.abs(s.locDev) < 1 ? "OK" : "DEV",
    },
    {
      label: "Glideslope ≤ 1 dot",
      value: `${sign(s.gsDev)}${s.gsDev.toFixed(2)}`,
      ok: Math.abs(s.gsDev) < 1,
      hint: Math.abs(s.gsDev) < 1 ? "OK" : "DEV",
    },
    {
      label: "Configuration LDG",
      value: `${s.flapsLabel} · ${s.gearDown ? "GEAR DOWN" : "GEAR UP"}`,
      ok: s.gearDown && s.flapsIdx >= s.aircraft.flapsLandingIdx - 1,
      hint: s.gearDown ? "OK" : "CONF",
    },
  ];
  const allOk = gates.every((g) => g.ok);
  const overallStatus: "good" | "warn" | "bad" = allOk
    ? "good"
    : gates.filter((g) => !g.ok).length > 1
      ? "bad"
      : "warn";

  const eteMin = Math.max(
    0,
    Math.floor((s.distNm / Math.max(1, s.groundSpeedKt)) * 60)
  );
  const eteSec = Math.max(
    0,
    Math.floor((((s.distNm / Math.max(1, s.groundSpeedKt)) * 60) % 1) * 60)
  );

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">PRIMARY</span>
            <StatusPill kind={overallStatus}>
              {overallStatus === "good"
                ? "STABLE"
                : overallStatus === "warn"
                  ? "CAUTION"
                  : "UNSTABLE"}
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
              <div
                className={`val ${
                  Math.abs(s.ias - s.aircraft.vApp) > 10 && s.altAGL < 1000
                    ? "warn"
                    : ""
                }`}
              >
                {fmt(s.ias)}
                <span className="unit">KT</span>
              </div>
              <div className="sub">
                VApp <span style={{ color: "var(--fg)" }}>{s.aircraft.vApp}</span> · Δ
                {sign(s.ias - s.aircraft.vApp)}
                {(s.ias - s.aircraft.vApp).toFixed(0)}
              </div>
            </div>
            <div className="metric lg">
              <div className="lbl">Radio Alt</div>
              <div className="val">
                {fmt(s.altAGL)}
                <span className="unit">FT AGL</span>
              </div>
              <div className="sub">
                MSL {fmt(s.altMSL)} · DH {s.approach.minimumsFt}
              </div>
            </div>
            <div className="metric lg">
              <div className="lbl">Vertical speed</div>
              <div
                className={`val ${
                  s.vs < -1100 ? "bad" : s.vs < -900 ? "warn" : ""
                }`}
              >
                {sign(s.vs)}
                {fmt(s.vs)}
                <span className="unit">FPM</span>
              </div>
              <div className="sub">
                Tgt −{Math.round(s.groundSpeedKt * 5.3)} for 3.0°
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ width: 220 }}>
          <div className="card-head">
            <span className="lbl">DTG</span>
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
            <div className="metric lg">
              <div className="lbl">Distance to RWY</div>
              <div className="val">
                {s.distNm.toFixed(2)}
                <span className="unit">NM</span>
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">ETE</div>
              <div className="val mono">
                {eteMin.toString().padStart(2, "0")}:
                {eteSec.toString().padStart(2, "0")}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">DEVIATIONS</span>
          </div>
          <div
            className="card-body"
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <DeviationTape value={s.locDev} label="LOCALIZER" scaleDots={2} />
            <DeviationTape value={s.gsDev} label="GLIDESLOPE" scaleDots={2} />
            <DeviationTape
              value={s.hdgErr}
              label="HEADING ALIGNMENT"
              scaleDots={6}
              formatter={(v) => `${sign(v)}${v.toFixed(1)}°`}
              criticalAt={4}
              cautionAt={2}
            />
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">STABILITY GATES</span>
            <span
              className="mono"
              style={{ fontSize: 10, color: "var(--fg-3)" }}
            >
              1000 FT GATE
            </span>
          </div>
          <div
            className="card-body"
            style={{ paddingTop: 4, paddingBottom: 4 }}
          >
            {gates.map((g, i) => (
              <StabilityRow key={i} {...g} />
            ))}
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
              <div className="val">{s.flapsLabel}</div>
              <div className="sub">
                Tgt {s.aircraft.flapStops[s.aircraft.flapsLandingIdx]}
              </div>
            </div>
            <div className="metric sm">
              <div className="lbl">Gear</div>
              <div className={`val ${s.gearDown ? "good" : "warn"}`}>
                {s.gearDown ? "DOWN · 3 GREEN" : "UP"}
              </div>
              <div className="sub">Below 250 KIAS</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Spoilers</div>
              <div className="val good">ARMED</div>
              <div className="sub">Auto deploy on TD</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Autobrake</div>
              <div className="val">MED</div>
              <div className="sub">Disarms on rollout</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Heading</div>
              <div className="val">
                {padHdg(s.heading)}°<span className="unit">M</span>
              </div>
              <div className="sub">Tgt {padHdg(s.headingTarget)}°</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Ground speed</div>
              <div className="val">
                {fmt(s.groundSpeedKt)}
                <span className="unit">KT</span>
              </div>
              <div className="sub">Wind: 280/10</div>
            </div>
            <div className="metric sm">
              <div className="lbl">N1</div>
              <div className="val">
                {(58 + Math.sin(s.t * 14) * 4).toFixed(1)}
                <span className="unit">%</span>
              </div>
              <div className="sub">Both engines</div>
            </div>
            <div className="metric sm">
              <div className="lbl">Pitch</div>
              <div className="val">
                {(2.4 + Math.sin(s.t * 12) * 0.6).toFixed(1)}°
              </div>
              <div className="sub">Bank {(s.hdgErr * 0.3).toFixed(1)}°</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
