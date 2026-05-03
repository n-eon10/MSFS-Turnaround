#pragma once

#include "navdata/RunwayEnd.hpp"

#include <string>
#include <vector>

namespace msfs_turnaround {

struct ApproachScenarioRequest {
    std::string airportIdent;
    std::string runwayIdent;

    double distanceNm = 8.0;
    double glidepathDeg = 3.0;
    double airspeedKt = 140.0;

    bool gearDown = true;
    int flapsIndex = 3;
};

struct ApproachScenario {
    std::string airportIdent;
    std::string runwayIdent;

    double distanceNm = 8.0;
    double glidepathDeg = 3.0;
    double airspeedKt = 140.0;
    double spawnAirspeedKt = 148.0;

    bool gearDown = true;
    int flapsIndex = 3;

    double spawnLatitudeDeg = 0.0;
    double spawnLongitudeDeg = 0.0;
    double spawnAltitudeFt = 0.0;
    double spawnHeadingDeg = 0.0;

    double thresholdLatitudeDeg = 0.0;
    double thresholdLongitudeDeg = 0.0;
    double thresholdElevationFt = 0.0;
};

struct ScenarioSpawnResult {
    bool ok = false;
    std::string error;
    std::vector<std::string> warnings;

    std::string airportIdent;
    std::string runwayIdent;

    double distanceNm = 0.0;
    double glidepathDeg = 0.0;
    double airspeedKt = 0.0;

    double spawnLatitudeDeg = 0.0;
    double spawnLongitudeDeg = 0.0;
    double spawnAltitudeFt = 0.0;
    double spawnHeadingDeg = 0.0;

    bool gearRequested = false;
    bool flapsRequested = false;
    bool parkingBrakeRequested = false;
    bool pauseRequested = false;
};

struct ScenarioStatus {
    std::string phase;
    std::string message;
    std::string airportIdent;
    std::string runwayIdent;
    std::vector<std::string> warnings;
};

bool computeApproachScenario(
    const ApproachScenarioRequest& request,
    const RunwayEnd& runwayEnd,
    ApproachScenario& scenario,
    std::string& error
);

ScenarioSpawnResult scenarioResultFromScenario(const ApproachScenario& scenario);

}
