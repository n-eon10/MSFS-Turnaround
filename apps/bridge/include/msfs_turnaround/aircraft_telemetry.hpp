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
    double touchdownNormalVelocityFps;
    double touchdownPitchDeg;
    double touchdownBankDeg;
    double touchdownHeadingDeg;
    double touchdownLatitudeDeg;
    double touchdownLongitudeDeg;
    double latitudeLongitudeFreezeOn;
    double altitudeFreezeOn;
    double attitudeFreezeOn;
    double trueAirspeedKt;
    double throttlePercent;
    double elevatorTrimPercent;
    double angleOfAttackDeg;
};

}
