#pragma once

#include "navdata/Airport.hpp"
#include "navdata/RunwayEnd.hpp"

#include <filesystem>
#include <optional>
#include <string>
#include <vector>

struct sqlite3;

namespace msfs_turnaround {

class NavDatabase {
public:
    NavDatabase() = default;
    ~NavDatabase();

    NavDatabase(const NavDatabase&) = delete;
    NavDatabase& operator=(const NavDatabase&) = delete;

    bool open(const std::filesystem::path& dbPath);
    void close();
    bool isOpen() const;

    std::vector<Airport> searchAirports(const std::string& query, int limit = 20) const;
    std::vector<RunwayEnd> getRunwayEnds(const std::string& airportIdent) const;
    std::optional<RunwayEnd> getRunwayEnd(
        const std::string& airportIdent,
        const std::string& runwayIdent
    ) const;
    std::optional<RunwayEnd> findNearestRunwayEnd(
        double latitudeDeg,
        double longitudeDeg,
        double headingDeg
    ) const;

private:
    sqlite3* database_ = nullptr;
};

}
