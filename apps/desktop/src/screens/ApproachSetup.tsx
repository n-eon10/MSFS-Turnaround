import { useState, type FormEvent } from "react";

import type { NavAirport, NavRunwayEnd } from "../types/telemetry";
import type { UseSimResult } from "../sim/useSim";
import { fmt, padHdg } from "../sim/format";
import { StatusPill } from "./common";

function AirportResult({
  airport,
  selected,
  onSelect,
}: {
  airport: NavAirport;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`tile ${selected ? "sel" : ""}`}
      onClick={onSelect}
      style={{ textAlign: "left" }}
    >
      <div className="code">{airport.ident}</div>
      <div className="meta">
        {airport.name}
        {airport.municipality ? ` - ${airport.municipality}` : ""}
      </div>
    </button>
  );
}

function RunwayResult({
  runway,
  selected,
  onSelect,
}: {
  runway: NavRunwayEnd;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`tile ${selected ? "sel" : ""}`}
      onClick={onSelect}
      style={{ textAlign: "left" }}
    >
      <div className="code">RWY {runway.runwayIdent}</div>
      <div className="meta">
        {padHdg(runway.headingDegT)} DEG - {fmt(runway.lengthFt)} FT
      </div>
    </button>
  );
}

export function ApproachSetup({ sim }: { sim: UseSimResult }) {
  const s = sim.state;
  const navdata = s.navdata;
  const selectedRunway = navdata.selectedRunway;
  const [query, setQuery] = useState(navdata.airportSearchQuery);
  const [selectedAirport, setSelectedAirport] = useState<NavAirport | null>(null);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    sim.actions.searchAirports(query, 20);
  };

  const selectAirport = (airport: NavAirport) => {
    setSelectedAirport(airport);
    sim.actions.requestRunways(airport.ident);
  };

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">AIRPORT SEARCH</span>
            <StatusPill kind={s.connected ? "good" : "warn"}>
              {s.connected ? "BRIDGE READY" : "BRIDGE OFFLINE"}
            </StatusPill>
          </div>
          <div className="card-body">
            <form
              onSubmit={submitSearch}
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              <input
                className="mono"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Airport ID, name, or city"
                style={{
                  flex: 1,
                  fontSize: 18,
                  fontWeight: 600,
                  padding: "10px 12px",
                  background: "var(--panel-2)",
                  border: "1px solid var(--border-2)",
                  color: "var(--fg)",
                  borderRadius: 6,
                  outline: "none",
                }}
              />
              <button className="btn primary" type="submit">
                SEARCH
              </button>
            </form>
            {navdata.error && (
              <div className="todo-note" style={{ marginTop: 12, color: "var(--warn)" }}>
                {navdata.error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">AIRPORTS</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              {navdata.airportResults.length} RESULTS
            </span>
          </div>
          <div className="card-body">
            {navdata.airportResults.length > 0 ? (
              <div className="tile-grid">
                {navdata.airportResults.map((airport) => (
                  <AirportResult
                    key={airport.ident}
                    airport={airport}
                    selected={selectedAirport?.ident === airport.ident}
                    onSelect={() => selectAirport(airport)}
                  />
                ))}
              </div>
              ) : (
              <div className="todo-note">
                Enter a search query, then select an airport to load runways.
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-head">
            <span className="lbl">RUNWAY ENDS</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
              {navdata.runwayAirportIdent || "NO AIRPORT"}
            </span>
          </div>
          <div className="card-body">
            {navdata.runwayResults.length > 0 ? (
              <div className="tile-grid">
                {navdata.runwayResults.map((runway) => (
                  <RunwayResult
                    key={`${runway.airportIdent}-${runway.runwayIdent}`}
                    runway={runway}
                    selected={
                      selectedRunway?.airportIdent === runway.airportIdent &&
                      selectedRunway?.runwayIdent === runway.runwayIdent
                    }
                    onSelect={() => sim.actions.selectRunway(runway)}
                  />
                ))}
              </div>
            ) : (
              <div className="todo-note">
                {selectedAirport
                  ? "No runways found for this airport."
                  : "Select an airport to request runways."}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: 14 }}>
        <div className="card flex-1">
          <div className="card-head">
            <span className="lbl">SELECTED RUNWAY</span>
            {selectedRunway ? (
              <StatusPill kind="good">SELECTED</StatusPill>
            ) : (
              <StatusPill kind="warn">NONE</StatusPill>
            )}
          </div>
          <div className="card-body grid-4" style={{ gap: 22 }}>
            <div className="metric">
              <div className="lbl">Airport</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway?.airportIdent ?? "—"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Runway</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway?.runwayIdent ?? "—"}
              </div>
              <div className="sub">
                Opposite {selectedRunway?.oppositeIdent || "-"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Heading</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway ? `${padHdg(selectedRunway.headingDegT)} DEG` : "-"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Surface</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {selectedRunway?.surface || "-"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Length</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {fmt(selectedRunway?.lengthFt)} FT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Width</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {fmt(selectedRunway?.widthFt)} FT
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Threshold lat/lon</div>
              <div className="val mono" style={{ fontSize: 18 }}>
                {selectedRunway
                  ? `${selectedRunway.latitudeDeg.toFixed(5)}, ${selectedRunway.longitudeDeg.toFixed(5)}`
                  : "-"}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">Threshold elev</div>
              <div className="val mono" style={{ fontSize: 22 }}>
                {fmt(selectedRunway?.elevationFt)} FT
              </div>
              <div className="sub">
                Displaced {fmt(selectedRunway?.displacedThresholdFt)} FT
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
