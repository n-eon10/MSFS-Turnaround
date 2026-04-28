import { useEffect, useState } from "react";
import "./App.css";

import { useSim, type Phase } from "./sim/useSim";
import { padHdg } from "./sim/format";
import { Dashboard } from "./screens/Dashboard";
import { ApproachSetup } from "./screens/ApproachSetup";
import { LiveMonitor } from "./screens/LiveMonitor";
import { LandingAnalysis } from "./screens/LandingAnalysis";

export type AppPage = "dashboard" | "setup" | "monitor" | "analysis";

const NAV: Array<{ id: AppPage; label: string; num: string }> = [
  { id: "dashboard", label: "Dashboard", num: "01" },
  { id: "setup", label: "Approach Setup", num: "02" },
  { id: "monitor", label: "Live Monitor", num: "03" },
  { id: "analysis", label: "Landing Analysis", num: "04" },
];

const PHASE_LABEL: Record<Phase, string> = {
  preflight: "PREFLIGHT",
  approach: "APPROACH",
  landing: "LANDING",
  landed: "LANDED",
};

const PAGE_TITLES: Record<AppPage, { h: string; crumb: string }> = {
  dashboard: { h: "Flight Dashboard", crumb: "HOME / OVERVIEW" },
  setup: { h: "Approach Setup", crumb: "PROCEDURE / KSFO 28R" },
  monitor: { h: "Live Approach Monitor", crumb: "TELEMETRY / 20 HZ" },
  analysis: { h: "Landing Analysis", crumb: "DEBRIEF" },
};

function utcNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
}

function App() {
  const [page, setPage] = useState<AppPage>("dashboard");
  const [scale, setScale] = useState(1);
  const [clock, setClock] = useState(utcNow());

  const sim = useSim({
    aircraft: "A320",
    approach: "ILS",
    stability: "stable",
    initialPhase: page === "analysis" ? "landed" : "approach",
    running: true,
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "slate");
    document.documentElement.setAttribute("data-density", "balanced");
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(utcNow()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fit = () => {
      const w = window.innerWidth,
        h = window.innerHeight;
      const sx = (w - 32) / 1440;
      const sy = (h - 32) / 900;
      setScale(Math.min(1, Math.min(sx, sy)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (sim.state.phase === "landed" && page === "monitor") {
      const id = setTimeout(() => setPage("analysis"), 600);
      return () => clearTimeout(id);
    }
  }, [sim.state.phase, page]);

  const s = sim.state;
  const pt = PAGE_TITLES[page];

  const renderScreen = () => {
    switch (page) {
      case "dashboard":
        return <Dashboard sim={sim} />;
      case "setup":
        return <ApproachSetup sim={sim} />;
      case "monitor":
        return <LiveMonitor sim={sim} />;
      case "analysis":
        return <LandingAnalysis sim={sim} />;
    }
  };

  return (
    <div className="viewport">
      <div className="scaler" style={{ transform: `scale(${scale})` }}>
        <div className="win">
          <div className="titlebar">
            <div className="lights">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="title-text">
              MSFS Turnaround — {s.aircraft.code} · {s.runway.airport}/
              {s.runway.runway}
            </span>
            <div className="title-meta">
              <span>
                <span className="live-dot" style={{ color: "var(--good)" }}>
                  ●
                </span>{" "}
                SIMCONNECT
              </span>
              <span>{clock}</span>
            </div>
          </div>

          <div className="app">
            <div className="sidebar">
              <div className="sidebar-brand">
                <div className="name">MSFS·TURNAROUND</div>
                <div className="ver">v0.4.0-beta · open source</div>
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
                    {(s.phase === "approach" || s.phase === "landing") && (
                      <span
                        className="live-dot"
                        style={{ marginLeft: 6, color: "var(--good)" }}
                      >
                        ●
                      </span>
                    )}
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
                    {s.aircraft.code}{" "}
                    <span style={{ color: "var(--fg-3)" }}>
                      · {s.aircraft.operator.split(" ")[0]}
                    </span>
                  </div>
                </div>
              </div>
              <div className="sidebar-foot">
                <div className="conn">
                  <span className="dot"></span> ws://127.0.0.1:8421
                </div>
                <div>BRIDGE 12 ms · 20 Hz</div>
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
                  {page === "monitor" &&
                    (s.phase === "approach" || s.phase === "landing") && (
                      <span>
                        <span
                          className="live-dot"
                          style={{ color: "var(--good)" }}
                        >
                          ●
                        </span>{" "}
                        RECORDING
                      </span>
                    )}
                  <span>
                    FL{Math.round(s.altMSL / 100).toString().padStart(3, "0")}
                  </span>
                  <span>
                    {padHdg(s.heading)}°/{Math.round(s.ias)}
                  </span>
                  <span>{s.distNm.toFixed(2)} NM</span>
                </div>
              </div>
              <div className="pane-body">{renderScreen()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
