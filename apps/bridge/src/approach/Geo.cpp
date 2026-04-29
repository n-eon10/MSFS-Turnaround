#include "approach/Geo.hpp"

#include <algorithm>
#include <cmath>

namespace msfs_turnaround::geo {
namespace {

constexpr double EarthRadiusMeters = 6371000.0;
constexpr double Wgs84SemiMajorAxisM = 6378137.0;
constexpr double Wgs84Flattening = 1.0 / 298.257223563;
constexpr double Wgs84SemiMinorAxisM =
    Wgs84SemiMajorAxisM * (1.0 - Wgs84Flattening);
constexpr double Wgs84EccentricitySquared =
    Wgs84Flattening * (2.0 - Wgs84Flattening);
constexpr double MetersPerNauticalMile = 1852.0;
constexpr double Pi = 3.14159265358979323846;
constexpr int VincentyMaxIterations = 50;
constexpr double VincentyTolerance = 1e-12;

struct InverseGeodesicResult {
    double distanceMeters = 0.0;
    double initialBearingDeg = 0.0;
};

bool vincentyInverse(
    double lat1Deg,
    double lon1Deg,
    double lat2Deg,
    double lon2Deg,
    InverseGeodesicResult& result
) {
    if (lat1Deg == lat2Deg && lon1Deg == lon2Deg) {
        result.distanceMeters = 0.0;
        result.initialBearingDeg = 0.0;
        return true;
    }

    const double phi1 = degToRad(lat1Deg);
    const double phi2 = degToRad(lat2Deg);
    const double longitudeDifference = degToRad(lon2Deg - lon1Deg);
    const double reducedLat1 =
        std::atan((1.0 - Wgs84Flattening) * std::tan(phi1));
    const double reducedLat2 =
        std::atan((1.0 - Wgs84Flattening) * std::tan(phi2));
    const double sinReducedLat1 = std::sin(reducedLat1);
    const double cosReducedLat1 = std::cos(reducedLat1);
    const double sinReducedLat2 = std::sin(reducedLat2);
    const double cosReducedLat2 = std::cos(reducedLat2);

    double lambda = longitudeDifference;
    double lambdaPrevious = 0.0;
    double sinSigma = 0.0;
    double cosSigma = 0.0;
    double sigma = 0.0;
    double sinAlpha = 0.0;
    double cosSqAlpha = 0.0;
    double cos2SigmaM = 0.0;
    bool converged = false;

    for (int iteration = 0; iteration < VincentyMaxIterations; ++iteration) {
        const double sinLambda = std::sin(lambda);
        const double cosLambda = std::cos(lambda);
        const double sinPart = cosReducedLat2 * sinLambda;
        const double cosPart =
            cosReducedLat1 * sinReducedLat2 -
            sinReducedLat1 * cosReducedLat2 * cosLambda;
        sinSigma = std::sqrt(sinPart * sinPart + cosPart * cosPart);

        if (sinSigma == 0.0) {
            result.distanceMeters = 0.0;
            result.initialBearingDeg = 0.0;
            return true;
        }

        cosSigma =
            sinReducedLat1 * sinReducedLat2 +
            cosReducedLat1 * cosReducedLat2 * cosLambda;
        sigma = std::atan2(sinSigma, cosSigma);
        sinAlpha =
            cosReducedLat1 * cosReducedLat2 * sinLambda / sinSigma;
        cosSqAlpha = 1.0 - sinAlpha * sinAlpha;
        cos2SigmaM =
            cosSqAlpha == 0.0
                ? 0.0
                : cosSigma -
                      (2.0 * sinReducedLat1 * sinReducedLat2 / cosSqAlpha);

        const double coefficient =
            Wgs84Flattening /
            16.0 *
            cosSqAlpha *
            (4.0 + Wgs84Flattening * (4.0 - 3.0 * cosSqAlpha));
        lambdaPrevious = lambda;
        lambda =
            longitudeDifference +
            (1.0 - coefficient) *
                Wgs84Flattening *
                sinAlpha *
                (sigma +
                 coefficient *
                     sinSigma *
                     (cos2SigmaM +
                      coefficient *
                          cosSigma *
                          (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM)));

        if (std::abs(lambda - lambdaPrevious) < VincentyTolerance) {
            converged = true;
            break;
        }
    }

    if (!converged) {
        return false;
    }

    const double uSq =
        cosSqAlpha *
        (Wgs84SemiMajorAxisM * Wgs84SemiMajorAxisM -
         Wgs84SemiMinorAxisM * Wgs84SemiMinorAxisM) /
        (Wgs84SemiMinorAxisM * Wgs84SemiMinorAxisM);
    const double coefficientA =
        1.0 +
        uSq /
            16384.0 *
            (4096.0 + uSq * (-768.0 + uSq * (320.0 - 175.0 * uSq)));
    const double coefficientB =
        uSq /
        1024.0 *
        (256.0 + uSq * (-128.0 + uSq * (74.0 - 47.0 * uSq)));
    const double deltaSigma =
        coefficientB *
        sinSigma *
        (cos2SigmaM +
         coefficientB /
             4.0 *
             (cosSigma * (-1.0 + 2.0 * cos2SigmaM * cos2SigmaM) -
              coefficientB /
                  6.0 *
                  cos2SigmaM *
                  (-3.0 + 4.0 * sinSigma * sinSigma) *
                  (-3.0 + 4.0 * cos2SigmaM * cos2SigmaM)));

    result.distanceMeters =
        Wgs84SemiMinorAxisM * coefficientA * (sigma - deltaSigma);

    const double finalSinLambda = std::sin(lambda);
    const double finalCosLambda = std::cos(lambda);
    const double initialBearingRad =
        std::atan2(
            cosReducedLat2 * finalSinLambda,
            cosReducedLat1 * sinReducedLat2 -
                sinReducedLat1 * cosReducedLat2 * finalCosLambda
        );
    result.initialBearingDeg = normalizeHeadingDeg(radToDeg(initialBearingRad));
    return true;
}

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

double nauticalMilesToMeters(double nauticalMiles) {
    return nauticalMiles * MetersPerNauticalMile;
}

double nauticalMilesToFeet(double nauticalMiles) {
    return nauticalMiles * 6076.12;
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

double ellipsoidDistanceMeters(
    double lat1Deg,
    double lon1Deg,
    double lat2Deg,
    double lon2Deg
) {
    InverseGeodesicResult result;
    if (vincentyInverse(lat1Deg, lon1Deg, lat2Deg, lon2Deg, result)) {
        return result.distanceMeters;
    }

    return haversineDistanceMeters(lat1Deg, lon1Deg, lat2Deg, lon2Deg);
}

double ellipsoidDistanceNm(
    double lat1Deg,
    double lon1Deg,
    double lat2Deg,
    double lon2Deg
) {
    return ellipsoidDistanceMeters(lat1Deg, lon1Deg, lat2Deg, lon2Deg) /
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

double ellipsoidInitialBearingDeg(
    double fromLatDeg,
    double fromLonDeg,
    double toLatDeg,
    double toLonDeg
) {
    InverseGeodesicResult result;
    if (vincentyInverse(fromLatDeg, fromLonDeg, toLatDeg, toLonDeg, result)) {
        return result.initialBearingDeg;
    }

    return initialBearingDeg(fromLatDeg, fromLonDeg, toLatDeg, toLonDeg);
}

LocalOffset projectToLocalMeters(
    double referenceLatDeg,
    double referenceLonDeg,
    double latDeg,
    double lonDeg
) {
    const double referenceLatRad = degToRad(referenceLatDeg);
    const double sinReferenceLat = std::sin(referenceLatRad);
    const double radiusDenominator =
        std::sqrt(1.0 - Wgs84EccentricitySquared * sinReferenceLat * sinReferenceLat);
    const double meridianRadiusM =
        Wgs84SemiMajorAxisM *
        (1.0 - Wgs84EccentricitySquared) /
        (radiusDenominator * radiusDenominator * radiusDenominator);
    const double primeVerticalRadiusM =
        Wgs84SemiMajorAxisM / radiusDenominator;

    const double northM = degToRad(latDeg - referenceLatDeg) * meridianRadiusM;
    const double eastM =
        degToRad(lonDeg - referenceLonDeg) *
        primeVerticalRadiusM *
        std::cos(referenceLatRad);

    return {northM, eastM};
}

GeoPoint destinationPointDeg(
    double startLatDeg,
    double startLonDeg,
    double bearingDeg,
    double distanceM
) {
    const double angularDistance = distanceM / EarthRadiusMeters;
    const double startLatRad = degToRad(startLatDeg);
    const double startLonRad = degToRad(startLonDeg);
    const double bearingRad = degToRad(bearingDeg);

    const double sinStartLat = std::sin(startLatRad);
    const double cosStartLat = std::cos(startLatRad);
    const double sinAngularDistance = std::sin(angularDistance);
    const double cosAngularDistance = std::cos(angularDistance);

    const double destinationLatRad = std::asin(
        sinStartLat * cosAngularDistance +
        cosStartLat * sinAngularDistance * std::cos(bearingRad)
    );
    const double destinationLonRad =
        startLonRad +
        std::atan2(
            std::sin(bearingRad) * sinAngularDistance * cosStartLat,
            cosAngularDistance - sinStartLat * std::sin(destinationLatRad)
        );

    double longitudeDeg = radToDeg(destinationLonRad);
    longitudeDeg = std::fmod(longitudeDeg + 540.0, 360.0) - 180.0;

    return {radToDeg(destinationLatRad), longitudeDeg};
}

}
