#pragma once

#include "navdata/RunwayEnd.hpp"
#include "scenario/ApproachScenario.hpp"

#include <optional>

namespace msfs_turnaround {

class NavDatabase;
class SimConnectClient;

class ScenarioSpawner {
public:
    ScenarioSpawner(
        NavDatabase& navDatabase,
        SimConnectClient& simconnect
    );

    ScenarioSpawnResult prepareFinal(
        const ApproachScenarioRequest& request,
        const std::optional<RunwayEnd>& activeRunway,
        std::optional<RunwayEnd>& selectedRunway,
        ApproachScenario* preparedScenario = nullptr
    );

private:
    NavDatabase& navDatabase_;
    SimConnectClient& simconnect_;
};

}
