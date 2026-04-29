#include "msfs_turnaround/simconnect_client.hpp"
#include <utility>

#include <cmath>
#include <iostream>

namespace msfs_turnaround {
namespace {

constexpr double RadiansToDegrees = 180.0 / 3.14159265358979323846;

double normalizeDegrees(double degrees) {
    double normalized = std::fmod(degrees, 360.0);
    if (normalized < 0.0) {
        normalized += 360.0;
    }

    return normalized;
}

double radiansToDegrees(double radians) {
    return radians * RadiansToDegrees;
}

}

bool SimConnectClient::connect() {
    HRESULT result = SimConnect_Open(
        &simConnect_,
        "MSFS Turnaround Bridge",
        nullptr,
        0,
        nullptr,
        0
    );

    if (FAILED(result)) {
        std::cerr << "Failed to connect to MSFS via SimConnect." << std::endl;
        std::cerr << "HRESULT: 0x" << std::hex << result << std::endl;
        return false;
    }

    std::cout << "Connected to MSFS via SimConnect." << std::endl;
    return true;
}

void SimConnectClient::requestAircraftTelemetry() {
    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE LATITUDE",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE LONGITUDE",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE ALTITUDE",
        "feet"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "AIRSPEED INDICATED",
        "knots"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "VERTICAL SPEED",
        "feet per minute"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE HEADING DEGREES TRUE",
        "radians"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "GEAR HANDLE POSITION",
        "bool"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "FLAPS HANDLE INDEX",
        "number"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "SIM ON GROUND",
        "bool"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "GROUND VELOCITY",
        "knots"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE ALT ABOVE GROUND MINUS CG",
        "feet"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE PITCH DEGREES",
        "radians"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE BANK DEGREES",
        "radians"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "G FORCE",
        "GForce"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE TOUCHDOWN NORMAL VELOCITY",
        "feet per second"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE TOUCHDOWN PITCH DEGREES",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE TOUCHDOWN BANK DEGREES",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE TOUCHDOWN HEADING DEGREES TRUE",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE TOUCHDOWN LATITUDE",
        "degrees"
    );

    SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        "PLANE TOUCHDOWN LONGITUDE",
        "degrees"
    );

    SimConnect_RequestDataOnSimObject(
        simConnect_,
        static_cast<DWORD>(DataRequestId::AircraftTelemetry),
        static_cast<DWORD>(DataDefinitionId::AircraftTelemetry),
        SIMCONNECT_OBJECT_ID_USER,
        SIMCONNECT_PERIOD_SIM_FRAME,
        SIMCONNECT_DATA_REQUEST_FLAG_DEFAULT,
        0,
        3,
        0
    );
}

void SimConnectClient::poll() {
    if (simConnect_ == nullptr) {
        return;
    }

    SimConnect_CallDispatch(simConnect_, dispatchProc, this);
}

void SimConnectClient::close() {
    if (simConnect_ != nullptr) {
        SimConnect_Close(simConnect_);
        simConnect_ = nullptr;
    }
}

void CALLBACK SimConnectClient::dispatchProc(SIMCONNECT_RECV* data, DWORD cbData, void* context) {
    auto* client = static_cast<SimConnectClient*>(context);

    if (client != nullptr) {
        client->handleDispatch(data);
    }
}

void SimConnectClient::handleDispatch(SIMCONNECT_RECV* data) {
    switch (data->dwID) {
        case SIMCONNECT_RECV_ID_SIMOBJECT_DATA: {
            const auto* objectData = reinterpret_cast<SIMCONNECT_RECV_SIMOBJECT_DATA*>(data);

            if (objectData->dwRequestID == static_cast<DWORD>(DataRequestId::AircraftTelemetry)) {
                handleAircraftTelemetry(objectData);
            }

            break;
        }

        case SIMCONNECT_RECV_ID_QUIT:
            std::cout << "MSFS closed." << std::endl;
            close();
            break;

        default:
            break;
    }
}

void SimConnectClient::handleAircraftTelemetry(const SIMCONNECT_RECV_SIMOBJECT_DATA* objectData) {
    const auto* rawTelemetry = reinterpret_cast<const AircraftTelemetry*>(&objectData->dwData);
    AircraftTelemetry telemetry = *rawTelemetry;
    telemetry.headingDeg = normalizeDegrees(radiansToDegrees(rawTelemetry->headingDeg));
    telemetry.pitchDeg = radiansToDegrees(rawTelemetry->pitchDeg);
    telemetry.bankDeg = radiansToDegrees(rawTelemetry->bankDeg);

    if (telemetryCallback_) {
        telemetryCallback_(telemetry);
    }

    static int logCounter = 0;
    ++logCounter;
    if (logCounter % 100 != 0) {
        return;
    }

    std::cout
        << "LAT=" << telemetry.latitudeDeg
        << " LON=" << telemetry.longitudeDeg
        << " ALT_FT=" << telemetry.altitudeFt
        << " IAS_KT=" << telemetry.indicatedAirspeedKt
        << " VS_FPM=" << telemetry.verticalSpeedFpm
        << " HDG_DEG=" << telemetry.headingDeg
        << " GEAR=" << telemetry.gearHandlePosition
        << " FLAPS=" << telemetry.flapsHandleIndex
        << " ON_GROUND=" << telemetry.simOnGround
        << " GS_KT=" << telemetry.groundSpeedKt
        << " AGL_FT=" << telemetry.altitudeAboveGroundFt
        << " PITCH_DEG=" << telemetry.pitchDeg
        << " BANK_DEG=" << telemetry.bankDeg
        << " G=" << telemetry.gForce
        << std::endl;
}

void SimConnectClient::setTelemetryCallback(TelemetryCallback callback) {
    telemetryCallback_ = std::move(callback);
}

}
