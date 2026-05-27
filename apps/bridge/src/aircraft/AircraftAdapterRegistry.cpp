#include "aircraft/AircraftAdapterRegistry.hpp"

#include <algorithm>
#include <cctype>
#include <iostream>
#include <utility>

namespace msfs_turnaround {
namespace {

std::string lowercase(std::string value) {
    std::transform(
        value.begin(),
        value.end(),
        value.begin(),
        [](unsigned char character) {
            return static_cast<char>(std::tolower(character));
        }
    );
    return value;
}

bool contains(const std::string& value, const std::string& needle) {
    return lowercase(value).find(needle) != std::string::npos;
}

}

AircraftAdapterRegistry::AircraftAdapterRegistry()
    : activeAdapter_(&genericAdapter_) {}

void AircraftAdapterRegistry::reset() {
    std::lock_guard<std::mutex> lock(mutex_);
    identity_ = AircraftIdentity {};
    hasIdentity_ = false;
    activeAdapter_ = &genericAdapter_;
}

bool AircraftAdapterRegistry::updateIdentity(const AircraftIdentity& identity) {
    const AircraftIdentity classified = classifyIdentity(identity);
    std::lock_guard<std::mutex> lock(mutex_);
    const bool changed = !hasIdentity_ || classified != identity_;

    identity_ = classified;
    hasIdentity_ = true;
    activeAdapter_ = identity_.detectedFamily == "fenix"
        ? static_cast<AircraftAdapter*>(&fenixAdapter_)
        : static_cast<AircraftAdapter*>(&genericAdapter_);

    if (changed) {
        std::cout
            << "[AircraftAdapterRegistry] aircraft title='" << identity_.title
            << "' atcType='" << identity_.atcType
            << "' atcModel='" << identity_.atcModel
            << "' family='" << identity_.detectedFamily
            << "' variant='" << identity_.detectedVariant
            << "' adapter='" << activeAdapter_->name()
            << "'"
            << std::endl;
    }

    return changed;
}

AircraftIdentity AircraftAdapterRegistry::identity() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return identity_;
}

bool AircraftAdapterRegistry::configureForApproach(
    SimConnectClient& simconnect,
    const ApproachScenario& scenario,
    std::string& error
) {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeAdapter_->configureForApproach(simconnect, scenario, error);
}

bool AircraftAdapterRegistry::isConfigurationComplete(
    const AircraftTelemetry& telemetry,
    const ApproachScenario& scenario,
    std::vector<std::string>& warnings
) const {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeAdapter_->isConfigurationComplete(telemetry, scenario, warnings);
}

int AircraftAdapterRegistry::getTargetFlapConfig(const ApproachScenario& scenario) const {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeAdapter_->getTargetFlapConfig(scenario);
}

double AircraftAdapterRegistry::getTargetApproachSpeed(const ApproachScenario& scenario) const {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeAdapter_->getTargetApproachSpeed(scenario);
}

bool AircraftAdapterRegistry::supportsAdvancedConfig() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeAdapter_->supportsAdvancedConfig();
}

std::string AircraftAdapterRegistry::name() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeAdapter_->name();
}

AircraftAdapterCapabilities AircraftAdapterRegistry::capabilities() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return activeAdapter_->capabilities();
}

AircraftIdentity AircraftAdapterRegistry::classifyIdentity(AircraftIdentity identity) const {
    identity = normalizeAircraftIdentity(std::move(identity));
    const std::string combined = identity.title + " " + identity.atcType + " " + identity.atcModel;

    // Extension points for future adapters:
    // FenixA320Adapter, Pmdg737Adapter, FBWA32NXAdapter, IniBuildsAdapter.
    if (contains(combined, "fenix")) {
        identity.detectedFamily = "fenix";
        if (contains(combined, "a319")) {
            identity.detectedVariant = "a319";
        } else if (contains(combined, "a320")) {
            identity.detectedVariant = "a320";
        } else if (contains(combined, "a321")) {
            identity.detectedVariant = "a321";
        } else {
            identity.detectedVariant = "unknown";
        }
        identity.isKnownAircraft = true;
        return identity;
    }

    if (contains(combined, "pmdg")) {
        identity.detectedFamily = "pmdg";
        identity.detectedVariant = contains(combined, "737") ? "737" : "unknown";
        identity.isKnownAircraft = true;
        return identity;
    }

    if (contains(combined, "flybywire") || contains(combined, "fbw")) {
        identity.detectedFamily = "fbw";
        identity.detectedVariant = contains(combined, "a32nx") ? "a32nx" : "unknown";
        identity.isKnownAircraft = true;
        return identity;
    }

    if (contains(combined, "inibuilds") || contains(combined, "ini builds")) {
        identity.detectedFamily = "inibuilds";
        identity.detectedVariant = "unknown";
        identity.isKnownAircraft = true;
        return identity;
    }

    identity.detectedFamily = "generic";
    identity.detectedVariant = "unknown";
    identity.isKnownAircraft = false;
    return identity;
}

}
