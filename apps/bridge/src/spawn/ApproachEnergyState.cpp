#include "spawn/ApproachEnergyState.hpp"

#include <cmath>

namespace msfs_turnaround {
namespace {

constexpr double FeetPerMinutePerKnot = 101.26859142607174;
constexpr double DegreesToRadians = 3.14159265358979323846 / 180.0;

bool finiteOrZero(double value, double& out) {
    if (std::isfinite(value)) {
        out = value;
        return true;
    }
    out = 0.0;
    return false;
}

}

double targetDescentRateFpm(double speedKt, double glidepathDeg) {
    if (!std::isfinite(speedKt) || !std::isfinite(glidepathDeg)) {
        return 0.0;
    }
    return -std::abs(speedKt) * FeetPerMinutePerKnot *
           std::sin(std::abs(glidepathDeg) * DegreesToRadians);
}

ApproachEnergyState evaluateEnergyState(
    const AircraftTelemetry& telemetry,
    const ApproachEnergyTarget& target
) {
    ApproachEnergyState state;

    double ias = 0.0;
    const bool hasIas = finiteOrZero(telemetry.indicatedAirspeedKt, ias);
    state.speedErrorKt = ias - target.targetIasKt;

    double vs = 0.0;
    const bool hasVs = finiteOrZero(telemetry.verticalSpeedFpm, vs);
    state.vsErrorFpm = vs - target.targetDescentRateFpm;

    double pitch = 0.0;
    const bool hasPitch = finiteOrZero(telemetry.pitchDeg, pitch);
    state.pitchErrorDeg = pitch - target.targetPitchDeg;

    double bank = 0.0;
    const bool hasBank = finiteOrZero(telemetry.bankDeg, bank);
    state.bankDeg = std::abs(bank);

    // Trim telemetry is a fraction (percent over 100); target is the same scale.
    double trim = 0.0;
    finiteOrZero(telemetry.elevatorTrimPercent, trim);
    state.trimError = trim - target.targetTrimPct;

    // Throttle telemetry is 0..100 percent; target is a 0..1 fraction.
    double throttle = 0.0;
    finiteOrZero(telemetry.throttlePercent, throttle);
    state.throttleError = (throttle / 100.0) - target.targetThrustPct;

    state.withinTolerance =
        hasIas && hasVs && hasPitch && hasBank &&
        std::abs(state.speedErrorKt) <= target.speedTolKt &&
        std::abs(state.vsErrorFpm) <= target.vsTolFpm &&
        std::abs(state.pitchErrorDeg) <= target.pitchTolDeg &&
        state.bankDeg <= target.bankTolDeg;

    return state;
}

}
