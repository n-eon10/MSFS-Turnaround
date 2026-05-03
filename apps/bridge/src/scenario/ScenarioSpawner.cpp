#include "scenario/ScenarioSpawner.hpp"

#include "msfs_turnaround/simconnect_client.hpp"
#include "navdata/NavDatabase.hpp"

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
    result.parkingBrakeRequested = false;
    result.pauseRequested = false;
    return result;
}

}

ScenarioSpawner::ScenarioSpawner(
    NavDatabase& navDatabase,
    SimConnectClient& simconnect
)
    : navDatabase_(navDatabase),
      simconnect_(simconnect) {}

ScenarioSpawnResult ScenarioSpawner::prepareFinal(
    const ApproachScenarioRequest& request,
    const std::optional<RunwayEnd>& activeRunway,
    std::optional<RunwayEnd>& selectedRunway,
    ApproachScenario* preparedScenario
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
    result.ok = true;
    selectedRunway = runwayEnd;
    if (preparedScenario != nullptr) {
        *preparedScenario = scenario;
    }
    return result;
}

}
