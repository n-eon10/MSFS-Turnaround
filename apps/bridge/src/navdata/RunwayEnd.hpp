#pragma once

#include <string>

namespace msfs_turnaround {

struct RunwayEnd {
    std::string airportIdent;
    std::string runwayIdent;
    std::string oppositeIdent;
    double latitudeDeg = 0.0;
    double longitudeDeg = 0.0;
    int elevationFt = 0;
    double headingDegT = 0.0;
    int displacedThresholdFt = 0;
    int lengthFt = 0;
    int widthFt = 0;
    std::string surface;
    bool lighted = false;
    bool closed = false;
};

}
