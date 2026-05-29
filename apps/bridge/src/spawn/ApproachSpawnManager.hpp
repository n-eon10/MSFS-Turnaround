#pragma once

#include "aircraft/AircraftAdapter.hpp"
#include "navdata/RunwayEnd.hpp"
#include "scenario/ApproachScenario.hpp"
#include "spawn/AircraftConfigurator.hpp"
#include "spawn/ApproachSpawnStateMachine.hpp"
#include "spawn/ReleaseController.hpp"
#include "spawn/SpawnFreezeController.hpp"
#include "spawn/SpawnReadinessChecker.hpp"

#include <chrono>
#include <functional>
#include <mutex>
#include <optional>
#include <string>
#include <vector>

namespace msfs_turnaround {

class ScenarioSpawner;
class SimConnectClient;

struct SpawnStatus {
    ApproachSpawnState state = ApproachSpawnState::Idle;
    std::string message;
    std::string airportIdent;
    std::string runwayIdent;
    bool readyToRelease = false;
    std::vector<std::string> warnings;

    bool hasEnergyDiagnostics = false;
    ApproachEnergyTarget energyTarget;
    ApproachEnergyState energyState;
    long long stabilizationElapsedMs = 0;
};

class ApproachSpawnManager {
public:
    using StatusCallback = std::function<void(const SpawnStatus&)>;

    ApproachSpawnManager(
        ScenarioSpawner& scenarioSpawner,
        SimConnectClient& simconnect,
        AircraftAdapter& aircraftAdapter
    );

    void setStatusCallback(StatusCallback callback);

    ScenarioSpawnResult start(
        const ApproachScenarioRequest& request,
        const std::optional<RunwayEnd>& activeRunway,
        std::optional<RunwayEnd>& selectedRunway
    );

    void tick(const AircraftTelemetry& telemetry);
    bool requestRelease(std::string& error);
    bool cancel(std::string& error);
    bool isActive() const;
    ApproachSpawnState state() const;

private:
    void transition(ApproachSpawnState next, const std::string& message);
    void emitStatus();
    void fail(const std::string& reason);
    bool totalTimeoutExpired() const;
    bool elapsedSinceState(std::chrono::milliseconds duration) const;
    void appendWarningOnce(const std::string& warning);

    ScenarioSpawner& scenarioSpawner_;
    SimConnectClient& simconnect_;
    AircraftAdapter& aircraftAdapter_;
    SpawnFreezeController freezeController_;
    AircraftConfigurator configurator_;
    ReleaseController releaseController_;
    SpawnReadinessChecker readinessChecker_;

    mutable std::mutex mutex_;
    StatusCallback statusCallback_;
    ApproachSpawnStateMachine stateMachine_;
    ApproachScenario scenario_;
    ApproachEnergyTarget energyTarget_;
    ApproachEnergyState energyState_;
    std::string statusMessage_;
    std::vector<std::string> warnings_;
    bool hasScenario_ = false;
    bool freezeConfirmedOrAssumed_ = false;
    bool holdActive_ = false;
    bool configurationTimedOut_ = false;
    bool physicalConfigCommandSent_ = false;
    bool flightPathCommandSent_ = false;
    bool releaseRequested_ = false;
    bool energyStable_ = false;
    int configAttempts_ = 0;
    std::chrono::steady_clock::time_point spawnStartedAt_ {};
    std::chrono::steady_clock::time_point stateStartedAt_ {};
    std::chrono::steady_clock::time_point lastConfigAttemptAt_ {};
    std::chrono::steady_clock::time_point stabiliseStartedAt_ {};
    std::chrono::steady_clock::time_point energyStableSince_ {};
};

}
