#pragma once

#include <string>

namespace msfs_turnaround {

struct AircraftIdentity {
    std::string title = "Unknown";
    std::string atcType = "Unknown";
    std::string atcModel = "Unknown";
    std::string detectedFamily = "unknown";
    std::string detectedVariant = "unknown";
    bool isKnownAircraft = false;
};

inline bool operator==(const AircraftIdentity& left, const AircraftIdentity& right) {
    return left.title == right.title &&
           left.atcType == right.atcType &&
           left.atcModel == right.atcModel &&
           left.detectedFamily == right.detectedFamily &&
           left.detectedVariant == right.detectedVariant &&
           left.isKnownAircraft == right.isKnownAircraft;
}

inline bool operator!=(const AircraftIdentity& left, const AircraftIdentity& right) {
    return !(left == right);
}

}
