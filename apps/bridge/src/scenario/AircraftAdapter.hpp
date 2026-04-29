#pragma once

#include "scenario/ApproachScenario.hpp"

#include <string>

namespace msfs_turnaround {

class SimConnectClient;

class AircraftAdapter {
public:
    virtual ~AircraftAdapter() = default;

    virtual std::string id() const = 0;
    virtual std::string displayName() const = 0;

    virtual bool configureForApproach(
        SimConnectClient& simconnect,
        const ApproachScenario& scenario,
        std::string& error
    ) = 0;
};

}
