#include "scenario/ScenarioSpawner.hpp"

#include "msfs_turnaround/simconnect_client.hpp"
#include "navdata/NavDatabase.hpp"
#include "scenario/AircraftAdapter.hpp"

#include <iostream>

namespace msfs_turnaround {
namespace {

ScenarioSpawnResult failureResult(
    const ApproachScenarioRequest& request,
    const std::string& error
) {
    ScenarioSpawnResult result;
    result.ok = false;
    result.error = error;
    result.airportIdent = request.airportIdent;
    result.runwayIdent = request.runwayIdent;
    result.distanceNm = request.distanceNm;
    result.glidepathDeg = request.glidepathDeg;
    result.airspeedKt = request.airspeedKt;
    result.gearRequested = request.gearDown;
    result.flapsRequested = request.flapsIndex > 0;
    result.parkingBrakeRequested = true;
    result.pauseRequested = request.pauseAfterSpawn;
    return result;
}

}

ScenarioSpawner::ScenarioSpawner(
    NavDatabase& navDatabase,
    SimConnectClient& simconnect,
    AircraftAdapter& aircraftAdapter
)
    : navDatabase_(navDatabase),
      simconnect_(simconnect),
      aircraftAdapter_(aircraftAdapter) {}

ScenarioSpawnResult ScenarioSpawner::spawnFinal(
    const ApproachScenarioRequest& request,
    const std::optional<RunwayEnd>& activeRunway,
    std::optional<RunwayEnd>& selectedRunway
) {
    if (!simconnect_.isConnected()) {
        return failureResult(request, "MSFS is not connected");
    }

    if (!navDatabase_.isOpen()) {
        return failureResult(request, "Navdata database is not available");
    }

    std::optional<RunwayEnd> runwayEnd;
    const bool hasAirportIdent = !request.airportIdent.empty();
    const bool hasRunwayIdent = !request.runwayIdent.empty();
    if (hasAirportIdent != hasRunwayIdent) {
        return failureResult(
            request,
            "airportIdent and runwayIdent must be provided together"
        );
    }

    if (hasAirportIdent && hasRunwayIdent) {
        runwayEnd = navDatabase_.getRunwayEnd(request.airportIdent, request.runwayIdent);
        if (!runwayEnd) {
            return failureResult(request, "Runway not found");
        }
    } else if (activeRunway) {
        runwayEnd = activeRunway;
    } else {
        return failureResult(request, "No active runway selected");
    }

    ApproachScenario scenario;
    std::string error;
    if (!computeApproachScenario(request, *runwayEnd, scenario, error)) {
        return failureResult(request, error);
    }

    ScenarioSpawnResult result = scenarioResultFromScenario(scenario);
    if (!simconnect_.setUserAircraftPosition(scenario, error)) {
        return failureResult(request, error);
    }

    if (!aircraftAdapter_.configureForApproach(simconnect_, scenario, error)) {
        result.warnings.push_back(error);
        std::cerr << "Generic aircraft configuration warning: " << error << std::endl;
    }

    if (scenario.pauseAfterSpawn && !simconnect_.setPaused(true, error)) {
        result.warnings.push_back(error);
        std::cerr << "Pause after spawn warning: " << error << std::endl;
    }

    result.ok = true;
    selectedRunway = runwayEnd;
    return result;
}

}
