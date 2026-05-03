#pragma once

#include <string>

namespace msfs_turnaround {

enum class ApproachSpawnState {
    Idle,
    CalculateFinalPosition,
    TeleportWithInitPosition,
    FreezeHold,
    ConfigureAircraft,
    StabiliseSimState,
    ReadyToRelease,
    SmoothRelease,
    Flying,
    Failed,
};

std::string approachSpawnStateName(ApproachSpawnState state);
std::string approachSpawnStateLabel(ApproachSpawnState state);

class ApproachSpawnStateMachine {
public:
    ApproachSpawnState state() const;
    void transitionTo(ApproachSpawnState next, const std::string& message);

private:
    ApproachSpawnState state_ = ApproachSpawnState::Idle;
};

}
