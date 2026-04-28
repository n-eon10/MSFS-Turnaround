#include <windows.h>
#include <SimConnect.h>

#include <chrono>
#include <iostream>
#include <thread>

enum class DataDefinitionId {
    AircraftTelemetry = 1,
};

enum class DataRequestId {
    AircraftTelemetry = 1,
};

struct AircraftTelemetry {
    double latitudeDeg;
    double longitudeDeg;
    double altitudeFt;
    double indicatedAirspeedKt;
    double verticalSpeedFpm;
    double headingDeg;
    double gearHandlePosition;
    double flapsHandleIndex;
    double simOnGround;
};

void CALLBACK dispatchProc(SIMCONNECT_RECV* data, DWORD cbData, void* context) {
    switch (data->dwID) {
        case SIMCONNECT_RECV_ID_SIMOBJECT_DATA: {
            auto* objectData = reinterpret_cast<SIMCONNECT_RECV_SIMOBJECT_DATA*>(data);

            if (objectData->dwRequestID == static_cast<DWORD>(DataRequestId::AircraftTelemetry)) {
                const auto* telemetry = reinterpret_cast<AircraftTelemetry*>(&objectData->dwData);

                std::cout
                    << "LAT=" << telemetry->latitudeDeg
                    << " LON=" << telemetry->longitudeDeg
                    << " ALT_FT=" << telemetry->altitudeFt
                    << " IAS_KT=" << telemetry->indicatedAirspeedKt
                    << " VS_FPM=" << telemetry->verticalSpeedFpm
                    << " HDG_DEG=" << telemetry->headingDeg
                    << " GEAR=" << telemetry->gearHandlePosition
                    << " FLAPS=" << telemetry->flapsHandleIndex
                    << " ON_GROUND=" << telemetry->simOnGround
                    << std::endl;
            }

            break;
        }

        case SIMCONNECT_RECV_ID_QUIT:
            std::cout << "MSFS closed." << std::endl;
            break;

        default:
            break;
    }
}

int main() {
    std::cout << "MSFS Turnaround Bridge starting..." << std::endl;

    HANDLE simConnect = nullptr;

    HRESULT result = SimConnect_Open(
        &simConnect,
        "MSFS Turnaround Bridge",
        nullptr,
        0,
        nullptr,
        0
    );

    if (FAILED(result)) {
        std::cerr << "Failed to connect to MSFS via SimConnect." << std::endl;
        std::cerr << "HRESULT: 0x" << std::hex << result << std::endl;
        return 1;
    }

    std::cout << "Connected to MSFS via SimConnect." << std::endl;

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE LATITUDE",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE LONGITUDE",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE ALTITUDE",
        "feet"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "AIRSPEED INDICATED",
        "knots"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "VERTICAL SPEED",
        "feet per minute"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE HEADING DEGREES TRUE",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "GEAR HANDLE POSITION",
        "bool"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "FLAPS HANDLE INDEX",
        "number"
    );

    SimConnect_AddToDataDefinition(
        simConnect,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "SIM ON GROUND",
        "bool"
    );

    SimConnect_RequestDataOnSimObject(
        simConnect,
        static_cast<DWORD>(DataRequestId::AircraftTelemetry),
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        SIMCONNECT_OBJECT_ID_USER,
        SIMCONNECT_PERIOD_SECOND,
        SIMCONNECT_DATA_REQUEST_FLAG_CHANGED
    );

    std::cout << "Streaming telemetry. Press Ctrl+C to stop." << std::endl;

    while (true) {
        SimConnect_CallDispatch(simConnect, dispatchProc, nullptr);
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }

    SimConnect_Close(simConnect);
    return 0;
}