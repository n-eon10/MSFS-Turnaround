#pragma once

namespace msfs_turnaround {

struct AircraftTelemetry {
    double latitudeDeg;
    double longitudeDeg;
    double altitudeFt;
    double indicatedAirspeedKt;
    double verticalSpeedFpm;
    double headingDeg;
    double gearHandlePosition;
    double flapsHandleIndex;
    double simOnGround;
    double groundSpeedKt;
    double altitudeAboveGroundFt;
    double pitchDeg;
    double bankDeg;
    double gForce;
};

}
