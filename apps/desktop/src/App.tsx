import { useState } from "react";
import "./App.css";

import { AppShell } from "./layout/AppShell";
import { TelemetryPanel } from "./components/TelemetryPanel";
import { ApproachPanel } from "./components/ApproachPanel";
import { LandingAnalysisPanel } from "./components/LandingAnalysisPanel";
import { useBridgeTelemetry } from "./hooks/useBridgeTelemetry";

export type AppPage = "telemetry" | "approach" | "landing";

function App() {
  const [page, setPage] = useState<AppPage>("telemetry");
  const { status, telemetry, lastMessageAt, bridgeUrl } = useBridgeTelemetry();

  return (
    <AppShell
      activePage={page}
      onPageChange={setPage}
      status={status}
    >
      {page === "telemetry" ? (
        <TelemetryPanel
          status={status}
          telemetry={telemetry}
          lastMessageAt={lastMessageAt}
          bridgeUrl={bridgeUrl}
        />
      ) : null}

      {page === "approach" ? <ApproachPanel /> : null}

      {page === "landing" ? <LandingAnalysisPanel /> : null}
    </AppShell>
  );
}

export default App;