#include "spawn/ApproachSpawnStateMachine.hpp"

#include <iostream>

namespace msfs_turnaround {

std::string approachSpawnStateName(ApproachSpawnState state) {
    switch (state) {
        case ApproachSpawnState::Idle:
            return "IDLE";
        case ApproachSpawnState::CalculateFinalPosition:
            return "CALCULATE_FINAL_POSITION";
        case ApproachSpawnState::TeleportWithInitPosition:
            return "TELEPORT_WITH_INITPOSITION";
        case ApproachSpawnState::FreezeHold:
            return "FREEZE_HOLD";
        case ApproachSpawnState::ConfigureAircraft:
            return "CONFIGURE_AIRCRAFT";
        case ApproachSpawnState::StabiliseSimState:
            return "STABILISE_SIM_STATE";
        case ApproachSpawnState::ReadyToRelease:
            return "READY_TO_RELEASE";
        case ApproachSpawnState::SmoothRelease:
            return "SMOOTH_RELEASE";
        case ApproachSpawnState::Flying:
            return "FLYING";
        case ApproachSpawnState::Failed:
            return "FAILED";
    }

    return "FAILED";
}

std::string approachSpawnStateLabel(ApproachSpawnState state) {
    switch (state) {
        case ApproachSpawnState::Idle:
            return "Idle";
        case ApproachSpawnState::CalculateFinalPosition:
            return "Calculating final";
        case ApproachSpawnState::TeleportWithInitPosition:
            return "Teleporting";
        case ApproachSpawnState::FreezeHold:
            return "Freezing";
        case ApproachSpawnState::ConfigureAircraft:
            return "Configuring aircraft";
        case ApproachSpawnState::StabiliseSimState:
            return "Stabilising";
        case ApproachSpawnState::ReadyToRelease:
            return "Ready to release";
        case ApproachSpawnState::SmoothRelease:
            return "Releasing";
        case ApproachSpawnState::Flying:
            return "Released";
        case ApproachSpawnState::Failed:
            return "Failed";
    }

    return "Failed";
}

ApproachSpawnState ApproachSpawnStateMachine::state() const {
    return state_;
}

void ApproachSpawnStateMachine::transitionTo(
    ApproachSpawnState next,
    const std::string& message
) {
    if (state_ == next) {
        return;
    }

    std::cout
        << "[ApproachSpawn] "
        << approachSpawnStateName(state_)
        << " -> "
        << approachSpawnStateName(next)
        << ": "
        << message
        << std::endl;

    state_ = next;
}

}
