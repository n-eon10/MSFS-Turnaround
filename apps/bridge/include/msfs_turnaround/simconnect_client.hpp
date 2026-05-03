#pragma once

#include "aircraft/AircraftIdentity.hpp"
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
    using AircraftIdentityCallback = std::function<void(const AircraftIdentity&)>;

    bool connect();
    bool isConnected() const;
    void requestAircraftTelemetry();
    void requestAircraftIdentity();
    void poll();
    void close();

    bool teleportUserAircraftToInitialPosition(
        const ApproachScenario& scenario,
        std::string& error
    );
    bool stabiliseUserAircraftFlightPath(
        const ApproachScenario& scenario,
        std::string& error
    );
    bool setUserAircraftPosition(const ApproachScenario& scenario, std::string& error);
    bool setGenericAircraftConfiguration(
        bool gearDown,
        int flapsIndex,
        std::string& error
    );
    bool setPaused(bool paused, std::string& error);
    bool setSpawnFreeze(bool enabled, std::string& error);
    bool setSpawnFreezeAxes(
        bool latitudeLongitude,
        bool altitude,
        bool attitude,
        std::string& error
    );

    void setTelemetryCallback(TelemetryCallback callback);
    void setAircraftIdentityCallback(AircraftIdentityCallback callback);

private:
    HANDLE simConnect_ = nullptr;
    TelemetryCallback telemetryCallback_;
    AircraftIdentityCallback aircraftIdentityCallback_;
    mutable std::recursive_mutex simConnectMutex_;
    bool initialPositionDefinitionRegistered_ = false;
    bool directPositionDefinitionRegistered_ = false;
    bool bodyVelocityDefinitionRegistered_ = false;
    bool bodyRotationVelocityDefinitionRegistered_ = false;
    bool aircraftConfigurationDefinitionRegistered_ = false;
    bool aircraftIdentityDefinitionRegistered_ = false;
    bool pauseEventsRegistered_ = false;
    bool freezeEventsRegistered_ = false;

    enum class DataDefinitionId : DWORD {
        AircraftTelemetry = 1,
        InitialPosition = 2,
        AircraftConfiguration = 3,
        DirectPosition = 4,
        BodyVelocity = 5,
        BodyRotationVelocity = 6,
        AircraftIdentity = 7,
    };

    enum class DataRequestId : DWORD {
        AircraftTelemetry = 1,
        AircraftIdentity = 2,
    };

    enum class ClientEventId : DWORD {
        PauseOn = 100,
        PauseOff = 101,
        FreezeLatLonToggle = 102,
        FreezeLatLonSet = 103,
        FreezeAltitudeToggle = 104,
        FreezeAltitudeSet = 105,
        FreezeAttitudeToggle = 106,
        FreezeAttitudeSet = 107,
        GearSet = 108,
        ParkingBrakeSet = 109,
        FlapsUp = 110,
        Flaps1 = 111,
        Flaps2 = 112,
        Flaps3 = 113,
        Flaps4 = 114,
        FlapsSet = 115,
    };

    bool registerInitialPositionDefinition(std::string& error);
    bool registerDirectPositionDefinition(std::string& error);
    bool registerAircraftConfigurationDefinition(std::string& error);
    bool registerAircraftIdentityDefinition(std::string& error);
    bool registerPauseEvents(std::string& error);
    bool registerFreezeEvents(std::string& error);
    bool registerConfigurationEvents(std::string& error);
    bool registerBodyVelocityDefinition(std::string& error);
    bool registerBodyRotationVelocityDefinition(std::string& error);
    bool setUserAircraftInitialPosition(
        const ApproachScenario& scenario,
        std::string& error
    );
    bool setUserAircraftDirectPosition(
        const ApproachScenario& scenario,
        std::string& error
    );
    bool setUserAircraftBodyVelocity(
        const ApproachScenario& scenario,
        std::string& error
    );
    bool setUserAircraftBodyRotationVelocity(std::string& error);
    bool transmitClientEvent(ClientEventId eventId, DWORD data, std::string& error);

    static void CALLBACK dispatchProc(SIMCONNECT_RECV* data, DWORD cbData, void* context);
    void handleDispatch(SIMCONNECT_RECV* data);
    void handleAircraftTelemetry(const SIMCONNECT_RECV_SIMOBJECT_DATA* objectData);
    void handleAircraftIdentity(const SIMCONNECT_RECV_SIMOBJECT_DATA* objectData);
};

}
