#pragma once

#include "msfs_turnaround/aircraft_telemetry.hpp"
#include "navdata/RunwayEnd.hpp"

#include <string>
#include <vector>

namespace msfs_turnaround {

struct ApproachGuidanceResult {
    std::string airportIdent;
    std::string runwayIdent;

    double distanceNm = 0.0;
    double bearingToThresholdDeg = 0.0;
    double runwayHeadingDeg = 0.0;
    double courseErrorDeg = 0.0;

    double lateralDeviationM = 0.0;
    double alongTrackDistanceNm = 0.0;

    double glidepathDeg = 3.0;
    double glidepathTargetAltitudeFt = 0.0;
    double glidepathDeviationFt = 0.0;

    bool stable = false;
    std::vector<std::string> issues;
};

ApproachGuidanceResult computeApproachGuidance(
    const AircraftTelemetry& telemetry,
    const RunwayEnd& runwayEnd
);

}
