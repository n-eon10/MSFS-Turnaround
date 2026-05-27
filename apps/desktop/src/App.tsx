import { useEffect, useRef, useState } from "react";
import "./App.css";

import { useSim, type Phase } from "./sim/useSim";
import { fmt, padHdg } from "./sim/format";
import { Dashboard } from "./screens/Dashboard";
import { ApproachSetup } from "./screens/ApproachSetup";
import { ScenarioSetup } from "./screens/ScenarioSetup";
import { LiveMonitor } from "./screens/LiveMonitor";
import { LandingAnalysis } from "./screens/LandingAnalysis";

export type AppPage = "dashboard" | "setup" | "scenario" | "monitor" | "analysis";

const NAV: Array<{ id: AppPage; label: string; num: string }> = [
  { id: "dashboard", label: "Dashboard", num: "01" },
  { id: "setup", label: "Airport Setup", num: "02" },
  { id: "scenario", label: "Scenario Setup", num: "03" },
  { id: "monitor", label: "Live Monitor", num: "04" },
  { id: "analysis", label: "Landing Analysis", num: "05" },
];

const PHASE_LABEL: Record<Phase, string> = {
  preflight: "GROUND / WAITING",
  approach: "AIRBORNE",
  landing: "LOW ALTITUDE",
  landed: "LANDED",
};

const PAGE_TITLES: Record<AppPage, { h: string; crumb: string }> = {
  dashboard: { h: "Flight Dashboard", crumb: "BRIDGE / LIVE DATA" },
  setup: { h: "Airport / Runway Setup", crumb: "NAVDATA / LOCAL SQLITE" },
  scenario: { h: "Scenario Setup", crumb: "SIMCONNECT / FINAL APPROACH" },
  monitor: { h: "Live Telemetry Monitor", crumb: "SIMCONNECT / WEBSOCKET" },
  analysis: { h: "Landing Analysis", crumb: "BRIDGE / TOUCHDOWN EVENT" },
};

function utcNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(
    d.getUTCSeconds()
  )}Z`;
}

function bridgeStatusLabel(status: string): string {
  switch (status) {
    case "connected":
      return "CONNECTED";
    case "connecting":
      return "CONNECTING";
    case "error":
      return "ERROR";
    default:
      return "DISCONNECTED";
  }
}

function App() {
  const [page, setPage] = useState<AppPage>("dashboard");
  const [clock, setClock] = useState(utcNow());
  const autoRoutedReportRef = useRef<unknown>(null);

  const sim = useSim();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "slate");
    document.documentElement.setAttribute("data-density", "balanced");
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(utcNow()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const report = sim.state.report;
    if (sim.state.phase !== "landed" || !report) {
      autoRoutedReportRef.current = null;
      return;
    }
    if (autoRoutedReportRef.current === report) return;
    autoRoutedReportRef.current = report;
    const id = setTimeout(() => setPage("analysis"), 600);
    return () => clearTimeout(id);
  }, [sim.state.phase, sim.state.report]);

  const s = sim.state;
  const pt = PAGE_TITLES[page];
  const bridgeStatus = bridgeStatusLabel(s.bridgeStatus);

  const renderScreen = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard sim={sim} />;
      case "setup":
        return <ApproachSetup sim={sim} />;
      case "scenario":
        return <ScenarioSetup sim={sim} onSpawnSuccess={() => setPage("monitor")} />;
      case "monitor":
        return <LiveMonitor sim={sim} />;
      case "analysis":
        return <LandingAnalysis sim={sim} />;
    }
  };

  return (
    <div className="app">
            <div className="sidebar">
              <div className="sidebar-brand">
                <div className="name">MSFS TURNAROUND</div>
              </div>
              <div className="nav">
                <div className="nav-section">PANELS</div>
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`nav-item ${page === n.id ? "active" : ""}`}
                    onClick={() => setPage(n.id)}
                  >
                    <span className="num">{n.num}</span>
                    <span>{n.label}</span>
                  </button>
                ))}
                <div className="nav-section">FLIGHT</div>
                <div style={{ padding: "4px 10px" }}>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10,
                      color: "var(--fg-3)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    PHASE
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--fg)",
                      marginTop: 2,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {PHASE_LABEL[s.phase]}
                  </div>
                </div>
                <div style={{ padding: "8px 10px 4px" }}>
                  <div
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 10,
                      color: "var(--fg-3)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    AIRCRAFT
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 12, color: "var(--fg)", marginTop: 2 }}
                  >
                    {s.aircraft.code ?? "TODO"}
                    {s.aircraft.name && (
                      <span style={{ color: "var(--fg-3)" }}>
                        {" "}
                        - {s.aircraft.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="sidebar-foot">
                <div className={`conn ${s.connected ? "" : "bad"}`}>
                  <span className="dot"></span> {s.bridgeUrl}
                </div>
                <div>{bridgeStatus}</div>
                <div>{clock}</div>
              </div>
            </div>

            <div className="pane">
              <div className="pane-head">
                <div className="h-l">
                  <h1>{pt.h}</h1>
                  <span className="crumb">{pt.crumb}</span>
                </div>
                <div className="tools">
                  {page === "monitor" && s.connected && <span>LIVE TELEMETRY</span>}
                  <span>ALT {fmt(s.altMSL)} FT</span>
                  <span>
                    HDG {padHdg(s.heading)} / IAS {fmt(s.ias)}
                  </span>
                  <span>
                    {s.distNm === null
                      ? "DIST TODO"
                      : `${s.distNm.toFixed(2)} NM`}
                  </span>
                </div>
              </div>
              <div className="pane-body">{renderScreen()}</div>
            </div>
    </div>
  );
}

export default App;
