#pragma once

#include <chrono>
#include <string>

namespace msfs_turnaround {

class SpawnFreezeController;

class ReleaseController {
public:
    enum class Step {
        Idle,
        ReleaseAttitude,
        ReleaseAltitude,
        ReleaseLatitudeLongitude,
        Complete,
        Failed,
    };

    explicit ReleaseController(SpawnFreezeController& freezeController);

    void start();
    bool tick(std::string& error);
    Step step() const;
    bool complete() const;

private:
    void advance(Step next);

    SpawnFreezeController& freezeController_;
    Step step_ = Step::Idle;
    std::chrono::steady_clock::time_point stepStartedAt_ {};
};

}
