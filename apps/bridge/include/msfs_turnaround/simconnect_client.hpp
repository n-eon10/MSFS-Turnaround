#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <winsock2.h>
#include <windows.h>
#include <SimConnect.h>

#include <functional>
#include <mutex>
#include <string>

namespace msfs_turnaround {

struct ApproachScenario;

class SimConnectClient {
public:
    using TelemetryCallback = std::function<void(const AircraftTelemetry&)>;

    bool connect();
    bool isConnected() const;
    void requestAircraftTelemetry();
    void poll();
    void close();

    bool setUserAircraftPosition(const ApproachScenario& scenario, std::string& error);
    bool setGenericAircraftConfiguration(
        bool gearDown,
        int flapsIndex,
        std::string& error
    );
    bool setPaused(bool paused, std::string& error);

    void setTelemetryCallback(TelemetryCallback callback);

private:
    HANDLE simConnect_ = nullptr;
    TelemetryCallback telemetryCallback_;
    mutable std::recursive_mutex simConnectMutex_;
    bool initialPositionDefinitionRegistered_ = false;
    bool aircraftConfigurationDefinitionRegistered_ = false;

    enum class DataDefinitionId : DWORD {
        AircraftTelemetry = 1,
        InitialPosition = 2,
        AircraftConfiguration = 3,
    };

    enum class DataRequestId : DWORD {
        AircraftTelemetry = 1,
    };

    bool registerInitialPositionDefinition(std::string& error);
    bool registerAircraftConfigurationDefinition(std::string& error);

    static void CALLBACK dispatchProc(SIMCONNECT_RECV* data, DWORD cbData, void* context);
    void handleDispatch(SIMCONNECT_RECV* data);
    void handleAircraftTelemetry(const SIMCONNECT_RECV_SIMOBJECT_DATA* objectData);
};

}
