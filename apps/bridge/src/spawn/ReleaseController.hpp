#pragma once

#include "scenario/ApproachScenario.hpp"
#include "spawn/ApproachEnergyState.hpp"

#include <chrono>
#include <string>

namespace msfs_turnaround {

class SpawnFreezeController;
class SimConnectClient;

// Soft, ramped handoff from the frozen hold into live flight. Rather than freeing
// attitude first (which lets aerodynamics snap the nose), it pins the matched
// velocity vector, frees translation/altitude so the aircraft starts moving and
// descending along that vector, then frees attitude last for an imperceptible
// handover. Velocity is re-asserted inside the ramp (never via a reposition).
class ReleaseController {
public:
    enum class Step {
        Idle,
        AssertAndReleaseTranslation,
        SettleTranslation,
        ReleaseAttitude,
        Complete,
        Failed,
    };

    ReleaseController(SpawnFreezeController& freezeController, SimConnectClient& simconnect);

    void start(const ApproachScenario& scenario, const ApproachEnergyTarget& target);
    bool tick(std::string& error);
    Step step() const;
    bool complete() const;

private:
    void advance(Step next);

    SpawnFreezeController& freezeController_;
    SimConnectClient& simconnect_;
    ApproachScenario scenario_ {};
    ApproachEnergyTarget target_ {};
    Step step_ = Step::Idle;
    std::chrono::steady_clock::time_point stepStartedAt_ {};
};

}
