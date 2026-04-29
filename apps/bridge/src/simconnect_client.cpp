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

struct DirectAircraftPosition {
    double latitudeDeg = 0.0;
    double longitudeDeg = 0.0;
    double altitudeFt = 0.0;
    double pitchDeg = 0.0;
    double bankDeg = 0.0;
    double headingDeg = 0.0;
};

struct DirectAircraftFlightState {
    double simOnGround = 0.0;
    double trueAirspeedKt = 0.0;
};

const char* simConnectExceptionName(DWORD exception) {
    switch (exception) {
        case SIMCONNECT_EXCEPTION_NONE:
            return "NONE";
        case SIMCONNECT_EXCEPTION_ERROR:
            return "ERROR";
        case SIMCONNECT_EXCEPTION_SIZE_MISMATCH:
            return "SIZE_MISMATCH";
        case SIMCONNECT_EXCEPTION_UNRECOGNIZED_ID:
            return "UNRECOGNIZED_ID";
        case SIMCONNECT_EXCEPTION_UNOPENED:
            return "UNOPENED";
        case SIMCONNECT_EXCEPTION_VERSION_MISMATCH:
            return "VERSION_MISMATCH";
        case SIMCONNECT_EXCEPTION_TOO_MANY_GROUPS:
            return "TOO_MANY_GROUPS";
        case SIMCONNECT_EXCEPTION_NAME_UNRECOGNIZED:
            return "NAME_UNRECOGNIZED";
        case SIMCONNECT_EXCEPTION_TOO_MANY_EVENT_NAMES:
            return "TOO_MANY_EVENT_NAMES";
        case SIMCONNECT_EXCEPTION_EVENT_ID_DUPLICATE:
            return "EVENT_ID_DUPLICATE";
        case SIMCONNECT_EXCEPTION_TOO_MANY_MAPS:
            return "TOO_MANY_MAPS";
        case SIMCONNECT_EXCEPTION_TOO_MANY_OBJECTS:
            return "TOO_MANY_OBJECTS";
        case SIMCONNECT_EXCEPTION_TOO_MANY_REQUESTS:
            return "TOO_MANY_REQUESTS";
        case SIMCONNECT_EXCEPTION_INVALID_DATA_TYPE:
            return "INVALID_DATA_TYPE";
        case SIMCONNECT_EXCEPTION_INVALID_DATA_SIZE:
            return "INVALID_DATA_SIZE";
        case SIMCONNECT_EXCEPTION_DATA_ERROR:
            return "DATA_ERROR";
        case SIMCONNECT_EXCEPTION_INVALID_ARRAY:
            return "INVALID_ARRAY";
        case SIMCONNECT_EXCEPTION_OPERATION_INVALID_FOR_OBJECT_TYPE:
            return "OPERATION_INVALID_FOR_OBJECT_TYPE";
        case SIMCONNECT_EXCEPTION_ILLEGAL_OPERATION:
            return "ILLEGAL_OPERATION";
        case SIMCONNECT_EXCEPTION_INVALID_ENUM:
            return "INVALID_ENUM";
        case SIMCONNECT_EXCEPTION_DEFINITION_ERROR:
            return "DEFINITION_ERROR";
        case SIMCONNECT_EXCEPTION_DUPLICATE_ID:
            return "DUPLICATE_ID";
        case SIMCONNECT_EXCEPTION_DATUM_ID:
            return "DATUM_ID";
        case SIMCONNECT_EXCEPTION_OUT_OF_BOUNDS:
            return "OUT_OF_BOUNDS";
        case SIMCONNECT_EXCEPTION_INTERNAL:
            return "INTERNAL";
        default:
            return "UNKNOWN";
    }
}

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
        directPositionDefinitionRegistered_ = false;
        directFlightStateDefinitionRegistered_ = false;
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

bool SimConnectClient::registerDirectPositionDefinition(std::string& error) {
    if (directPositionDefinitionRegistered_) {
        return true;
    }

    HRESULT result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectPosition),
        "PLANE LATITUDE",
        "degrees"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct latitude data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectPosition),
        "PLANE LONGITUDE",
        "degrees"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct longitude data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectPosition),
        "PLANE ALTITUDE",
        "feet"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct altitude data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectPosition),
        "PLANE PITCH DEGREES",
        "degrees"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct pitch data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectPosition),
        "PLANE BANK DEGREES",
        "degrees"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct bank data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectPosition),
        "PLANE HEADING DEGREES TRUE",
        "degrees"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct heading data definition", result);
        return false;
    }

    directPositionDefinitionRegistered_ = true;
    return true;
}

bool SimConnectClient::registerDirectFlightStateDefinition(std::string& error) {
    if (directFlightStateDefinitionRegistered_) {
        return true;
    }

    HRESULT result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectFlightState),
        "SIM ON GROUND",
        "bool"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct on-ground data definition", result);
        return false;
    }

    result = SimConnect_AddToDataDefinition(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectFlightState),
        "AIRSPEED TRUE RAW",
        "knots"
    );
    if (FAILED(result)) {
        error = hresultMessage("Registering direct airspeed data definition", result);
        return false;
    }

    directFlightStateDefinitionRegistered_ = true;
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

bool SimConnectClient::setUserAircraftInitialPosition(
    const ApproachScenario& scenario,
    std::string& error
) {
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

bool SimConnectClient::setUserAircraftDirectPosition(
    const ApproachScenario& scenario,
    std::string& error
) {
    if (!registerDirectPositionDefinition(error)) {
        return false;
    }

    DirectAircraftPosition position;
    position.latitudeDeg = scenario.spawnLatitudeDeg;
    position.longitudeDeg = scenario.spawnLongitudeDeg;
    position.altitudeFt = scenario.spawnAltitudeFt;
    position.pitchDeg = 0.0;
    position.bankDeg = 0.0;
    position.headingDeg = scenario.spawnHeadingDeg;

    const HRESULT result = SimConnect_SetDataOnSimObject(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectPosition),
        SIMCONNECT_OBJECT_ID_USER,
        0,
        0,
        sizeof(position),
        &position
    );

    if (FAILED(result)) {
        error = hresultMessage("Setting user aircraft direct position", result);
        return false;
    }

    return true;
}

bool SimConnectClient::setUserAircraftDirectFlightState(
    const ApproachScenario& scenario,
    std::string& error
) {
    if (!registerDirectFlightStateDefinition(error)) {
        return false;
    }

    DirectAircraftFlightState flightState;
    flightState.simOnGround = 0;
    flightState.trueAirspeedKt = scenario.airspeedKt;

    const HRESULT result = SimConnect_SetDataOnSimObject(
        simConnect_,
        static_cast<DWORD>(DataDefinitionId::DirectFlightState),
        SIMCONNECT_OBJECT_ID_USER,
        0,
        0,
        sizeof(flightState),
        &flightState
    );

    if (FAILED(result)) {
        error = hresultMessage("Setting user aircraft direct flight state", result);
        return false;
    }

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

    std::string initialPositionError;
    if (!setUserAircraftInitialPosition(scenario, initialPositionError)) {
        std::cerr
            << "Initial aircraft position warning: "
            << initialPositionError
            << std::endl;
    }

    std::string directFlightStateError;
    if (!setUserAircraftDirectFlightState(scenario, directFlightStateError)) {
        std::cerr
            << "Direct aircraft flight state warning: "
            << directFlightStateError
            << std::endl;
    }

    if (!setUserAircraftDirectPosition(scenario, error)) {
        return false;
    }

    directFlightStateError.clear();
    if (!setUserAircraftDirectFlightState(scenario, directFlightStateError)) {
        std::cerr
            << "Direct aircraft flight state warning: "
            << directFlightStateError
            << std::endl;
    }

    std::cout
        << "Requested aircraft reposition: LAT=" << scenario.spawnLatitudeDeg
        << " LON=" << scenario.spawnLongitudeDeg
        << " ALT_FT=" << scenario.spawnAltitudeFt
        << " HDG_DEG=" << scenario.spawnHeadingDeg
        << " TAS_KT=" << scenario.airspeedKt
        << std::endl;

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
    (void)cbData;
    auto* client = static_cast<SimConnectClient*>(context);

    if (client != nullptr) {
        client->handleDispatch(data);
    }
}

void SimConnectClient::handleDispatch(SIMCONNECT_RECV* data) {
    switch (data->dwID) {
        case SIMCONNECT_RECV_ID_EXCEPTION: {
            const auto* exception = reinterpret_cast<SIMCONNECT_RECV_EXCEPTION*>(data);
            std::cerr
                << "SimConnect exception: "
                << simConnectExceptionName(exception->dwException)
                << " (" << exception->dwException << ")"
                << " send_id=" << exception->dwSendID
                << " index=" << exception->dwIndex
                << std::endl;
            break;
        }

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
