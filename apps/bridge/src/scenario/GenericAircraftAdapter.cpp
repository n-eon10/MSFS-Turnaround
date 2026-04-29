#include "scenario/GenericAircraftAdapter.hpp"

#include "msfs_turnaround/simconnect_client.hpp"

namespace msfs_turnaround {

std::string GenericAircraftAdapter::id() const {
    return "generic";
}

std::string GenericAircraftAdapter::displayName() const {
    return "Generic SimConnect Aircraft";
}

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

}
