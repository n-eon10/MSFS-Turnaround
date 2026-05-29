#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"
#include "scenario/ApproachScenario.hpp"
#include "spawn/ApproachEnergyState.hpp"

#include <string>
#include <vector>

namespace msfs_turnaround {

class AircraftAdapter;
class SimConnectClient;

class AircraftConfigurator {
public:
    AircraftConfigurator(SimConnectClient& simconnect, AircraftAdapter& adapter);

    bool applyPhysicalConfiguration(const ApproachScenario& scenario, std::string& error);
    bool applyFlightPathState(
        const ApproachScenario& scenario,
        const ApproachEnergyTarget& target,
        std::string& error
    );
    bool isConfigurationComplete(
        const AircraftTelemetry& telemetry,
        const ApproachScenario& scenario,
        std::vector<std::string>& warnings
    ) const;

private:
    SimConnectClient& simconnect_;
    AircraftAdapter& adapter_;
};

}
