#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"

#include <windows.h>
#include <SimConnect.h>

namespace msfs_turnaround {

class SimConnectClient {
public:
    bool connect();
    void requestAircraftTelemetry();
    void poll();
    void close();

private:
    HANDLE simConnect_ = nullptr;

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