#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"

#include <string>

namespace msfs_turnaround {

class SimConnectClient;

class SpawnFreezeController {
public:
    explicit SpawnFreezeController(SimConnectClient& simconnect);

    bool freezeAll(std::string& error);
    bool setAxes(bool latitudeLongitude, bool altitude, bool attitude, std::string& error);
    bool unfreezeAll(std::string& error);
    bool isFreezeConfirmed(const AircraftTelemetry& telemetry) const;
    bool hasFreezeTelemetry(const AircraftTelemetry& telemetry) const;

private:
    SimConnectClient& simconnect_;
};

}
