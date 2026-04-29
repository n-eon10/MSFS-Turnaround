#pragma once

#include "navdata/RunwayEnd.hpp"
#include "scenario/ApproachScenario.hpp"

#include <optional>

namespace msfs_turnaround {

class AircraftAdapter;
class NavDatabase;
class SimConnectClient;

class ScenarioSpawner {
public:
    ScenarioSpawner(
        NavDatabase& navDatabase,
        SimConnectClient& simconnect,
        AircraftAdapter& aircraftAdapter
    );

    ScenarioSpawnResult spawnFinal(
        const ApproachScenarioRequest& request,
        const std::optional<RunwayEnd>& activeRunway,
        std::optional<RunwayEnd>& selectedRunway
    );

private:
    NavDatabase& navDatabase_;
    SimConnectClient& simconnect_;
    AircraftAdapter& aircraftAdapter_;
};

}
