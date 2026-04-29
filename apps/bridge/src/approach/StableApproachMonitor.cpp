#include "approach/StableApproachMonitor.hpp"

#include <cmath>

namespace msfs_turnaround {
namespace {

constexpr int Gate1000Ft = 1000;
constexpr int Gate500Ft = 500;

struct GateThresholds {
    double courseErrorDeg;
    double lateralDeviationM;
    double glidepathDeviationFt;
    double bankDeg;
    double minimumVerticalSpeedFpm;
};

GateThresholds thresholdsForGate(int gateAglFt) {
    if (gateAglFt == Gate500Ft) {
        return {
            5.0,
            150.0,
            150.0,
            10.0,
            -800.0
        };
    }

    return {
        10.0,
        300.0,
        300.0,
        15.0,
        -1000.0
    };
}

bool isValidRadioAltitude(double radioAltitudeFt) {
    return std::isfinite(radioAltitudeFt) && radioAltitudeFt >= 0.0;
}

bool isOnFinalApproach(const ApproachGuidanceResult& guidance) {
    constexpr double MaxFinalCourseErrorDeg = 30.0;
    constexpr double MaxFinalDistanceNm = 12.0;

    return std::isfinite(guidance.courseErrorDeg) &&
           std::isfinite(guidance.alongTrackDistanceNm) &&
           std::isfinite(guidance.distanceNm) &&
           std::abs(guidance.courseErrorDeg) < MaxFinalCourseErrorDeg &&
           guidance.alongTrackDistanceNm > 0.0 &&
           guidance.distanceNm < MaxFinalDistanceNm;
}

bool hasInvalidGuidanceGeometry(const ApproachGuidanceResult& guidance) {
    for (const auto& issue : guidance.issues) {
        if (
            issue == "Invalid telemetry position" ||
            issue == "Runway threshold position unavailable" ||
            issue == "Runway heading unavailable" ||
            issue == "Invalid telemetry attitude/altitude"
        ) {
            return true;
        }
    }

    return false;
}

void addGateIssues(
    const AircraftTelemetry& telemetry,
    const ApproachGuidanceResult& guidance,
    const GateThresholds& thresholds,
    StableApproachGateResult& result
) {
    if (std::abs(guidance.courseErrorDeg) > thresholds.courseErrorDeg) {
        result.issues.push_back("Not aligned with runway course");
    }

    if (std::abs(guidance.lateralDeviationM) > thresholds.lateralDeviationM) {
        result.issues.push_back(
            guidance.lateralDeviationM > 0.0
                ? "Right of centreline"
                : "Left of centreline"
        );
    }

    if (guidance.glidepathDeviationFt > thresholds.glidepathDeviationFt) {
        result.issues.push_back("High on glide path");
    } else if (guidance.glidepathDeviationFt < -thresholds.glidepathDeviationFt) {
        result.issues.push_back("Low on glide path");
    }

    if (std::isfinite(telemetry.bankDeg) && std::abs(telemetry.bankDeg) > thresholds.bankDeg) {
        result.issues.push_back("Bank angle too high");
    }

    if (
        std::isfinite(telemetry.verticalSpeedFpm) &&
        telemetry.verticalSpeedFpm < thresholds.minimumVerticalSpeedFpm
    ) {
        result.issues.push_back("Excessive sink rate");
    }

    if (
        std::isfinite(telemetry.gearHandlePosition) &&
        telemetry.gearHandlePosition < 0.5
    ) {
        result.issues.push_back("Gear not down");
    }
}

StableApproachGateResult makeGateResult(
    int gateAglFt,
    const AircraftTelemetry& telemetry,
    const ApproachGuidanceResult& guidance
) {
    StableApproachGateResult result;
    result.gateAglFt = gateAglFt;
    result.airportIdent = guidance.airportIdent;
    result.runwayIdent = guidance.runwayIdent;
    result.radioAltitudeFt = telemetry.altitudeAboveGroundFt;
    result.distanceNm = guidance.distanceNm;
    result.courseErrorDeg = guidance.courseErrorDeg;
    result.lateralDeviationM = guidance.lateralDeviationM;
    result.glidepathDeviationFt = guidance.glidepathDeviationFt;
    result.indicatedAirspeedKt = telemetry.indicatedAirspeedKt;
    result.verticalSpeedFpm = telemetry.verticalSpeedFpm;
    result.bankDeg = telemetry.bankDeg;
    result.pitchDeg = telemetry.pitchDeg;

    addGateIssues(telemetry, guidance, thresholdsForGate(gateAglFt), result);
    result.stable = result.issues.empty();
    return result;
}

}

void StableApproachMonitor::reset() {
    previousRadioAltitudeFt_.reset();
    gate1000_.reset();
    gate500_.reset();
    pendingGate500_ = false;
}

void StableApproachMonitor::resetForNewApproach() {
    reset();
}

std::optional<StableApproachGateResult> StableApproachMonitor::update(
    const AircraftTelemetry& telemetry,
    const ApproachGuidanceResult& guidance
) {
    if (telemetry.simOnGround >= 0.5) {
        return std::nullopt;
    }

    if (hasInvalidGuidanceGeometry(guidance)) {
        return std::nullopt;
    }

    if (!isOnFinalApproach(guidance)) {
        // Drop the altitude baseline so a re-established final still arms
        // the descending threshold-crossing detector.
        previousRadioAltitudeFt_.reset();
        return std::nullopt;
    }

    const double radioAltitudeFt = telemetry.altitudeAboveGroundFt;
    if (!isValidRadioAltitude(radioAltitudeFt)) {
        return std::nullopt;
    }

    if (pendingGate500_ && !gate500_) {
        pendingGate500_ = false;
        gate500_ = makeGateResult(Gate500Ft, telemetry, guidance);
        return gate500_;
    }

    if (!previousRadioAltitudeFt_) {
        previousRadioAltitudeFt_ = radioAltitudeFt;
        return std::nullopt;
    }

    const double previousRadioAltitudeFt = *previousRadioAltitudeFt_;
    previousRadioAltitudeFt_ = radioAltitudeFt;

    const bool crossed1000 =
        !gate1000_ &&
        previousRadioAltitudeFt > static_cast<double>(Gate1000Ft) &&
        radioAltitudeFt <= static_cast<double>(Gate1000Ft);
    const bool crossed500 =
        !gate500_ &&
        previousRadioAltitudeFt > static_cast<double>(Gate500Ft) &&
        radioAltitudeFt <= static_cast<double>(Gate500Ft);

    if (crossed1000) {
        gate1000_ = makeGateResult(Gate1000Ft, telemetry, guidance);
        if (crossed500) {
            pendingGate500_ = true;
        }
        return gate1000_;
    }

    if (crossed500) {
        gate500_ = makeGateResult(Gate500Ft, telemetry, guidance);
        return gate500_;
    }

    return std::nullopt;
}

const std::optional<StableApproachGateResult>& StableApproachMonitor::gate1000() const {
    return gate1000_;
}

const std::optional<StableApproachGateResult>& StableApproachMonitor::gate500() const {
    return gate500_;
}

}
