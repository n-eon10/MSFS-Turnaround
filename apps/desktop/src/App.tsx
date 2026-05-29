import { useEffect, useRef, useState } from "react";
import "./App.css";
import logoWhite from "./assets/logo-white.png";

import { useSim, type Phase } from "./sim/useSim";
import { useSettings } from "./hooks/useSettings";
import { fmt, padHdg } from "./sim/format";
import { Dashboard } from "./screens/Dashboard";
import { ApproachSetup } from "./screens/ApproachSetup";
import { ScenarioSetup } from "./screens/ScenarioSetup";
import { LiveMonitor } from "./screens/LiveMonitor";
import { LandingAnalysis } from "./screens/LandingAnalysis";
import { Tutorial } from "./screens/Tutorial";
import { Settings } from "./screens/Settings";

export type AppPage =
  | "dashboard"
  | "setup"
  | "scenario"
  | "monitor"
  | "analysis"
  | "tutorial"
  | "settings";

const MAIN_NAV: Array<{ id: AppPage; label: string; num: string }> = [
  { id: "dashboard", label: "Dashboard", num: "01" },
  { id: "setup", label: "Airport Setup", num: "02" },
  { id: "scenario", label: "Scenario Setup", num: "03" },
  { id: "monitor", label: "Live Monitor", num: "04" },
  { id: "analysis", label: "Landing Analysis", num: "05" },
];

const SYSTEM_NAV: Array<{ id: AppPage; label: string; num: string }> = [
  { id: "tutorial", label: "Tutorial", num: "06" },
  { id: "settings", label: "Settings", num: "07" },
];


const PHASE_LABEL: Record<Phase, string> = {
  preflight: "GROUND / WAITING",
  approach: "AIRBORNE",
  landing: "LOW ALTITUDE",
  landed: "LANDED",
};

const PAGE_TITLES: Record<AppPage, { h: string; crumb: string }> = {
  dashboard: { h: "Flight Dashboard", crumb: "OVERVIEW" },
  setup: { h: "Airport / Runway Setup", crumb: "NAVDATA SEARCH" },
  scenario: { h: "Scenario Setup", crumb: "FINAL APPROACH" },
  monitor: { h: "Live Telemetry Monitor", crumb: "LIVE TELEMETRY" },
  analysis: { h: "Landing Analysis", crumb: "TOUCHDOWN DEBRIEF" },
  tutorial: { h: "Tutorial", crumb: "GETTING STARTED" },
  settings: { h: "Settings", crumb: "PREFERENCES" },
};

function utcNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
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
  const [navOpen, setNavOpen] = useState(false);
  const autoRoutedReportRef = useRef<unknown>(null);

  const { settings, setTheme, setDensity, setBridgeUrl, isValidWsUrl } = useSettings();
  const sim = useSim({ bridgeUrl: settings.bridgeUrl });

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

  const navigate = (p: AppPage) => {
    setPage(p);
    setNavOpen(false);
  };

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
      case "tutorial":
        return <Tutorial onNavigate={navigate} />;
      case "settings":
        return (
          <Settings
            settings={settings}
            setTheme={setTheme}
            setDensity={setDensity}
            setBridgeUrl={setBridgeUrl}
            isValidWsUrl={isValidWsUrl}
            bridgeStatus={s.bridgeStatus}
          />
        );
    }
  };

  return (
    <div className="app">
      {/* Narrow icon rail — always visible */}
      <div className="nav-rail">
        <div className="nav-rail-brand">
          <button
            className="nav-rail-toggle"
            type="button"
            onClick={() => setNavOpen(true)}
            title="Open navigation"
          >
            <img src={logoWhite} alt="Turnaround" className="nav-rail-logo" />
          </button>
        </div>
        <div className="nav-rail-items">
          {MAIN_NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nav-rail-item ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)}
              title={n.label}
            >
              {n.num}
            </button>
          ))}
        </div>
        <div className="nav-rail-sys">
          {SYSTEM_NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nav-rail-item ${page === n.id ? "active" : ""}`}
              onClick={() => setPage(n.id)}
              title={n.label}
            >
              {n.num}
            </button>
          ))}
        </div>
        <div className="nav-rail-foot">
          <span
            className={`dot ${s.connected ? "" : "bad"}`}
            title={`${s.bridgeUrl} — ${bridgeStatus}`}
          />
        </div>
      </div>

      {/* Backdrop — click to close overlay */}
      {navOpen && (
        <div className="nav-overlay-backdrop" onClick={() => setNavOpen(false)} />
      )}

      {/* Slide-in navigation panel */}
      <div className={`sidebar nav-overlay${navOpen ? " open" : ""}`}>
        <div
          className="sidebar-brand"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <div className="name">MSFS TURNAROUND</div>
          <button
            className="nav-close"
            type="button"
            onClick={() => setNavOpen(false)}
            title="Close navigation"
          >
            ✕
          </button>
        </div>
        <div className="nav">
          <div className="nav-section">PANELS</div>
          {MAIN_NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
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
            <div className="mono" style={{ fontSize: 12, color: "var(--fg)", marginTop: 2 }}>
              {s.aircraft.code ?? "—"}
              {s.aircraft.name && (
                <span style={{ color: "var(--fg-3)" }}> - {s.aircraft.name}</span>
              )}
            </div>
          </div>
          <div className="nav-section">SYSTEM</div>
          {SYSTEM_NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <span className="num">{n.num}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-foot">
          <div className={`conn ${s.connected ? "" : "bad"}`}>
            <span className="dot"></span> {s.bridgeUrl}
          </div>
          <div>{bridgeStatus}</div>
          <div>{clock}</div>
        </div>
      </div>

      {/* Main content pane */}
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
            {s.distNm !== null && <span>{s.distNm.toFixed(2)} NM</span>}
            {/* TODO: Show TO/FROM label alongside distance (e.g. "2.14 NM TO RWY") */}
          </div>
        </div>
        <div className="pane-body">{renderScreen()}</div>
      </div>
    </div>
  );
}

export default App;
