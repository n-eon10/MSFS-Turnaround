#pragma once

namespace msfs_turnaround {

struct AircraftAdapterCapabilities {
    bool canSetGear = false;
    bool canSetFlaps = false;
    bool canSetSpoilers = false;
    bool canSetAutobrake = false;
    bool canSetLandingLights = false;
    bool canSetAutopilot = false;
    bool canSetNavRadio = false;
    bool canSetApproachMode = false;
    bool canConfigureFms = false;
    bool canVerifyFlaps = false;
    bool canVerifyGear = false;
    bool requiresAircraftSpecificSdk = false;
};

}
