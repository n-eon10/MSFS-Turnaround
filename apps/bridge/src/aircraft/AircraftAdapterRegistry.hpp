#pragma once

#include "aircraft/AircraftAdapter.hpp"
#include "aircraft/AircraftIdentity.hpp"
#include "aircraft/GenericAircraftAdapter.hpp"

#include <mutex>

namespace msfs_turnaround {

class AircraftAdapterRegistry final : public AircraftAdapter {
public:
    AircraftAdapterRegistry();

    void reset();
    bool updateIdentity(const AircraftIdentity& identity);
    AircraftIdentity identity() const;

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
    bool supportsAdvancedConfig() const override;
    std::string name() const override;
    AircraftAdapterCapabilities capabilities() const override;

private:
    AircraftIdentity classifyIdentity(AircraftIdentity identity) const;

    mutable std::mutex mutex_;
    GenericAircraftAdapter genericAdapter_;
    AircraftAdapter* activeAdapter_ = nullptr;
    AircraftIdentity identity_;
    bool hasIdentity_ = false;
};

}
