#pragma once

#include "approach/ApproachGuidance.hpp"
#include "msfs_turnaround/aircraft_telemetry.hpp"

#include <optional>
#include <string>
#include <vector>

namespace msfs_turnaround {

struct StableApproachGateResult {
    int gateAglFt = 0;
    bool stable = false;

    std::string airportIdent;
    std::string runwayIdent;

    double radioAltitudeFt = 0.0;
    double distanceNm = 0.0;
    double courseErrorDeg = 0.0;
    double lateralDeviationM = 0.0;
    double glidepathDeviationFt = 0.0;

    double indicatedAirspeedKt = 0.0;
    double verticalSpeedFpm = 0.0;
    double bankDeg = 0.0;
    double pitchDeg = 0.0;

    std::vector<std::string> issues;
};

class StableApproachMonitor {
public:
    void reset();
    void resetForNewApproach();

    std::optional<StableApproachGateResult> update(
        const AircraftTelemetry& telemetry,
        const ApproachGuidanceResult& guidance
    );

    const std::optional<StableApproachGateResult>& gate1000() const;
    const std::optional<StableApproachGateResult>& gate500() const;

private:
    std::optional<double> previousRadioAltitudeFt_;
    std::optional<StableApproachGateResult> gate1000_;
    std::optional<StableApproachGateResult> gate500_;
    bool pendingGate500_ = false;
};

}
