#include "spawn/ApproachSpawnManager.hpp"

#include "approach/Geo.hpp"
#include "msfs_turnaround/simconnect_client.hpp"
#include "scenario/ScenarioSpawner.hpp"

#include <algorithm>
#include <iostream>
#include <utility>

namespace msfs_turnaround {
namespace {

constexpr auto FreezeConfirmationTimeout = std::chrono::milliseconds(2000);
constexpr auto ConfigRetryInterval = std::chrono::milliseconds(750);
constexpr auto ConfigMinimumVerificationTime = std::chrono::milliseconds(1000);
constexpr auto ConfigurationTimeout = std::chrono::milliseconds(8500);
constexpr auto StabilisationMinimumTime = std::chrono::milliseconds(1200);
constexpr auto StabilisationTimeout = std::chrono::milliseconds(6500);
constexpr auto TotalSpawnTimeout = std::chrono::milliseconds(30000);

bool isTerminalOrIdle(ApproachSpawnState state) {
    return state == ApproachSpawnState::Idle ||
           state == ApproachSpawnState::Flying ||
           state == ApproachSpawnState::Failed;
}

ScenarioSpawnResult busyResult(const ApproachScenarioRequest& request) {
    ScenarioSpawnResult result;
    result.ok = false;
    result.error = "Spawn is already active";
    result.airportIdent = request.airportIdent;
    result.runwayIdent = request.runwayIdent;
    result.distanceNm = request.distanceNm;
    result.glidepathDeg = request.glidepathDeg;
    result.airspeedKt = request.airspeedKt;
    result.gearRequested = request.gearDown;
    result.flapsRequested = request.flapsIndex > 0;
    return result;
}

}

ApproachSpawnManager::ApproachSpawnManager(
    ScenarioSpawner& scenarioSpawner,
    SimConnectClient& simconnect,
    AircraftAdapter& aircraftAdapter
)
    : scenarioSpawner_(scenarioSpawner),
      simconnect_(simconnect),
      freezeController_(simconnect),
      configurator_(simconnect, aircraftAdapter),
      releaseController_(freezeController_) {}

void ApproachSpawnManager::setStatusCallback(StatusCallback callback) {
    std::lock_guard<std::mutex> lock(mutex_);
    statusCallback_ = std::move(callback);
}

ScenarioSpawnResult ApproachSpawnManager::start(
    const ApproachScenarioRequest& request,
    const std::optional<RunwayEnd>& activeRunway,
    std::optional<RunwayEnd>& selectedRunway
) {
    std::lock_guard<std::mutex> lock(mutex_);

    if (holdActive_) {
        auto result = busyResult(request);
        result.error = "Spawn hold is still active; cancel/unfreeze before starting another spawn";
        return result;
    }

    if (!isTerminalOrIdle(stateMachine_.state())) {
        return busyResult(request);
    }

    hasScenario_ = false;
    warnings_.clear();
    freezeConfirmedOrAssumed_ = false;
    holdActive_ = false;
    configurationTimedOut_ = false;
    physicalConfigCommandSent_ = false;
    flightPathCommandSent_ = false;
    airspeedRefreshSent_ = false;
    releaseRequested_ = false;
    configAttempts_ = 0;

    ApproachScenario preparedScenario;
    auto result = scenarioSpawner_.prepareFinal(
        request,
        activeRunway,
        selectedRunway,
        &preparedScenario
    );

    if (!result.ok) {
        scenario_ = preparedScenario;
        transition(ApproachSpawnState::Failed, result.error.empty() ? "Spawn failed" : result.error);
        return result;
    }

    scenario_ = preparedScenario;
    warnings_ = result.warnings;
    hasScenario_ = true;
    spawnStartedAt_ = std::chrono::steady_clock::now();
    transition(ApproachSpawnState::CalculateFinalPosition, "Calculating selected runway final position");
    return result;
}

void ApproachSpawnManager::tick(const AircraftTelemetry& telemetry) {
    std::lock_guard<std::mutex> lock(mutex_);

    if (!hasScenario_ || isTerminalOrIdle(stateMachine_.state())) {
        return;
    }

    if (totalTimeoutExpired() &&
        stateMachine_.state() != ApproachSpawnState::ReadyToRelease &&
        stateMachine_.state() != ApproachSpawnState::SmoothRelease) {
        fail("Total spawn timeout expired");
        return;
    }

    switch (stateMachine_.state()) {
        case ApproachSpawnState::CalculateFinalPosition:
            transition(
                ApproachSpawnState::TeleportWithInitPosition,
                "Final position calculated; preparing initial-position teleport"
            );
            return;

        case ApproachSpawnState::TeleportWithInitPosition: {
            std::string error;
            if (!simconnect_.teleportUserAircraftToInitialPosition(scenario_, error)) {
                fail(error);
                return;
            }

            if (!freezeController_.freezeAll(error)) {
                fail(error);
                return;
            }
            holdActive_ = true;

            transition(
                ApproachSpawnState::FreezeHold,
                "Teleport sent; freeze hold requested"
            );
            return;
        }

        case ApproachSpawnState::FreezeHold:
            if (freezeController_.isFreezeConfirmed(telemetry)) {
                freezeConfirmedOrAssumed_ = true;
                transition(
                    ApproachSpawnState::ConfigureAircraft,
                    "Freeze confirmed; configuring aircraft"
                );
                return;
            }

            if (elapsedSinceState(FreezeConfirmationTimeout)) {
                freezeConfirmedOrAssumed_ = true;
                appendWarningOnce("Freeze SimVars were not confirmed before timeout; continuing with requested hold");
                transition(
                    ApproachSpawnState::ConfigureAircraft,
                    "Freeze confirmation timed out; configuring aircraft with warning"
                );
                return;
            }
            return;

        case ApproachSpawnState::ConfigureAircraft: {
            const double positionErrorNm = geo::haversineDistanceNm(
                telemetry.latitudeDeg,
                telemetry.longitudeDeg,
                scenario_.spawnLatitudeDeg,
                scenario_.spawnLongitudeDeg
            );
            const bool telemetryAtSpawn =
                std::isfinite(positionErrorNm) &&
                positionErrorNm <= 0.75 &&
                std::isfinite(telemetry.simOnGround) &&
                std::abs(telemetry.simOnGround) < 0.5;
            const bool configVerificationAllowed =
                physicalConfigCommandSent_ &&
                telemetryAtSpawn &&
                elapsedSinceState(ConfigMinimumVerificationTime);

            std::vector<std::string> configWarnings;
            const bool complete = configurator_.isConfigurationComplete(
                telemetry,
                scenario_,
                configWarnings
            );
            for (const auto& warning : configWarnings) {
                appendWarningOnce(warning);
            }

            if (complete && configVerificationAllowed) {
                transition(
                    ApproachSpawnState::StabiliseSimState,
                    "Aircraft configuration verified; stabilising sim state"
                );
                return;
            }

            const auto now = std::chrono::steady_clock::now();
            if (!physicalConfigCommandSent_ ||
                now - lastConfigAttemptAt_ >= ConfigRetryInterval) {
                std::string error;
                if (!configurator_.applyPhysicalConfiguration(scenario_, error)) {
                    appendWarningOnce(error);
                }
                physicalConfigCommandSent_ = true;
                lastConfigAttemptAt_ = now;
                ++configAttempts_;
            }

            if (elapsedSinceState(ConfigurationTimeout)) {
                configurationTimedOut_ = true;
                appendWarningOnce("Gear/flap configuration timed out; continuing if readiness checks are safe enough");
                transition(
                    ApproachSpawnState::StabiliseSimState,
                    "Configuration timeout reached; stabilising sim state"
                );
                return;
            }
            return;
        }

        case ApproachSpawnState::StabiliseSimState: {
            if (!flightPathCommandSent_) {
                std::string error;
                if (!configurator_.applyFlightPathState(scenario_, error)) {
                    appendWarningOnce(error);
                }
                flightPathCommandSent_ = true;
                return;
            }

            if (!airspeedRefreshSent_ &&
                std::isfinite(telemetry.indicatedAirspeedKt) &&
                telemetry.indicatedAirspeedKt < scenario_.airspeedKt - 40.0) {
                std::string error;
                if (!simconnect_.teleportUserAircraftToInitialPosition(scenario_, error)) {
                    appendWarningOnce(error);
                } else {
                    appendWarningOnce("Low IAS after teleport; sent one bounded INITPOSITION airspeed refresh");
                    if (!freezeController_.freezeAll(error)) {
                        appendWarningOnce(error);
                    } else {
                        holdActive_ = true;
                    }
                }
                airspeedRefreshSent_ = true;
                return;
            }

            if (!elapsedSinceState(StabilisationMinimumTime)) {
                return;
            }

            const bool freezeActive =
                freezeConfirmedOrAssumed_ ||
                freezeController_.isFreezeConfirmed(telemetry);
            const auto readiness = readinessChecker_.check(
                telemetry,
                scenario_,
                freezeActive,
                configurationTimedOut_
            );

            for (const auto& warning : readiness.warnings) {
                appendWarningOnce(warning);
            }

            if (readiness.ready) {
                transition(
                    ApproachSpawnState::ReadyToRelease,
                    "Aircraft configured. Press release to continue."
                );
                return;
            }

            if (elapsedSinceState(StabilisationTimeout)) {
                std::string reason = "Stabilisation failed readiness checks";
                if (!readiness.issues.empty()) {
                    reason += ": " + readiness.issues.front();
                }
                fail(reason);
                return;
            }
            return;
        }

        case ApproachSpawnState::ReadyToRelease:
            // TODO: release on meaningful yoke/stick/rudder/throttle input once control-axis SimVars are published.
            if (releaseRequested_) {
                releaseController_.start();
                transition(
                    ApproachSpawnState::SmoothRelease,
                    "Release requested; unfreezing axes smoothly"
                );
            }
            return;

        case ApproachSpawnState::SmoothRelease: {
            std::string error;
            if (!releaseController_.tick(error)) {
                fail(error);
                return;
            }
            if (releaseController_.complete()) {
                holdActive_ = false;
                transition(ApproachSpawnState::Flying, "Aircraft released");
            }
            return;
        }

        case ApproachSpawnState::Idle:
        case ApproachSpawnState::Flying:
        case ApproachSpawnState::Failed:
            return;
    }
}

bool ApproachSpawnManager::requestRelease(std::string& error) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (stateMachine_.state() != ApproachSpawnState::ReadyToRelease) {
        error = "Aircraft is not ready to release";
        return false;
    }

    releaseRequested_ = true;
    return true;
}

bool ApproachSpawnManager::cancel(std::string& error) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (isTerminalOrIdle(stateMachine_.state()) && !holdActive_) {
        error = "No active spawn to cancel";
        return false;
    }

    std::string unfreezeError;
    if (!freezeController_.unfreezeAll(unfreezeError)) {
        appendWarningOnce(unfreezeError);
    } else {
        holdActive_ = false;
    }

    transition(ApproachSpawnState::Failed, "Spawn cancelled; aircraft un-frozen");
    return true;
}

bool ApproachSpawnManager::isActive() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return holdActive_ || !isTerminalOrIdle(stateMachine_.state());
}

ApproachSpawnState ApproachSpawnManager::state() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return stateMachine_.state();
}

void ApproachSpawnManager::transition(
    ApproachSpawnState next,
    const std::string& message
) {
    const ApproachSpawnState actualState = stateMachine_.transitionTo(next, message);
    stateStartedAt_ = std::chrono::steady_clock::now();

    if (statusCallback_) {
        SpawnStatus status;
        status.state = actualState;
        status.message = message;
        status.airportIdent = scenario_.airportIdent;
        status.runwayIdent = scenario_.runwayIdent;
        status.readyToRelease = actualState == ApproachSpawnState::ReadyToRelease;
        status.warnings = warnings_;
        statusCallback_(status);
    }
}

void ApproachSpawnManager::fail(const std::string& reason) {
    transition(
        ApproachSpawnState::Failed,
        reason + ". Aircraft remains frozen; use Cancel to unfreeze when safe."
    );
}

bool ApproachSpawnManager::totalTimeoutExpired() const {
    return std::chrono::steady_clock::now() - spawnStartedAt_ >= TotalSpawnTimeout;
}

bool ApproachSpawnManager::elapsedSinceState(std::chrono::milliseconds duration) const {
    return std::chrono::steady_clock::now() - stateStartedAt_ >= duration;
}

void ApproachSpawnManager::appendWarningOnce(const std::string& warning) {
    if (warning.empty()) {
        return;
    }

    if (std::find(warnings_.begin(), warnings_.end(), warning) == warnings_.end()) {
        warnings_.push_back(warning);
        std::cerr << "[ApproachSpawn] warning: " << warning << std::endl;
    }
}

}
