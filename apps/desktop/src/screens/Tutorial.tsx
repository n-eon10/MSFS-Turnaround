import type { AppPage } from "../App";

type Step = {
  num: string;
  page: AppPage;
  title: string;
  crumb: string;
  description: string;
  tip: string;
};

const STEPS: Step[] = [
  {
    num: "01",
    page: "dashboard",
    title: "Flight Dashboard",
    crumb: "OVERVIEW",
    description:
      "Your mission control. See aircraft identity, current phase, live telemetry (airspeed, altitude, heading, vertical speed), active runway, and last landing score at a glance. This screen auto-populates once the bridge is connected and MSFS is running.",
    tip: "The bridge status dot in the bottom-left of the nav rail must be green before anything works.",
  },
  {
    num: "02",
    page: "setup",
    title: "Airport & Runway Setup",
    crumb: "NAVDATA SEARCH",
    description:
      "Search for your destination airport by ICAO code or name. Select it to load its runways, then pick the runway you intend to land on. This locks in the course and geometry used for all approach deviation calculations in the session.",
    tip: "You only need to set this once per session. It persists until you change it.",
  },
  {
    num: "03",
    page: "scenario",
    title: "Scenario Setup",
    crumb: "FINAL APPROACH",
    description:
      "Optionally spawn your aircraft on a configured final approach. Choose a preset distance and configuration, adjust parameters, then press Spawn. The bridge will position your aircraft in MSFS at the selected distance from the runway threshold.",
    tip: "Skip this step if you're already airborne or flying manually onto the approach.",
  },
  {
    num: "04",
    page: "monitor",
    title: "Live Monitor",
    crumb: "LIVE TELEMETRY",
    description:
      "Real-time approach monitoring. Track course error, lateral deviation (LOC), glidepath deviation (GS), and stability gate results at 1000 ft and 500 ft AGL. A stable gate requires correct speed, configuration, and deviation limits at the checkpoint.",
    tip: "The app automatically navigates here after a successful spawn.",
  },
  {
    num: "05",
    page: "analysis",
    title: "Landing Analysis",
    crumb: "TOUCHDOWN DEBRIEF",
    description:
      "Immediately after touchdown the app auto-navigates here. Review your landing score (A–E), touchdown vertical speed, G-force, and a weighted breakdown of each scoring component. Approach stability grades from both gates feed into the final score.",
    tip: "Touchdown is detected automatically — no action needed from you.",
  },
];

const CONCEPTS: Array<{ term: string; def: string }> = [
  {
    term: "Bridge",
    def: "The C++ SimConnect process (apps/bridge) that connects MSFS to this UI over a local WebSocket on port 48787. It must be running before you start a session.",
  },
  {
    term: "Phase",
    def: "App state derived from altitude and configuration: GROUND / WAITING → AIRBORNE → LOW ALTITUDE → LANDED. The current phase is shown in the sidebar.",
  },
  {
    term: "Stability Gates",
    def: "1000 ft and 500 ft AGL checkpoints. At each gate the app records whether airspeed, configuration, and deviation were all within stabilised-approach limits.",
  },
  {
    term: "Aircraft Adapter",
    def: "A per-aircraft module that provides V-speeds, flap detents, and landing config. Some metrics (Vref, Vapp) only appear when a compatible adapter is loaded.",
  },
];

export function Tutorial({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  return (
    <>
      <div className="card">
        <div className="card-head">
          <span className="lbl">GETTING STARTED</span>
          <span className="badge">GUIDE</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fg-2)" }}>
            MSFS Turnaround is a real-time approach coaching and landing analysis tool for Microsoft
            Flight Simulator. It connects to the sim via a local C++ bridge and guides you through
            the full approach workflow — from runway selection to touchdown debrief.
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "var(--fg-2)" }}>
            Follow the five steps below in sequence for your first flight.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="lbl">BEFORE YOU START</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            "Start Microsoft Flight Simulator 2020 or 2024.",
            "Launch the bridge executable (apps/bridge) — it connects to SimConnect on port 48787.",
            "Confirm the status dot in the nav rail bottom-left turns green.",
            "Load any aircraft and position yourself on approach or on the ground.",
          ].map((item, i) => (
            <div key={i} className="check done">
              <div className="box" />
              <div className="lbl">{item}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="lbl">WORKFLOW</span>
          <span className="badge">5 STEPS</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {STEPS.map((step) => (
            <div
              key={step.num}
              style={{
                background: "var(--panel-2)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "12px 14px",
                display: "flex",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.04em",
                  width: 28,
                  flexShrink: 0,
                  paddingTop: 2,
                }}
              >
                {step.num}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
                    {step.title}
                  </span>
                  <span
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                      color: "var(--fg-3)",
                    }}
                  >
                    {step.crumb}
                  </span>
                </div>
                <p
                  style={{
                    margin: "0 0 8px",
                    fontSize: 12.5,
                    lineHeight: 1.55,
                    color: "var(--fg-2)",
                  }}
                >
                  {step.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--fg-3)",
                      fontStyle: "italic",
                      lineHeight: 1.4,
                      flex: 1,
                    }}
                  >
                    Tip: {step.tip}
                  </span>
                  <button
                    className="btn ghost"
                    style={{ flexShrink: 0, fontSize: 11, padding: "4px 10px" }}
                    onClick={() => onNavigate(step.page)}
                  >
                    Open →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="lbl">KEY CONCEPTS</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CONCEPTS.map((c) => (
            <div key={c.term} style={{ display: "flex", gap: 14 }}>
              <div
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  width: 110,
                  flexShrink: 0,
                  textTransform: "uppercase",
                  paddingTop: 3,
                }}
              >
                {c.term}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--fg-2)" }}>
                {c.def}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
