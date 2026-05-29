#pragma once

#include "aircraft/AircraftAdapter.hpp"

namespace msfs_turnaround {

class GenericAircraftAdapter final : public AircraftAdapter {
public:
    bool configureForApproach(
        SimConnectClient& simconnect,
        const ApproachScenario& scenario,
        std::string& error
    ) override;

    bool isConfigurationComplete(
        const AircraftTelemetry& telemetry,
        const ApproachScenario& scenario,
        std::vector<std::string>& warnings
    ) const override;

    int getTargetFlapConfig(const ApproachScenario& scenario) const override;
    double getTargetApproachSpeed(const ApproachScenario& scenario) const override;
    ApproachEnergyTarget approachEnergyTarget(
        const ApproachScenario& scenario
    ) const override;
    bool supportsAdvancedConfig() const override;
    std::string name() const override;
    AircraftAdapterCapabilities capabilities() const override;
};

}
