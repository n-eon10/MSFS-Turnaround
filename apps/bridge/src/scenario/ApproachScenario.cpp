#include "scenario/ApproachScenario.hpp"

#include "approach/Geo.hpp"

#include <cmath>

namespace msfs_turnaround {
namespace {

bool isValidCoordinate(double latitudeDeg, double longitudeDeg) {
    return std::isfinite(latitudeDeg) &&
           std::isfinite(longitudeDeg) &&
           latitudeDeg >= -90.0 &&
           latitudeDeg <= 90.0 &&
           longitudeDeg >= -180.0 &&
           longitudeDeg <= 180.0;
}

bool isInRange(double value, double minimum, double maximum) {
    return std::isfinite(value) && value >= minimum && value <= maximum;
}

}

bool computeApproachScenario(
    const ApproachScenarioRequest& request,
    const RunwayEnd& runwayEnd,
    ApproachScenario& scenario,
    std::string& error
) {
    if (!isInRange(request.distanceNm, 1.0, 25.0)) {
        error = "Distance must be between 1 and 25 NM";
        return false;
    }

    if (!isInRange(request.glidepathDeg, 2.0, 4.5)) {
        error = "Glidepath must be between 2.0 and 4.5 degrees";
        return false;
    }

    if (!isInRange(request.airspeedKt, 40.0, 250.0)) {
        error = "Airspeed must be between 40 and 250 kt";
        return false;
    }

    if (request.flapsIndex < 0 || request.flapsIndex > 10) {
        error = "Flaps index must be between 0 and 10";
        return false;
    }

    if (!isValidCoordinate(runwayEnd.latitudeDeg, runwayEnd.longitudeDeg)) {
        error = "Runway threshold position unavailable";
        return false;
    }

    if (!std::isfinite(runwayEnd.headingDegT)) {
        error = "Runway heading unavailable";
        return false;
    }

    const double runwayHeadingDeg = geo::normalizeHeadingDeg(runwayEnd.headingDegT);
    const double spawnBearingDeg = geo::normalizeHeadingDeg(runwayHeadingDeg + 180.0);
    const double spawnDistanceM = geo::nauticalMilesToMeters(request.distanceNm);
    const auto spawnPoint = geo::destinationPointDeg(
        runwayEnd.latitudeDeg,
        runwayEnd.longitudeDeg,
        spawnBearingDeg,
        spawnDistanceM
    );
    const double heightAboveThresholdFt =
        geo::nauticalMilesToFeet(request.distanceNm) *
        std::tan(geo::degToRad(request.glidepathDeg));

    scenario.airportIdent =
        request.airportIdent.empty() ? runwayEnd.airportIdent : request.airportIdent;
    scenario.runwayIdent =
        request.runwayIdent.empty() ? runwayEnd.runwayIdent : request.runwayIdent;
    scenario.distanceNm = request.distanceNm;
    scenario.glidepathDeg = request.glidepathDeg;
    scenario.airspeedKt = request.airspeedKt;
    scenario.gearDown = request.gearDown;
    scenario.flapsIndex = request.flapsIndex;
    scenario.pauseAfterSpawn = request.pauseAfterSpawn;
    scenario.spawnLatitudeDeg = spawnPoint.latitudeDeg;
    scenario.spawnLongitudeDeg = spawnPoint.longitudeDeg;
    scenario.spawnAltitudeFt =
        static_cast<double>(runwayEnd.elevationFt) + heightAboveThresholdFt;
    scenario.spawnHeadingDeg = runwayHeadingDeg;
    scenario.thresholdLatitudeDeg = runwayEnd.latitudeDeg;
    scenario.thresholdLongitudeDeg = runwayEnd.longitudeDeg;
    scenario.thresholdElevationFt = static_cast<double>(runwayEnd.elevationFt);
    return true;
}

ScenarioSpawnResult scenarioResultFromScenario(const ApproachScenario& scenario) {
    ScenarioSpawnResult result;
    result.airportIdent = scenario.airportIdent;
    result.runwayIdent = scenario.runwayIdent;
    result.distanceNm = scenario.distanceNm;
    result.glidepathDeg = scenario.glidepathDeg;
    result.airspeedKt = scenario.airspeedKt;
    result.spawnLatitudeDeg = scenario.spawnLatitudeDeg;
    result.spawnLongitudeDeg = scenario.spawnLongitudeDeg;
    result.spawnAltitudeFt = scenario.spawnAltitudeFt;
    result.spawnHeadingDeg = scenario.spawnHeadingDeg;
    result.gearRequested = scenario.gearDown;
    result.flapsRequested = scenario.flapsIndex > 0;
    result.parkingBrakeRequested = true;
    result.pauseRequested = scenario.pauseAfterSpawn;
    return result;
}

}
