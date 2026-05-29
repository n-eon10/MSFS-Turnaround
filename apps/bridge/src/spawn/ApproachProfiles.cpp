#include "spawn/ApproachProfiles.hpp"

namespace msfs_turnaround {
namespace {

// Base target derived purely from the requested scenario; profiles then tune the
// references and tolerances on top of it.
ApproachEnergyTarget baseTarget(const ApproachScenario& scenario) {
    ApproachEnergyTarget target;
    target.targetIasKt = scenario.airspeedKt;
    target.targetDescentRateFpm =
        targetDescentRateFpm(scenario.airspeedKt, scenario.glidepathDeg);
    return target;
}

}

ApproachProfileId selectApproachProfileId(
    const std::string& detectedFamily,
    const std::string& detectedVariant
) {
    (void)detectedVariant;

    if (detectedFamily == "fenix") {
        return ApproachProfileId::FenixA320;
    }
    if (detectedFamily == "pmdg") {
        return ApproachProfileId::Pmdg737;
    }
    if (detectedFamily == "fbw") {
        return ApproachProfileId::FbwA32nx;
    }

    return ApproachProfileId::GenericJet;
}

ApproachEnergyTarget makeApproachEnergyTarget(
    ApproachProfileId profile,
    const ApproachScenario& scenario
) {
    ApproachEnergyTarget target = baseTarget(scenario);

    // Trim injection is the lever that stops the released aircraft from porpoising
    // (hunting for its trimmed speed stick-free). targetTrimPct is a fraction matching
    // the ELEVATOR TRIM PCT SimVar (positive = nose up). These are reasonable
    // approach-trim starting points; tune per aircraft against the TRIM telemetry.
    // Thrust and autopilot hold remain off by default.
    switch (profile) {
        case ApproachProfileId::GenericJet:
            target.targetPitchDeg = 2.5;
            target.targetTrimPct = 0.12;
            target.targetThrustPct = 0.55;
            target.injectTrim = true;
            target.speedTolKt = 6.0;
            target.vsTolFpm = 250.0;
            target.pitchTolDeg = 3.0;
            target.bankTolDeg = 4.0;
            break;

        case ApproachProfileId::GenericTurboprop:
            target.targetPitchDeg = 3.0;
            target.targetTrimPct = 0.14;
            target.targetThrustPct = 0.45;
            target.injectTrim = true;
            target.speedTolKt = 7.0;
            target.vsTolFpm = 250.0;
            target.pitchTolDeg = 3.5;
            target.bankTolDeg = 5.0;
            break;

        case ApproachProfileId::GenericGa:
            target.targetPitchDeg = 4.0;
            target.targetTrimPct = 0.16;
            target.targetThrustPct = 0.40;
            target.injectTrim = true;
            target.speedTolKt = 8.0;
            target.vsTolFpm = 300.0;
            target.pitchTolDeg = 4.0;
            target.bankTolDeg = 6.0;
            break;

        case ApproachProfileId::FenixA320:
            target.targetPitchDeg = 2.5;
            target.targetTrimPct = 0.10;
            target.targetThrustPct = 0.55;
            target.injectTrim = true;
            target.speedTolKt = 5.0;
            target.vsTolFpm = 200.0;
            target.pitchTolDeg = 2.5;
            target.bankTolDeg = 3.0;
            break;

        case ApproachProfileId::FbwA32nx:
            // FBW normal law auto-trims; manual trim injection fights it, so leave it
            // off and rely on velocity + pitch matching.
            target.targetPitchDeg = 2.5;
            target.targetTrimPct = 0.0;
            target.targetThrustPct = 0.55;
            target.injectTrim = false;
            target.speedTolKt = 5.0;
            target.vsTolFpm = 200.0;
            target.pitchTolDeg = 2.5;
            target.bankTolDeg = 3.0;
            break;

        case ApproachProfileId::Pmdg737:
            target.targetPitchDeg = 2.0;
            target.targetTrimPct = 0.10;
            target.targetThrustPct = 0.58;
            target.injectTrim = true;
            target.speedTolKt = 5.0;
            target.vsTolFpm = 200.0;
            target.pitchTolDeg = 2.5;
            target.bankTolDeg = 3.0;
            break;
    }

    return target;
}

ApproachEnergyTarget selectApproachEnergyTarget(
    const std::string& detectedFamily,
    const std::string& detectedVariant,
    const ApproachScenario& scenario
) {
    return makeApproachEnergyTarget(
        selectApproachProfileId(detectedFamily, detectedVariant),
        scenario
    );
}

}
