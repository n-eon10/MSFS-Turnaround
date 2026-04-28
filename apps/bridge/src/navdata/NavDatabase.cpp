#include "navdata/NavDatabase.hpp"

#include <sqlite3.h>

#include <algorithm>
#include <cctype>
#include <iostream>

namespace msfs_turnaround {
namespace {

std::string columnText(sqlite3_stmt* statement, int column) {
    if (sqlite3_column_type(statement, column) == SQLITE_NULL) {
        return {};
    }

    const auto* text = sqlite3_column_text(statement, column);
    return text != nullptr ? reinterpret_cast<const char*>(text) : std::string{};
}

double columnDouble(sqlite3_stmt* statement, int column) {
    if (sqlite3_column_type(statement, column) == SQLITE_NULL) {
        return 0.0;
    }

    return sqlite3_column_double(statement, column);
}

int columnInt(sqlite3_stmt* statement, int column) {
    if (sqlite3_column_type(statement, column) == SQLITE_NULL) {
        return 0;
    }

    return sqlite3_column_int(statement, column);
}

std::string trim(const std::string& value) {
    auto begin = value.begin();
    while (begin != value.end() && std::isspace(static_cast<unsigned char>(*begin))) {
        ++begin;
    }

    auto end = value.end();
    while (end != begin && std::isspace(static_cast<unsigned char>(*(end - 1)))) {
        --end;
    }

    return {begin, end};
}

Airport airportFromStatement(sqlite3_stmt* statement) {
    Airport airport;
    airport.ident = columnText(statement, 0);
    airport.type = columnText(statement, 1);
    airport.name = columnText(statement, 2);
    airport.latitudeDeg = columnDouble(statement, 3);
    airport.longitudeDeg = columnDouble(statement, 4);
    airport.elevationFt = columnInt(statement, 5);
    airport.isoCountry = columnText(statement, 6);
    airport.municipality = columnText(statement, 7);
    return airport;
}

RunwayEnd runwayEndFromStatement(sqlite3_stmt* statement) {
    RunwayEnd runwayEnd;
    runwayEnd.airportIdent = columnText(statement, 0);
    runwayEnd.runwayIdent = columnText(statement, 1);
    runwayEnd.oppositeIdent = columnText(statement, 2);
    runwayEnd.latitudeDeg = columnDouble(statement, 3);
    runwayEnd.longitudeDeg = columnDouble(statement, 4);
    runwayEnd.elevationFt = columnInt(statement, 5);
    runwayEnd.headingDegT = columnDouble(statement, 6);
    runwayEnd.displacedThresholdFt = columnInt(statement, 7);
    runwayEnd.lengthFt = columnInt(statement, 8);
    runwayEnd.widthFt = columnInt(statement, 9);
    runwayEnd.surface = columnText(statement, 10);
    runwayEnd.lighted = columnInt(statement, 11) != 0;
    runwayEnd.closed = columnInt(statement, 12) != 0;
    return runwayEnd;
}

void logSqliteError(sqlite3* database, const std::string& context) {
    std::cerr << context << ": " << sqlite3_errmsg(database) << std::endl;
}

}

NavDatabase::~NavDatabase() {
    close();
}

bool NavDatabase::open(const std::filesystem::path& dbPath) {
    close();

    if (!std::filesystem::exists(dbPath)) {
        std::cerr << "Navdata database not found: " << dbPath
                  << ". Navdata WebSocket messages will be disabled."
                  << std::endl;
        return false;
    }

    const int result = sqlite3_open_v2(
        dbPath.string().c_str(),
        &database_,
        SQLITE_OPEN_READONLY,
        nullptr
    );

    if (result != SQLITE_OK) {
        logSqliteError(database_, "Failed to open navdata database");
        close();
        return false;
    }

    std::cout << "Loaded navdata database: " << dbPath << std::endl;
    return true;
}

void NavDatabase::close() {
    if (database_ != nullptr) {
        sqlite3_close(database_);
        database_ = nullptr;
    }
}

bool NavDatabase::isOpen() const {
    return database_ != nullptr;
}

std::vector<Airport> NavDatabase::searchAirports(
    const std::string& query,
    int limit
) const {
    std::vector<Airport> airports;
    if (!isOpen()) {
        return airports;
    }

    const std::string cleanedQuery = trim(query);
    if (cleanedQuery.empty()) {
        return airports;
    }

    limit = std::clamp(limit, 1, 100);

    constexpr const char* sql = R"sql(
        SELECT
            ident,
            type,
            name,
            latitude_deg,
            longitude_deg,
            elevation_ft,
            iso_country,
            municipality
        FROM airports
        WHERE ident LIKE ?1 COLLATE NOCASE
           OR name LIKE ?2 COLLATE NOCASE
           OR municipality LIKE ?2 COLLATE NOCASE
        ORDER BY
            CASE WHEN ident LIKE ?1 COLLATE NOCASE THEN 0 ELSE 1 END,
            ident COLLATE NOCASE
        LIMIT ?3
    )sql";

    sqlite3_stmt* statement = nullptr;
    if (sqlite3_prepare_v2(database_, sql, -1, &statement, nullptr) != SQLITE_OK) {
        logSqliteError(database_, "Failed to prepare airport search");
        return airports;
    }

    const std::string prefixPattern = cleanedQuery + "%";
    const std::string containsPattern = "%" + cleanedQuery + "%";
    sqlite3_bind_text(statement, 1, prefixPattern.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(statement, 2, containsPattern.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(statement, 3, limit);

    while (sqlite3_step(statement) == SQLITE_ROW) {
        airports.push_back(airportFromStatement(statement));
    }

    sqlite3_finalize(statement);
    return airports;
}

std::vector<RunwayEnd> NavDatabase::getRunwayEnds(
    const std::string& airportIdent
) const {
    std::vector<RunwayEnd> runwayEnds;
    if (!isOpen()) {
        return runwayEnds;
    }

    const std::string cleanedAirportIdent = trim(airportIdent);
    if (cleanedAirportIdent.empty()) {
        return runwayEnds;
    }

    constexpr const char* sql = R"sql(
        SELECT
            airport_ident,
            runway_ident,
            opposite_ident,
            latitude_deg,
            longitude_deg,
            elevation_ft,
            heading_degT,
            displaced_threshold_ft,
            length_ft,
            width_ft,
            surface,
            lighted,
            closed
        FROM runway_ends
        WHERE airport_ident = ?1 COLLATE NOCASE
        ORDER BY runway_ident COLLATE NOCASE
    )sql";

    sqlite3_stmt* statement = nullptr;
    if (sqlite3_prepare_v2(database_, sql, -1, &statement, nullptr) != SQLITE_OK) {
        logSqliteError(database_, "Failed to prepare runway lookup");
        return runwayEnds;
    }

    sqlite3_bind_text(statement, 1, cleanedAirportIdent.c_str(), -1, SQLITE_TRANSIENT);

    while (sqlite3_step(statement) == SQLITE_ROW) {
        runwayEnds.push_back(runwayEndFromStatement(statement));
    }

    sqlite3_finalize(statement);
    return runwayEnds;
}

std::optional<RunwayEnd> NavDatabase::getRunwayEnd(
    const std::string& airportIdent,
    const std::string& runwayIdent
) const {
    if (!isOpen()) {
        return std::nullopt;
    }

    const std::string cleanedAirportIdent = trim(airportIdent);
    const std::string cleanedRunwayIdent = trim(runwayIdent);
    if (cleanedAirportIdent.empty() || cleanedRunwayIdent.empty()) {
        return std::nullopt;
    }

    constexpr const char* sql = R"sql(
        SELECT
            airport_ident,
            runway_ident,
            opposite_ident,
            latitude_deg,
            longitude_deg,
            elevation_ft,
            heading_degT,
            displaced_threshold_ft,
            length_ft,
            width_ft,
            surface,
            lighted,
            closed
        FROM runway_ends
        WHERE airport_ident = ?1 COLLATE NOCASE
          AND runway_ident = ?2 COLLATE NOCASE
        LIMIT 1
    )sql";

    sqlite3_stmt* statement = nullptr;
    if (sqlite3_prepare_v2(database_, sql, -1, &statement, nullptr) != SQLITE_OK) {
        logSqliteError(database_, "Failed to prepare single runway lookup");
        return std::nullopt;
    }

    sqlite3_bind_text(statement, 1, cleanedAirportIdent.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(statement, 2, cleanedRunwayIdent.c_str(), -1, SQLITE_TRANSIENT);

    std::optional<RunwayEnd> runwayEnd;
    if (sqlite3_step(statement) == SQLITE_ROW) {
        runwayEnd = runwayEndFromStatement(statement);
    }

    sqlite3_finalize(statement);
    return runwayEnd;
}

}
