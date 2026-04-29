#include "approach/ApproachGuidance.hpp"

#include "approach/Geo.hpp"

#include <algorithm>
#include <cmath>

namespace msfs_turnaround {
namespace {

constexpr double FeetPerNauticalMile = 6076.12;
constexpr double MetersPerNauticalMile = 1852.0;
constexpr double GlidepathDeg = 3.0;
constexpr double MonitoringRangeNm = 12.0;
constexpr double CourseErrorLimitDeg = 10.0;
constexpr double LateralDeviationLimitM = 300.0;
constexpr double GlidepathDeviationLimitFt = 300.0;
constexpr double BankLimitDeg = 15.0;
constexpr double SinkRateLimitFpm = -1000.0;

bool isValidCoordinate(double latitudeDeg, double longitudeDeg) {
    return std::isfinite(latitudeDeg) &&
           std::isfinite(longitudeDeg) &&
           latitudeDeg >= -90.0 &&
           latitudeDeg <= 90.0 &&
           longitudeDeg >= -180.0 &&
           longitudeDeg <= 180.0;
}

void evaluateStability(
    const AircraftTelemetry& telemetry,
    ApproachGuidanceResult& result
) {
    if (result.distanceNm > MonitoringRangeNm) {
        result.issues.push_back("Outside approach monitoring range");
        result.stable = false;
        return;
    }

    if (std::abs(result.courseErrorDeg) > CourseErrorLimitDeg) {
        result.issues.push_back("Not aligned with runway course");
    }

    if (std::abs(result.lateralDeviationM) > LateralDeviationLimitM) {
        result.issues.push_back(
            result.lateralDeviationM > 0.0
                ? "Right of centreline"
                : "Left of centreline"
        );
    }

    if (result.glidepathDeviationFt > GlidepathDeviationLimitFt) {
        result.issues.push_back("High on glide path");
    } else if (result.glidepathDeviationFt < -GlidepathDeviationLimitFt) {
        result.issues.push_back("Low on glide path");
    }

    if (std::isfinite(telemetry.bankDeg) && std::abs(telemetry.bankDeg) > BankLimitDeg) {
        result.issues.push_back("Bank angle too high");
    }

    if (
        std::isfinite(telemetry.verticalSpeedFpm) &&
        telemetry.verticalSpeedFpm < SinkRateLimitFpm
    ) {
        result.issues.push_back("Excessive sink rate");
    }

    if (
        std::isfinite(telemetry.gearHandlePosition) &&
        telemetry.gearHandlePosition < 0.5
    ) {
        result.issues.push_back("Gear not down");
    }

    result.stable = result.issues.empty();
}

}

ApproachGuidanceResult computeApproachGuidance(
    const AircraftTelemetry& telemetry,
    const RunwayEnd& runwayEnd
) {
    ApproachGuidanceResult result;
    result.airportIdent = runwayEnd.airportIdent;
    result.runwayIdent = runwayEnd.runwayIdent;
    result.glidepathDeg = GlidepathDeg;

    if (!isValidCoordinate(telemetry.latitudeDeg, telemetry.longitudeDeg)) {
        result.issues.push_back("Invalid telemetry position");
        return result;
    }

    if (!isValidCoordinate(runwayEnd.latitudeDeg, runwayEnd.longitudeDeg)) {
        result.issues.push_back("Runway threshold position unavailable");
        return result;
    }

    if (!std::isfinite(runwayEnd.headingDegT)) {
        result.issues.push_back("Runway heading unavailable");
        return result;
    }

    if (!std::isfinite(telemetry.headingDeg) || !std::isfinite(telemetry.altitudeFt)) {
        result.issues.push_back("Invalid telemetry attitude/altitude");
        return result;
    }

    result.distanceNm = geo::ellipsoidDistanceNm(
        telemetry.latitudeDeg,
        telemetry.longitudeDeg,
        runwayEnd.latitudeDeg,
        runwayEnd.longitudeDeg
    );
    result.bearingToThresholdDeg = geo::ellipsoidInitialBearingDeg(
        telemetry.latitudeDeg,
        telemetry.longitudeDeg,
        runwayEnd.latitudeDeg,
        runwayEnd.longitudeDeg
    );
    result.runwayHeadingDeg = geo::normalizeHeadingDeg(runwayEnd.headingDegT);
    result.courseErrorDeg = geo::shortestAngleDifferenceDeg(
        telemetry.headingDeg,
        result.runwayHeadingDeg
    );

    const auto aircraftOffset = geo::projectToLocalMeters(
        runwayEnd.latitudeDeg,
        runwayEnd.longitudeDeg,
        telemetry.latitudeDeg,
        telemetry.longitudeDeg
    );

    const double runwayHeadingRad = geo::degToRad(result.runwayHeadingDeg);
    const double runwayUnitEast = std::sin(runwayHeadingRad);
    const double runwayUnitNorth = std::cos(runwayHeadingRad);

    // Along-track is the aircraft projection onto the inbound final axis.
    // Positive means the aircraft is before the threshold on the approach path;
    // zero is near the threshold; negative means beyond/behind the threshold.
    const double alongTrackM =
        -(aircraftOffset.eastM * runwayUnitEast +
          aircraftOffset.northM * runwayUnitNorth);
    result.alongTrackDistanceNm = alongTrackM / MetersPerNauticalMile;

    // Positive lateral deviation is right of centreline when flying inbound
    // toward the runway; negative is left of centreline.
    const double rightUnitEast = std::cos(runwayHeadingRad);
    const double rightUnitNorth = -std::sin(runwayHeadingRad);
    result.lateralDeviationM =
        aircraftOffset.eastM * rightUnitEast +
        aircraftOffset.northM * rightUnitNorth;

    const double glidepathDistanceNm = std::max(0.0, result.alongTrackDistanceNm);
    const double heightAboveThresholdFt =
        glidepathDistanceNm *
        FeetPerNauticalMile *
        std::tan(geo::degToRad(GlidepathDeg));
    result.glidepathTargetAltitudeFt =
        static_cast<double>(runwayEnd.elevationFt) + heightAboveThresholdFt;
    result.glidepathDeviationFt =
        telemetry.altitudeFt - result.glidepathTargetAltitudeFt;

    evaluateStability(telemetry, result);
    return result;
}

}
