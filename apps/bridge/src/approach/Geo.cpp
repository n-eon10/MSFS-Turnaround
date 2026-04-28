#include "approach/Geo.hpp"

#include <algorithm>
#include <cmath>

namespace msfs_turnaround::geo {
namespace {

constexpr double EarthRadiusMeters = 6371000.0;
constexpr double MetersPerNauticalMile = 1852.0;
constexpr double Pi = 3.14159265358979323846;

}

double degToRad(double degrees) {
    return degrees * Pi / 180.0;
}

double radToDeg(double radians) {
    return radians * 180.0 / Pi;
}

double normalizeHeadingDeg(double headingDeg) {
    double normalized = std::fmod(headingDeg, 360.0);
    if (normalized < 0.0) {
        normalized += 360.0;
    }

    return normalized;
}

double shortestAngleDifferenceDeg(double valueDeg, double referenceDeg) {
    double diff = normalizeHeadingDeg(valueDeg - referenceDeg);
    if (diff > 180.0) {
        diff -= 360.0;
    }

    return diff;
}

double haversineDistanceMeters(
    double lat1Deg,
    double lon1Deg,
    double lat2Deg,
    double lon2Deg
) {
    const double lat1 = degToRad(lat1Deg);
    const double lat2 = degToRad(lat2Deg);
    const double dLat = degToRad(lat2Deg - lat1Deg);
    const double dLon = degToRad(lon2Deg - lon1Deg);

    const double sinHalfLat = std::sin(dLat / 2.0);
    const double sinHalfLon = std::sin(dLon / 2.0);
    const double a =
        sinHalfLat * sinHalfLat +
        std::cos(lat1) * std::cos(lat2) * sinHalfLon * sinHalfLon;
    const double clampedA = std::clamp(a, 0.0, 1.0);
    const double c =
        2.0 * std::atan2(std::sqrt(clampedA), std::sqrt(1.0 - clampedA));

    return EarthRadiusMeters * c;
}

double haversineDistanceNm(
    double lat1Deg,
    double lon1Deg,
    double lat2Deg,
    double lon2Deg
) {
    return haversineDistanceMeters(lat1Deg, lon1Deg, lat2Deg, lon2Deg) /
           MetersPerNauticalMile;
}

double initialBearingDeg(
    double fromLatDeg,
    double fromLonDeg,
    double toLatDeg,
    double toLonDeg
) {
    const double fromLat = degToRad(fromLatDeg);
    const double toLat = degToRad(toLatDeg);
    const double dLon = degToRad(toLonDeg - fromLonDeg);

    const double y = std::sin(dLon) * std::cos(toLat);
    const double x =
        std::cos(fromLat) * std::sin(toLat) -
        std::sin(fromLat) * std::cos(toLat) * std::cos(dLon);

    return normalizeHeadingDeg(radToDeg(std::atan2(y, x)));
}

LocalOffset projectToLocalMeters(
    double referenceLatDeg,
    double referenceLonDeg,
    double latDeg,
    double lonDeg
) {
    const double referenceLatRad = degToRad(referenceLatDeg);
    const double northM = degToRad(latDeg - referenceLatDeg) * EarthRadiusMeters;
    const double eastM =
        degToRad(lonDeg - referenceLonDeg) *
        EarthRadiusMeters *
        std::cos(referenceLatRad);

    return {northM, eastM};
}

}
