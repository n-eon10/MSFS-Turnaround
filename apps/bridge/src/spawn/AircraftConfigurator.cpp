#include "spawn/AircraftConfigurator.hpp"

#include "aircraft/AircraftAdapter.hpp"
#include "msfs_turnaround/simconnect_client.hpp"

namespace msfs_turnaround {

AircraftConfigurator::AircraftConfigurator(
    SimConnectClient& simconnect,
    AircraftAdapter& adapter
)
    : simconnect_(simconnect),
      adapter_(adapter) {}

bool AircraftConfigurator::applyPhysicalConfiguration(
    const ApproachScenario& scenario,
    std::string& error
) {
    return adapter_.configureForApproach(simconnect_, scenario, error);
}

bool AircraftConfigurator::applyFlightPathState(
    const ApproachScenario& scenario,
    const ApproachEnergyTarget& target,
    std::string& error
) {
    return simconnect_.stabiliseUserAircraftFlightPath(scenario, target, error);
}

bool AircraftConfigurator::isConfigurationComplete(
    const AircraftTelemetry& telemetry,
    const ApproachScenario& scenario,
    std::vector<std::string>& warnings
) const {
    return adapter_.isConfigurationComplete(telemetry, scenario, warnings);
}

}
