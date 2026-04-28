#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"

namespace msfs_turnaround {

struct LandingAnalysis {
    double touchdownVerticalSpeedFpm = 0.0;
    double touchdownAirspeedKt = 0.0;
    double touchdownHeadingDeg = 0.0;
    double touchdownLatitudeDeg = 0.0;
    double touchdownLongitudeDeg = 0.0;
    double touchdownPitchDeg = 0.0;
    double touchdownBankDeg = 0.0;
    double touchdownGForce = 0.0;
    double score = 0.0;
};

class LandingDetector {
public:
    bool update(const AircraftTelemetry& telemetry);
    const LandingAnalysis& latestLanding() const;

private:
    bool hasSeenTelemetry_ = false;
    double previousSimOnGround_ = 0.0;
    LandingAnalysis latestLanding_;

    static double calculateScore(const LandingAnalysis& analysis);
};

}
