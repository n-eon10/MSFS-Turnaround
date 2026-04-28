#pragma once

#include <string>

namespace msfs_turnaround {

struct Airport {
    std::string ident;
    std::string type;
    std::string name;
    double latitudeDeg = 0.0;
    double longitudeDeg = 0.0;
    int elevationFt = 0;
    std::string isoCountry;
    std::string municipality;
};

}
