#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"
#include "scenario/ApproachScenario.hpp"

#include <string>
#include <vector>

namespace msfs_turnaround {

struct SpawnReadinessResult {
    bool ready = false;
    std::vector<std::string> issues;
    std::vector<std::string> warnings;
};

class SpawnReadinessChecker {
public:
    SpawnReadinessResult check(
        const AircraftTelemetry& telemetry,
        const ApproachScenario& scenario,
        bool freezeOrHoldActive,
        bool configurationTimedOut
    ) const;
};

}
