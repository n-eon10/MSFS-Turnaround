#include "msfs_turnaround/simconnect_client.hpp"
#include "scenario/ApproachScenario.hpp"

#include <utility>

#include <cmath>
#include <iomanip>
#include <iostream>
#include <sstream>

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

std::string hresultMessage(const char* operation, HRESULT result) {
    std::ostringstream stream;
    stream
        << operation
        << " failed with HRESULT 0x"
        << std::hex
        << std::uppercase
        << static_cast<unsigned long>(result);
    return stream.str();
}

struct GenericAircraftConfiguration {
    double parkingBrakePosition = 0.0;
    double gearHandlePosition = 0.0;
    double flapsHandleIndex = 0.0;
};

}

bool SimConnectClient::connect() {
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    if (simConnect_ != nullptr) {
        return true;
    }

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

bool SimConnectClient::isConnected() const {
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    return simConnect_ != nullptr;
}

void SimConnectClient::requestAircraftTelemetry() {
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    if (simConnect_ == nullptr) {
        return;
    }

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
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    if (simConnect_ == nullptr) {
        return;
    }

    SimConnect_CallDispatch(simConnect_, dispatchProc, this);
}

void SimConnectClient::close() {
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    if (simConnect_ != nullptr) {
        SimConnect_Close(simConnect_);
        simConnect_ = nullptr;
        initialPositionDefinitionRegistered_ = false;
        aircraftConfigurationDefinitionRegistered_ = false;
    }
}

bool SimConnectClient::registerInitialPositionDefinition(std::string& error) {
    if (initialPositionDefinitionRegistered_) {
        return true;
    }

    const HRESULT result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::InitialPosition),
        "Initial Position",
        "NULL",
        SIMCONNECT_DATATYPE_INITPOSITION
    );

    if (FAILED(result)) {
        error = hresultMessage("Registering initial position data definition", result);
        return false;
    }

    initialPositionDefinitionRegistered_ = true;
    return true;
}

bool SimConnectClient::registerAircraftConfigurationDefinition(std::string& error) {
    if (aircraftConfigurationDefinitionRegistered_) {
        return true;
    }

    HRESULT result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftConfiguration),
        "BRAKE PARKING POSITION",
        "bool"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering parking brake data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftConfiguration),
        "GEAR HANDLE POSITION",
        "bool"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering gear handle data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftConfiguration),
        "FLAPS HANDLE INDEX",
        "number"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering flaps handle data definition", result);
        return false;
    }

    aircraftConfigurationDefinitionRegistered_ = true;
    return true;
}

bool SimConnectClient::setUserAircraftPosition(
    const ApproachScenario& scenario,
    std::string& error
) {
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    if (simConnect_ == nullptr) {
        error = "MSFS is not connected";
        return false;
    }

    if (!registerInitialPositionDefinition(error)) {
        return false;
    }

    SIMCONNECT_DATA_INITPOSITION position {};
    position.Latitude = scenario.spawnLatitudeDeg;
    position.Longitude = scenario.spawnLongitudeDeg;
    position.Altitude = scenario.spawnAltitudeFt;
    position.Pitch = 0.0;
    position.Bank = 0.0;
    position.Heading = scenario.spawnHeadingDeg;
    position.OnGround = 0;
    position.Airspeed = static_cast<DWORD>(std::lround(scenario.airspeedKt));

    const HRESULT result = SimConnect_SetDataOnSimObject(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::InitialPosition),
        SIMCONNECT_OBJECT_ID_USER,
        0,
        0,
        sizeof(position),
        &position
    );

    if (FAILED(result)) {
        error = hresultMessage("Setting user aircraft initial position", result);
        return false;
    }

    return true;
}

bool SimConnectClient::setGenericAircraftConfiguration(
    bool gearDown,
    int flapsIndex,
    std::string& error
) {
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    if (simConnect_ == nullptr) {
        error = "MSFS is not connected";
        return false;
    }

    if (!registerAircraftConfigurationDefinition(error)) {
        return false;
    }

    GenericAircraftConfiguration configuration;
    configuration.parkingBrakePosition = 0.0;
    configuration.gearHandlePosition = gearDown ? 1.0 : 0.0;
    configuration.flapsHandleIndex = static_cast<double>(flapsIndex);

    const HRESULT result = SimConnect_SetDataOnSimObject(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::AircraftConfiguration),
        SIMCONNECT_OBJECT_ID_USER,
        0,
        0,
        sizeof(configuration),
        &configuration
    );

    if (FAILED(result)) {
        error = hresultMessage("Setting generic aircraft approach configuration", result);
        return false;
    }

    return true;
}

bool SimConnectClient::setPaused(bool paused, std::string& error) {
    std::lock_guard<std::recursive_mutex> lock(simConnectMutex_);
    if (simConnect_ == nullptr) {
        error = "MSFS is not connected";
        return false;
    }

    const HRESULT result = SimConnect_SetSystemState(
        simConnect_,
        "Pause",
        paused ? 1 : 0,
        0.0f,
        nullptr
    );

    if (FAILED(result)) {
        error = hresultMessage(paused ? "Pausing simulator" : "Unpausing simulator", result);
        return false;
    }

    return true;
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
