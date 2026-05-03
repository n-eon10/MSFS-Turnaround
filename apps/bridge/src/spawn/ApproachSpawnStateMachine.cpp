#include "spawn/ApproachSpawnStateMachine.hpp"

#include <iostream>

namespace msfs_turnaround {
namespace {

bool canTransition(ApproachSpawnState current, ApproachSpawnState next) {
    if (current == next) {
        return true;
    }

    if (next == ApproachSpawnState::Failed) {
        return true;
    }

    switch (current) {
        case ApproachSpawnState::Idle:
        case ApproachSpawnState::Flying:
        case ApproachSpawnState::Failed:
            return next == ApproachSpawnState::CalculateFinalPosition;
        case ApproachSpawnState::CalculateFinalPosition:
            return next == ApproachSpawnState::TeleportWithInitPosition;
        case ApproachSpawnState::TeleportWithInitPosition:
            return next == ApproachSpawnState::FreezeHold;
        case ApproachSpawnState::FreezeHold:
            return next == ApproachSpawnState::ConfigureAircraft;
        case ApproachSpawnState::ConfigureAircraft:
            return next == ApproachSpawnState::StabiliseSimState;
        case ApproachSpawnState::StabiliseSimState:
            return next == ApproachSpawnState::ReadyToRelease;
        case ApproachSpawnState::ReadyToRelease:
            return next == ApproachSpawnState::SmoothRelease;
        case ApproachSpawnState::SmoothRelease:
            return next == ApproachSpawnState::Flying;
    }

    return false;
}

}

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

ApproachSpawnState ApproachSpawnStateMachine::transitionTo(
    ApproachSpawnState next,
    const std::string& message
) {
    if (state_ == next) {
        return state_;
    }

    if (!canTransition(state_, next)) {
        std::cerr
            << "[ApproachSpawn] invalid transition blocked: "
            << approachSpawnStateName(state_)
            << " -> "
            << approachSpawnStateName(next)
            << ". Forcing FAILED."
            << std::endl;
        next = ApproachSpawnState::Failed;
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
    return state_;
}

}
