#include "spawn/SpawnFreezeController.hpp"

#include "msfs_turnaround/simconnect_client.hpp"

#include <cmath>

namespace msfs_turnaround {

SpawnFreezeController::SpawnFreezeController(SimConnectClient& simconnect)
    : simconnect_(simconnect) {}

bool SpawnFreezeController::freezeAll(std::string& error) {
    return simconnect_.setSpawnFreeze(true, error);
}

bool SpawnFreezeController::setAxes(
    bool latitudeLongitude,
    bool altitude,
    bool attitude,
    std::string& error
) {
    return simconnect_.setSpawnFreezeAxes(latitudeLongitude, altitude, attitude, error);
}

bool SpawnFreezeController::unfreezeAll(std::string& error) {
    return simconnect_.setSpawnFreeze(false, error);
}

bool SpawnFreezeController::hasFreezeTelemetry(const AircraftTelemetry& telemetry) const {
    return std::isfinite(telemetry.latitudeLongitudeFreezeOn) &&
           std::isfinite(telemetry.altitudeFreezeOn) &&
           std::isfinite(telemetry.attitudeFreezeOn);
}

bool SpawnFreezeController::isFreezeConfirmed(const AircraftTelemetry& telemetry) const {
    if (!hasFreezeTelemetry(telemetry)) {
        return false;
    }

    return std::abs(telemetry.latitudeLongitudeFreezeOn) >= 0.5 &&
           std::abs(telemetry.altitudeFreezeOn) >= 0.5 &&
           std::abs(telemetry.attitudeFreezeOn) >= 0.5;
}

}
