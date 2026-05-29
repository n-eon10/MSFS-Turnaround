#include "spawn/ReleaseController.hpp"

#include "msfs_turnaround/simconnect_client.hpp"
#include "spawn/SpawnFreezeController.hpp"

#include <iostream>

namespace msfs_turnaround {
namespace {

constexpr auto TranslationSettleDelay = std::chrono::milliseconds(450);
constexpr auto AttitudeReleaseDelay = std::chrono::milliseconds(350);

}

ReleaseController::ReleaseController(
    SpawnFreezeController& freezeController,
    SimConnectClient& simconnect
)
    : freezeController_(freezeController), simconnect_(simconnect) {}

void ReleaseController::start(
    const ApproachScenario& scenario,
    const ApproachEnergyTarget& target
) {
    scenario_ = scenario;
    target_ = target;
    advance(Step::AssertAndReleaseTranslation);
}

bool ReleaseController::tick(std::string& error) {
    const auto now = std::chrono::steady_clock::now();

    if (step_ == Step::AssertAndReleaseTranslation) {
        // Pin the matched velocity vector, optionally engage the autopilot, then free
        // position + altitude while holding attitude. The aircraft begins translating
        // and descending along the injected vector before the nose can move.
        std::string velError;
        if (!simconnect_.setApproachVelocity(scenario_, target_, velError)) {
            std::cerr << "[ApproachSpawn] release velocity assert warning: " << velError << std::endl;
        }
        if (target_.holdAutopilot) {
            std::string apError;
            if (!simconnect_.holdApproachAutopilot(apError)) {
                std::cerr << "[ApproachSpawn] release autopilot warning: " << apError << std::endl;
            }
        }
        std::cout << "[ApproachSpawn] release step: free translation, hold attitude" << std::endl;
        if (!freezeController_.setAxes(false, false, true, error)) {
            step_ = Step::Failed;
            return false;
        }
        advance(Step::SettleTranslation);
        return true;
    }

    if (step_ == Step::SettleTranslation) {
        if (now - stepStartedAt_ < TranslationSettleDelay) {
            return true;
        }

        // Re-assert velocity (vector only — no reposition) as drag begins to act.
        std::string velError;
        if (!simconnect_.setApproachVelocity(scenario_, target_, velError)) {
            std::cerr << "[ApproachSpawn] release velocity re-assert warning: " << velError << std::endl;
        }
        advance(Step::ReleaseAttitude);
        return true;
    }

    if (step_ == Step::ReleaseAttitude) {
        if (now - stepStartedAt_ < AttitudeReleaseDelay) {
            return true;
        }

        std::string velError;
        if (!simconnect_.setApproachVelocity(scenario_, target_, velError)) {
            std::cerr << "[ApproachSpawn] release velocity final assert warning: " << velError << std::endl;
        }
        std::cout << "[ApproachSpawn] release step: free attitude (full handoff)" << std::endl;
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
