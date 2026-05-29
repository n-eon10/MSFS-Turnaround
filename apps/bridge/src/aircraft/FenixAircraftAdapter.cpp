#include "aircraft/FenixAircraftAdapter.hpp"

#include "msfs_turnaround/simconnect_client.hpp"
#include "spawn/ApproachProfiles.hpp"

#include <cmath>

namespace msfs_turnaround {

bool FenixAircraftAdapter::configureForApproach(
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

bool FenixAircraftAdapter::isConfigurationComplete(
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
        warnings.push_back("Fenix adapter cannot verify flap handle index yet");
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

int FenixAircraftAdapter::getTargetFlapConfig(const ApproachScenario& scenario) const {
    return scenario.flapsIndex;
}

double FenixAircraftAdapter::getTargetApproachSpeed(const ApproachScenario& scenario) const {
    return scenario.airspeedKt;
}

ApproachEnergyTarget FenixAircraftAdapter::approachEnergyTarget(
    const ApproachScenario& scenario
) const {
    return makeApproachEnergyTarget(ApproachProfileId::FenixA320, scenario);
}

bool FenixAircraftAdapter::supportsAdvancedConfig() const {
    return false;
}

std::string FenixAircraftAdapter::name() const {
    return "FenixAircraftAdapter";
}

AircraftAdapterCapabilities FenixAircraftAdapter::capabilities() const {
    AircraftAdapterCapabilities capabilities;
    capabilities.canSetGear = true;
    capabilities.canSetFlaps = true;
    capabilities.canVerifyFlaps = true;
    capabilities.canVerifyGear = true;
    return capabilities;
}

}
