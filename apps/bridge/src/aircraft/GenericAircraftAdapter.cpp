#include "aircraft/GenericAircraftAdapter.hpp"

#include "msfs_turnaround/simconnect_client.hpp"

#include <cmath>

namespace msfs_turnaround {

bool GenericAircraftAdapter::configureForApproach(
    SimConnectClient& simconnect,
    const ApproachScenario& scenario,
    std::string& error
) {
    return simconnect.setGenericAircraftConfiguration(
        scenario.gearDown,
        scenario.flapsIndex,
        error
    );
}

bool GenericAircraftAdapter::isConfigurationComplete(
    const AircraftTelemetry& telemetry,
    const ApproachScenario& scenario,
    std::vector<std::string>& warnings
) const {
    bool complete = true;

    if (scenario.gearDown &&
        (!std::isfinite(telemetry.gearHandlePosition) ||
         telemetry.gearHandlePosition < 0.5)) {
        complete = false;
    }

    if (!std::isfinite(telemetry.flapsHandleIndex)) {
        warnings.push_back("Generic adapter cannot verify flap handle index yet");
        return false;
    }

    if (std::abs(
            telemetry.flapsHandleIndex -
            static_cast<double>(getTargetFlapConfig(scenario))
        ) > 0.5) {
        complete = false;
    }

    return complete;
}

int GenericAircraftAdapter::getTargetFlapConfig(const ApproachScenario& scenario) const {
    return scenario.flapsIndex;
}

double GenericAircraftAdapter::getTargetApproachSpeed(const ApproachScenario& scenario) const {
    return scenario.airspeedKt;
}

bool GenericAircraftAdapter::supportsAdvancedConfig() const {
    return false;
}

std::string GenericAircraftAdapter::name() const {
    return "Generic SimConnect Aircraft";
}

}
