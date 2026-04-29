#include "msfs_turnaround/landing_analysis.hpp"

#include <algorithm>
#include <cmath>
#include <iostream>

namespace msfs_turnaround {
namespace {

bool isFinite(double value) {
    return std::isfinite(value);
}

bool simBool(double value) {
    return isFinite(value) && std::abs(value) >= 0.5;
}

bool isValidCoordinate(double latitudeDeg, double longitudeDeg) {
    return isFinite(latitudeDeg) &&
           isFinite(longitudeDeg) &&
           latitudeDeg >= -90.0 &&
           latitudeDeg <= 90.0 &&
           longitudeDeg >= -180.0 &&
           longitudeDeg <= 180.0 &&
           !(latitudeDeg == 0.0 && longitudeDeg == 0.0);
}

double chooseFinite(double preferred, double fallback) {
    return isFinite(preferred) ? preferred : fallback;
}

double maxFinite(double first, double second) {
    if (isFinite(first) && isFinite(second)) {
        return std::max(first, second);
    }

    return isFinite(first) ? first : second;
}

bool hasTouchdownEventData(const AircraftTelemetry& telemetry) {
    return (
        isFinite(telemetry.touchdownNormalVelocityFps) &&
        std::abs(telemetry.touchdownNormalVelocityFps) > 0.01
    ) ||
        isValidCoordinate(telemetry.touchdownLatitudeDeg, telemetry.touchdownLongitudeDeg);
}

double touchdownVerticalSpeedFpm(
    const AircraftTelemetry& touchdownTelemetry,
    const AircraftTelemetry& lastAirborneTelemetry
) {
    if (
        isFinite(touchdownTelemetry.touchdownNormalVelocityFps) &&
        std::abs(touchdownTelemetry.touchdownNormalVelocityFps) > 0.01
    ) {
        return -std::abs(touchdownTelemetry.touchdownNormalVelocityFps * 60.0);
    }

    return chooseFinite(
        lastAirborneTelemetry.verticalSpeedFpm,
        touchdownTelemetry.verticalSpeedFpm
    );
}

}

bool LandingDetector::update(const AircraftTelemetry& telemetry) {
    if (!hasSeenTelemetry_) {
        previousSimOnGround_ = telemetry.simOnGround;
        previousTelemetry_ = telemetry;
        hasPreviousTelemetry_ = true;
        hasSeenTelemetry_ = true;
        return false;
    }

    const bool wasOnGround = simBool(previousSimOnGround_);
    const bool isOnGround = simBool(telemetry.simOnGround);
    const bool groundStateChanged = wasOnGround != isOnGround;
    const bool touchdownDetected = !wasOnGround && isOnGround;

    if (groundStateChanged) {
        std::cout << "Ground state changed: " << (isOnGround ? 1 : 0) << std::endl;
    }

    previousSimOnGround_ = telemetry.simOnGround;

    if (!touchdownDetected) {
        previousTelemetry_ = telemetry;
        hasPreviousTelemetry_ = true;
        return false;
    }

    const AircraftTelemetry& lastAirborneTelemetry =
        hasPreviousTelemetry_ ? previousTelemetry_ : telemetry;
    const bool touchdownDataAvailable = hasTouchdownEventData(telemetry);

    latestLanding_.touchdownVerticalSpeedFpm =
        touchdownVerticalSpeedFpm(telemetry, lastAirborneTelemetry);
    latestLanding_.touchdownAirspeedKt = chooseFinite(
        lastAirborneTelemetry.indicatedAirspeedKt,
        telemetry.indicatedAirspeedKt
    );
    latestLanding_.touchdownHeadingDeg =
        touchdownDataAvailable && isFinite(telemetry.touchdownHeadingDeg)
            ? telemetry.touchdownHeadingDeg
            : lastAirborneTelemetry.headingDeg;
    if (isValidCoordinate(telemetry.touchdownLatitudeDeg, telemetry.touchdownLongitudeDeg)) {
        latestLanding_.touchdownLatitudeDeg = telemetry.touchdownLatitudeDeg;
        latestLanding_.touchdownLongitudeDeg = telemetry.touchdownLongitudeDeg;
    } else {
        latestLanding_.touchdownLatitudeDeg = chooseFinite(
            telemetry.latitudeDeg,
            lastAirborneTelemetry.latitudeDeg
        );
        latestLanding_.touchdownLongitudeDeg = chooseFinite(
            telemetry.longitudeDeg,
            lastAirborneTelemetry.longitudeDeg
        );
    }
    latestLanding_.touchdownPitchDeg =
        touchdownDataAvailable && isFinite(telemetry.touchdownPitchDeg)
            ? telemetry.touchdownPitchDeg
            : lastAirborneTelemetry.pitchDeg;
    latestLanding_.touchdownBankDeg =
        touchdownDataAvailable && isFinite(telemetry.touchdownBankDeg)
            ? telemetry.touchdownBankDeg
            : lastAirborneTelemetry.bankDeg;
    latestLanding_.touchdownGForce = maxFinite(
        telemetry.gForce,
        lastAirborneTelemetry.gForce
    );
    latestLanding_.score = calculateScore(latestLanding_);

    previousTelemetry_ = telemetry;
    hasPreviousTelemetry_ = true;
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
