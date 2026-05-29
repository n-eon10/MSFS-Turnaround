#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"

namespace msfs_turnaround {

// A complete stabilized-approach energy target for an aircraft. Captures not just
// speed but the full descending-approach state the sim should be holding before the
// controls are handed back to the pilot.
struct ApproachEnergyTarget {
    double targetIasKt = 140.0;          // indicated approach speed
    double targetDescentRateFpm = -700.0; // negative; on the selected glidepath
    double targetPitchDeg = 2.5;         // realistic nose-up approach pitch
    double targetTrimPct = 0.0;          // elevator trim, fraction -1..1
    double targetThrustPct = 0.0;        // commanded throttle, fraction 0..1

    // Tolerances used to decide whether the aircraft is stabilized.
    double speedTolKt = 6.0;
    double vsTolFpm = 250.0;
    double pitchTolDeg = 3.0;
    double bankTolDeg = 4.0;

    // Guarded actuations. Default OFF so the baseline release relies only on the
    // velocity-vector + pitch match. Enabled per aircraft profile once validated.
    bool injectTrim = false;
    bool injectThrust = false;
    bool holdAutopilot = false;
};

// Instantaneous comparison of live telemetry against the energy target.
struct ApproachEnergyState {
    double speedErrorKt = 0.0;
    double vsErrorFpm = 0.0;
    double pitchErrorDeg = 0.0;
    double bankDeg = 0.0;
    double trimError = 0.0;
    double throttleError = 0.0;
    bool withinTolerance = false;
};

// Descent rate (feet per minute, negative) for a given speed on a glidepath.
double targetDescentRateFpm(double speedKt, double glidepathDeg);

ApproachEnergyState evaluateEnergyState(
    const AircraftTelemetry& telemetry,
    const ApproachEnergyTarget& target
);

}
