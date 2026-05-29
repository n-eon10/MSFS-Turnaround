#include "spawn/ReleaseController.hpp"

#include "msfs_turnaround/simconnect_client.hpp"
#include "spawn/SpawnFreezeController.hpp"

#include <iostream>

namespace msfs_turnaround {
namespace {

constexpr auto TranslationSettleDelay = std::chrono::milliseconds(1000);
constexpr auto AttitudeReleaseDelay = std::chrono::milliseconds(300);

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
        // Hold the descending flight path steady (vector only — no reposition) on every
        // tick while attitude stays frozen, so vertical speed has fully settled to the
        // target before the nose is freed. This removes the descent overshoot.
        std::string velError;
        if (!simconnect_.setApproachVelocity(scenario_, target_, velError)) {
            std::cerr << "[ApproachSpawn] release velocity re-assert warning: " << velError << std::endl;
        }

        if (now - stepStartedAt_ < TranslationSettleDelay) {
            return true;
        }

        advance(Step::ReleaseAttitude);
        return true;
    }

    if (step_ == Step::ReleaseAttitude) {
        if (now - stepStartedAt_ < AttitudeReleaseDelay) {
            // Keep pinning the vector right up to the handoff.
            std::string velError;
            if (!simconnect_.setApproachVelocity(scenario_, target_, velError)) {
                std::cerr << "[ApproachSpawn] release velocity hold warning: " << velError << std::endl;
            }
            return true;
        }

        // Final assert of velocity + trim so the aircraft is trimmed for the approach
        // the instant it becomes stick-free, minimising the post-release pitch hunt.
        std::string velError;
        if (!simconnect_.setApproachVelocity(scenario_, target_, velError)) {
            std::cerr << "[ApproachSpawn] release velocity final assert warning: " << velError << std::endl;
        }
        if (target_.injectTrim) {
            std::string trimError;
            if (!simconnect_.setElevatorTrim(target_.targetTrimPct, trimError)) {
                std::cerr << "[ApproachSpawn] release trim assert warning: " << trimError << std::endl;
            }
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
