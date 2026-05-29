#pragma once

#include "scenario/ApproachScenario.hpp"
#include "spawn/ApproachEnergyState.hpp"

#include <string>

namespace msfs_turnaround {

// Aircraft-specific stabilized-approach profiles. A profile turns the requested
// scenario (speed, glidepath) into a complete ApproachEnergyTarget, applying
// per-type pitch/trim/thrust references and tolerances.
//
// Extension point: add a named profile here and route a (family, variant) to it.
// Currently wired families: fenix, pmdg, fbw, generic. Turboprop/GA profiles exist
// and are selectable by name for when aircraft classification can detect them.
enum class ApproachProfileId {
    GenericJet,
    GenericTurboprop,
    GenericGa,
    FenixA320,
    Pmdg737,
    FbwA32nx,
};

ApproachProfileId selectApproachProfileId(
    const std::string& detectedFamily,
    const std::string& detectedVariant
);

ApproachEnergyTarget makeApproachEnergyTarget(
    ApproachProfileId profile,
    const ApproachScenario& scenario
);

// Convenience: classify then build in one step.
ApproachEnergyTarget selectApproachEnergyTarget(
    const std::string& detectedFamily,
    const std::string& detectedVariant,
    const ApproachScenario& scenario
);

}
