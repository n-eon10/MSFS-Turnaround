#pragma once

#include "aircraft/AircraftAdapterCapabilities.hpp"
#include "msfs_turnaround/aircraft_telemetry.hpp"
#include "scenario/ApproachScenario.hpp"
#include "spawn/ApproachEnergyState.hpp"

#include <string>
#include <vector>

namespace msfs_turnaround {

class SimConnectClient;

class AircraftAdapter {
public:
    virtual ~AircraftAdapter() = default;

    virtual bool configureForApproach(
        SimConnectClient& simconnect,
        const ApproachScenario& scenario,
        std::string& error
    ) = 0;

    virtual bool isConfigurationComplete(
        const AircraftTelemetry& telemetry,
        const ApproachScenario& scenario,
        std::vector<std::string>& warnings
    ) const = 0;

    virtual int getTargetFlapConfig(const ApproachScenario& scenario) const = 0;
    virtual double getTargetApproachSpeed(const ApproachScenario& scenario) const = 0;
    virtual ApproachEnergyTarget approachEnergyTarget(
        const ApproachScenario& scenario
    ) const = 0;
    virtual bool supportsAdvancedConfig() const = 0;
    virtual std::string name() const = 0;
    virtual AircraftAdapterCapabilities capabilities() const = 0;
};

}
