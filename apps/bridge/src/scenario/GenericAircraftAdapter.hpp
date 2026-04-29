#pragma once

#include "scenario/AircraftAdapter.hpp"

namespace msfs_turnaround {

class GenericAircraftAdapter final : public AircraftAdapter {
public:
    std::string id() const override;
    std::string displayName() const override;

    bool configureForApproach(
        SimConnectClient& simconnect,
        const ApproachScenario& scenario,
        std::string& error
    ) override;
};

}
