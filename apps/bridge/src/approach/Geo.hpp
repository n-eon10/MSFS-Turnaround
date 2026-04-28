#pragma once

namespace msfs_turnaround::geo {

struct LocalOffset {
    double northM = 0.0;
    double eastM = 0.0;
};

double degToRad(double degrees);
double radToDeg(double radians);
double normalizeHeadingDeg(double headingDeg);
double shortestAngleDifferenceDeg(double valueDeg, double referenceDeg);
double haversineDistanceMeters(
    double lat1Deg,
    double lon1Deg,
    double lat2Deg,
    double lon2Deg
);
double haversineDistanceNm(
    double lat1Deg,
    double lon1Deg,
    double lat2Deg,
    double lon2Deg
);
double initialBearingDeg(
    double fromLatDeg,
    double fromLonDeg,
    double toLatDeg,
    double toLonDeg
);
LocalOffset projectToLocalMeters(
    double referenceLatDeg,
    double referenceLonDeg,
    double latDeg,
    double lonDeg
);

}
