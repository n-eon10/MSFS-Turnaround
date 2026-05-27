#include "aircraft/AircraftIdentity.hpp"

#include <algorithm>
#include <cctype>
#include <utility>

namespace msfs_turnaround {
namespace {

bool isSpace(char value) {
    return std::isspace(static_cast<unsigned char>(value)) != 0;
}

std::string trim(std::string value) {
    value.erase(
        value.begin(),
        std::find_if(value.begin(), value.end(), [](char character) {
            return !isSpace(character);
        })
    );
    value.erase(
        std::find_if(value.rbegin(), value.rend(), [](char character) {
            return !isSpace(character);
        }).base(),
        value.end()
    );
    return value;
}

std::string lowercase(std::string value) {
    std::transform(
        value.begin(),
        value.end(),
        value.begin(),
        [](unsigned char character) {
            return static_cast<char>(std::tolower(character));
        }
    );
    return value;
}

bool isUnknownValue(const std::string& value) {
    const std::string normalized = lowercase(trim(value));
    return normalized.empty() ||
           normalized == "unknown" ||
           normalized == "null" ||
           normalized == "none";
}

std::string stripAtcLocalizationKey(const std::string& value) {
    const std::string trimmed = trim(value);
    const std::string lowered = lowercase(trimmed);
    if (lowered.find("atccom.") != 0) {
        return trimmed;
    }

    const auto separator = trimmed.find_first_of(" \t");
    if (separator == std::string::npos) {
        return trimmed;
    }

    std::string token = trim(trimmed.substr(separator + 1));
    const auto dot = token.find('.');
    if (dot != std::string::npos) {
        token = token.substr(0, dot);
    }

    return token.empty() ? trimmed : token;
}

}

std::string normalizeAircraftIdentityField(std::string value) {
    value = stripAtcLocalizationKey(trim(value));
    return isUnknownValue(value) ? "Unknown" : value;
}

AircraftIdentity normalizeAircraftIdentity(AircraftIdentity identity) {
    identity.title = normalizeAircraftIdentityField(std::move(identity.title));
    identity.atcType = normalizeAircraftIdentityField(std::move(identity.atcType));
    identity.atcModel = normalizeAircraftIdentityField(std::move(identity.atcModel));
    return identity;
}

}
