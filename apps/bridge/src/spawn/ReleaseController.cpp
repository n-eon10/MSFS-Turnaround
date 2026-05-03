#include "spawn/ReleaseController.hpp"

#include "spawn/SpawnFreezeController.hpp"

#include <iostream>

namespace msfs_turnaround {
namespace {

constexpr auto ReleaseStepDelay = std::chrono::milliseconds(250);

}

ReleaseController::ReleaseController(SpawnFreezeController& freezeController)
    : freezeController_(freezeController) {}

void ReleaseController::start() {
    advance(Step::ReleaseAttitude);
}

bool ReleaseController::tick(std::string& error) {
    const auto now = std::chrono::steady_clock::now();

    if (step_ == Step::ReleaseAttitude) {
        std::cout << "[ApproachSpawn] release step: unfreeze attitude" << std::endl;
        if (!freezeController_.setAxes(true, true, false, error)) {
            step_ = Step::Failed;
            return false;
        }
        advance(Step::ReleaseAltitude);
        return true;
    }

    if (step_ == Step::ReleaseAltitude) {
        if (now - stepStartedAt_ < ReleaseStepDelay) {
            return true;
        }

        std::cout << "[ApproachSpawn] release step: unfreeze altitude" << std::endl;
        if (!freezeController_.setAxes(true, false, false, error)) {
            step_ = Step::Failed;
            return false;
        }
        advance(Step::ReleaseLatitudeLongitude);
        return true;
    }

    if (step_ == Step::ReleaseLatitudeLongitude) {
        if (now - stepStartedAt_ < ReleaseStepDelay) {
            return true;
        }

        std::cout << "[ApproachSpawn] release step: unfreeze latitude/longitude" << std::endl;
        if (!freezeController_.unfreezeAll(error)) {
            step_ = Step::Failed;
            return false;
        }
        advance(Step::Complete);
        return true;
    }

    return true;
}

ReleaseController::Step ReleaseController::step() const {
    return step_;
}

bool ReleaseController::complete() const {
    return step_ == Step::Complete;
}

void ReleaseController::advance(Step next) {
    step_ = next;
    stepStartedAt_ = std::chrono::steady_clock::now();
}

}
