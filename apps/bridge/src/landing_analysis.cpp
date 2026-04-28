#include "msfs_turnaround/landing_analysis.hpp"

#include <algorithm>
#include <cmath>
#include <iostream>

namespace msfs_turnaround {

bool LandingDetector::update(const AircraftTelemetry& telemetry) {
    if (!hasSeenTelemetry_) {
        previousSimOnGround_ = telemetry.simOnGround;
        hasSeenTelemetry_ = true;
        return false;
    }

    const bool wasOnGround = previousSimOnGround_ >= 0.5;
    const bool isOnGround = telemetry.simOnGround >= 0.5;
    const bool groundStateChanged = wasOnGround != isOnGround;
    const bool touchdownDetected = previousSimOnGround_ < 0.5 && telemetry.simOnGround >= 0.5;

    if (groundStateChanged) {
        std::cout << "Ground state changed: " << (isOnGround ? 1 : 0) << std::endl;
    }

    previousSimOnGround_ = telemetry.simOnGround;

    if (!touchdownDetected) {
        return false;
    }

    latestLanding_.touchdownVerticalSpeedFpm = telemetry.verticalSpeedFpm;
    latestLanding_.touchdownAirspeedKt = telemetry.indicatedAirspeedKt;
    latestLanding_.touchdownHeadingDeg = telemetry.headingDeg;
    latestLanding_.touchdownLatitudeDeg = telemetry.latitudeDeg;
    latestLanding_.touchdownLongitudeDeg = telemetry.longitudeDeg;
    latestLanding_.touchdownPitchDeg = telemetry.pitchDeg;
    latestLanding_.touchdownBankDeg = telemetry.bankDeg;
    latestLanding_.touchdownGForce = telemetry.gForce;
    latestLanding_.score = calculateScore(latestLanding_);

    return true;
}

const LandingAnalysis& LandingDetector::latestLanding() const {
    return latestLanding_;
}

double LandingDetector::calculateScore(const LandingAnalysis& analysis) {
    double score = 100.0;

    const double touchdownRate = std::abs(analysis.touchdownVerticalSpeedFpm);

    if (touchdownRate > 150.0) {
        score -= std::min(35.0, (touchdownRate - 150.0) * 0.08);
    }

    const double touchdownG = std::max(0.0, analysis.touchdownGForce - 1.2);
    score -= std::min(25.0, touchdownG * 50.0);

    return std::clamp(score, 0.0, 100.0);
}

}
