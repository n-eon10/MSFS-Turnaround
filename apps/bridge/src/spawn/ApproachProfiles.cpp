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

    switch (profile) {
        case ApproachProfileId::GenericJet:
            target.targetPitchDeg = 2.5;
            target.targetTrimPct = 0.06;
            target.targetThrustPct = 0.55;
            target.speedTolKt = 6.0;
            target.vsTolFpm = 250.0;
            target.pitchTolDeg = 3.0;
            target.bankTolDeg = 4.0;
            break;

        case ApproachProfileId::GenericTurboprop:
            target.targetPitchDeg = 3.0;
            target.targetTrimPct = 0.08;
            target.targetThrustPct = 0.45;
            target.speedTolKt = 7.0;
            target.vsTolFpm = 250.0;
            target.pitchTolDeg = 3.5;
            target.bankTolDeg = 5.0;
            break;

        case ApproachProfileId::GenericGa:
            target.targetPitchDeg = 4.0;
            target.targetTrimPct = 0.10;
            target.targetThrustPct = 0.40;
            target.speedTolKt = 8.0;
            target.vsTolFpm = 300.0;
            target.pitchTolDeg = 4.0;
            target.bankTolDeg = 6.0;
            break;

        case ApproachProfileId::FenixA320:
        case ApproachProfileId::FbwA32nx:
            target.targetPitchDeg = 2.5;
            target.targetTrimPct = 0.05;
            target.targetThrustPct = 0.55;
            target.speedTolKt = 5.0;
            target.vsTolFpm = 200.0;
            target.pitchTolDeg = 2.5;
            target.bankTolDeg = 3.0;
            break;

        case ApproachProfileId::Pmdg737:
            target.targetPitchDeg = 2.0;
            target.targetTrimPct = 0.05;
            target.targetThrustPct = 0.58;
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
