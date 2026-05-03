#include "spawn/SpawnReadinessChecker.hpp"

#include "approach/Geo.hpp"

#include <cmath>

namespace msfs_turnaround {
namespace {

bool simBool(double value) {
    return std::isfinite(value) && std::abs(value) >= 0.5;
}

void issueIf(bool condition, std::vector<std::string>& issues, const std::string& issue) {
    if (condition) {
        issues.push_back(issue);
    }
}

}

SpawnReadinessResult SpawnReadinessChecker::check(
    const AircraftTelemetry& telemetry,
    const ApproachScenario& scenario,
    bool freezeOrHoldActive,
    bool configurationTimedOut
) const {
    SpawnReadinessResult result;

    issueIf(
        simBool(telemetry.simOnGround),
        result.issues,
        "Aircraft is not airborne"
    );

    issueIf(
        scenario.airportIdent.empty() || scenario.runwayIdent.empty(),
        result.issues,
        "Selected runway is not available"
    );

    issueIf(
        !freezeOrHoldActive,
        result.issues,
        "Freeze/hold state is not confirmed"
    );

    if (scenario.gearDown &&
        (!std::isfinite(telemetry.gearHandlePosition) ||
         telemetry.gearHandlePosition < 0.5)) {
        if (configurationTimedOut) {
            result.warnings.push_back("Gear down was not confirmed before readiness");
        } else {
            result.issues.push_back("Gear down is not confirmed");
        }
    }

    if (!std::isfinite(telemetry.flapsHandleIndex) ||
        telemetry.flapsHandleIndex + 0.5 < static_cast<double>(scenario.flapsIndex)) {
        if (configurationTimedOut) {
            result.warnings.push_back("Flaps target was not fully confirmed before readiness");
        } else {
            result.issues.push_back("Flaps are below selected approach configuration");
        }
    }

    if (!std::isfinite(telemetry.indicatedAirspeedKt)) {
        result.issues.push_back("IAS telemetry is not available");
    } else {
        issueIf(
            telemetry.indicatedAirspeedKt < scenario.airspeedKt - 12.0,
            result.issues,
            "IAS is below safe approach speed"
        );
        issueIf(
            telemetry.indicatedAirspeedKt > scenario.airspeedKt + 70.0,
            result.issues,
            "IAS is excessively high"
        );
    }

    issueIf(
        !std::isfinite(telemetry.pitchDeg) ||
            telemetry.pitchDeg < -3.0 ||
            telemetry.pitchDeg > 12.0,
        result.issues,
        "Pitch is outside a safe release range"
    );

    issueIf(
        !std::isfinite(telemetry.bankDeg) ||
            std::abs(telemetry.bankDeg) > 12.0,
        result.issues,
        "Bank is not near wings-level"
    );

    if (std::isfinite(telemetry.verticalSpeedFpm) &&
        std::abs(telemetry.verticalSpeedFpm) > 2500.0) {
        result.issues.push_back("Vertical speed is extreme");
    }

    if (std::isfinite(telemetry.altitudeAboveGroundFt) &&
        telemetry.altitudeAboveGroundFt < 200.0) {
        result.issues.push_back("Radio altitude/AGL is too low for safe release");
    }

    const double positionErrorNm = geo::haversineDistanceNm(
        telemetry.latitudeDeg,
        telemetry.longitudeDeg,
        scenario.spawnLatitudeDeg,
        scenario.spawnLongitudeDeg
    );
    if (!std::isfinite(positionErrorNm) || positionErrorNm > 0.75) {
        result.issues.push_back("Aircraft position is not on the requested final");
    }

    const double headingErrorDeg = std::abs(geo::shortestAngleDifferenceDeg(
        telemetry.headingDeg,
        scenario.spawnHeadingDeg
    ));
    if (!std::isfinite(headingErrorDeg) || headingErrorDeg > 20.0) {
        result.issues.push_back("Aircraft heading is not aligned to runway");
    }

    result.ready = result.issues.empty();
    return result;
}

}
