#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <winsock2.h>
#include <windows.h>
#include <SimConnect.h>

#include <functional>

namespace msfs_turnaround {

class SimConnectClient {
public:
    using TelemetryCallback = std::function<void(const AircraftTelemetry&)>;

    bool connect();
    void requestAircraftTelemetry();
    void poll();
    void close();

    void setTelemetryCallback(TelemetryCallback callback);

private:
    HANDLE simConnect_ = nullptr;
    TelemetryCallback telemetryCallback_;

    enum class DataDefinitionId : DWORD {
        AircraftTelemetry = 1,
    };

    enum class DataRequestId : DWORD {
        AircraftTelemetry = 1,
    };

    static void CALLBACK dispatchProc(SIMCONNECT_RECV* data, DWORD cbData, void* context);
    void handleDispatch(SIMCONNECT_RECV* data);
    void handleAircraftTelemetry(const SIMCONNECT_RECV_SIMOBJECT_DATA* objectData);
};

}