#include "msfs_turnaround/simconnect_client.hpp"
#include "msfs_turnaround/websocket_server.hpp"

#include "msfs_turnaround/landing_analysis.hpp"
#include "navdata/NavDatabase.hpp"

#include <ixwebsocket/IXNetSystem.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <filesystem>
#include <functional>
#include <iostream>
#include <mutex>
#include <optional>
#include <thread>

namespace {

std::string telemetryToJson(const msfs_turnaround::AircraftTelemetry& telemetry) {
    nlohmann::json message = {
        {"type", "aircraft.telemetry"},
        {"payload", {
            {"latitudeDeg", telemetry.latitudeDeg},
            {"longitudeDeg", telemetry.longitudeDeg},
            {"altitudeFt", telemetry.altitudeFt},
            {"indicatedAirspeedKt", telemetry.indicatedAirspeedKt},
            {"verticalSpeedFpm", telemetry.verticalSpeedFpm},
            {"headingDeg", telemetry.headingDeg},
            {"gearHandlePosition", telemetry.gearHandlePosition},
            {"flapsHandleIndex", telemetry.flapsHandleIndex},
            {"simOnGround", telemetry.simOnGround},
            {"groundSpeedKt", telemetry.groundSpeedKt},
            {"altitudeAboveGroundFt", telemetry.altitudeAboveGroundFt},
            {"pitchDeg", telemetry.pitchDeg},
            {"bankDeg", telemetry.bankDeg},
            {"gForce", telemetry.gForce}
        }}
    };

    return message.dump();
}

std::string landingAnalysisToJson(const msfs_turnaround::LandingAnalysis& analysis) {
    nlohmann::json message = {
        {"type", "landing.analysis"},
        {"payload", {
            {"touchdownVerticalSpeedFpm", analysis.touchdownVerticalSpeedFpm},
            {"touchdownAirspeedKt", analysis.touchdownAirspeedKt},
            {"touchdownHeadingDeg", analysis.touchdownHeadingDeg},
            {"touchdownLatitudeDeg", analysis.touchdownLatitudeDeg},
            {"touchdownLongitudeDeg", analysis.touchdownLongitudeDeg},
            {"touchdownPitchDeg", analysis.touchdownPitchDeg},
            {"touchdownBankDeg", analysis.touchdownBankDeg},
            {"touchdownGForce", analysis.touchdownGForce},
            {"score", analysis.score}
        }}
    };

    return message.dump();
}

std::filesystem::path parseNavdataPath(int argc, char** argv) {
    std::filesystem::path navdataPath = "data/processed/navdata.sqlite";

    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i] != nullptr ? argv[i] : "";
        if (arg == "--navdata") {
            if (i + 1 >= argc || argv[i + 1] == nullptr) {
                std::cerr << "--navdata requires a database path." << std::endl;
                break;
            }

            navdataPath = argv[i + 1];
            ++i;
        }
    }

    return navdataPath;
}

nlohmann::json airportToJson(const msfs_turnaround::Airport& airport) {
    return {
        {"ident", airport.ident},
        {"name", airport.name},
        {"type", airport.type},
        {"latitudeDeg", airport.latitudeDeg},
        {"longitudeDeg", airport.longitudeDeg},
        {"elevationFt", airport.elevationFt},
        {"isoCountry", airport.isoCountry},
        {"municipality", airport.municipality}
    };
}

nlohmann::json runwayEndToJson(const msfs_turnaround::RunwayEnd& runwayEnd) {
    return {
        {"airportIdent", runwayEnd.airportIdent},
        {"runwayIdent", runwayEnd.runwayIdent},
        {"oppositeIdent", runwayEnd.oppositeIdent},
        {"latitudeDeg", runwayEnd.latitudeDeg},
        {"longitudeDeg", runwayEnd.longitudeDeg},
        {"elevationFt", runwayEnd.elevationFt},
        {"headingDegT", runwayEnd.headingDegT},
        {"displacedThresholdFt", runwayEnd.displacedThresholdFt},
        {"lengthFt", runwayEnd.lengthFt},
        {"widthFt", runwayEnd.widthFt},
        {"surface", runwayEnd.surface},
        {"lighted", runwayEnd.lighted},
        {"closed", runwayEnd.closed}
    };
}

std::string jsonString(const nlohmann::json& message, const char* key) {
    const auto it = message.find(key);
    if (it == message.end() || !it->is_string()) {
        return {};
    }

    return it->get<std::string>();
}

int jsonInt(const nlohmann::json& message, const char* key, int fallback) {
    const auto it = message.find(key);
    if (it == message.end()) {
        return fallback;
    }

    if (it->is_number_integer() || it->is_number_unsigned()) {
        return it->get<int>();
    }

    return fallback;
}

void sendJson(
    const std::function<void(const std::string&)>& send,
    const nlohmann::json& message
) {
    send(message.dump());
}

void handleClientMessage(
    const std::string& rawMessage,
    msfs_turnaround::NavDatabase& navDatabase,
    std::mutex& activeRunwayMutex,
    std::optional<msfs_turnaround::RunwayEnd>& activeRunway,
    const std::function<void(const std::string&)>& send
) {
    nlohmann::json message;

    try {
        message = nlohmann::json::parse(rawMessage);
    } catch (const nlohmann::json::parse_error& error) {
        std::cerr << "Ignoring malformed WebSocket JSON: " << error.what() << std::endl;
        return;
    }

    const std::string type = jsonString(message, "type");

    if (type == "navdata.search_airports") {
        const std::string query = jsonString(message, "query");
        const int limit = jsonInt(message, "limit", 20);
        nlohmann::json response = {
            {"type", "navdata.search_airports.result"},
            {"query", query},
            {"airports", nlohmann::json::array()}
        };

        if (!navDatabase.isOpen()) {
            response["error"] = "Navdata database is not available";
            sendJson(send, response);
            return;
        }

        for (const auto& airport : navDatabase.searchAirports(query, limit)) {
            response["airports"].push_back(airportToJson(airport));
        }

        sendJson(send, response);
        return;
    }

    if (type == "navdata.get_runways") {
        const std::string airportIdent = jsonString(message, "airportIdent");
        nlohmann::json response = {
            {"type", "navdata.get_runways.result"},
            {"airportIdent", airportIdent},
            {"runways", nlohmann::json::array()}
        };

        if (!navDatabase.isOpen()) {
            response["error"] = "Navdata database is not available";
            sendJson(send, response);
            return;
        }

        for (const auto& runwayEnd : navDatabase.getRunwayEnds(airportIdent)) {
            response["runways"].push_back(runwayEndToJson(runwayEnd));
        }

        sendJson(send, response);
        return;
    }

    if (type == "approach.select_runway") {
        const std::string airportIdent = jsonString(message, "airportIdent");
        const std::string runwayIdent = jsonString(message, "runwayIdent");
        nlohmann::json response = {
            {"type", "approach.select_runway.result"},
            {"ok", false},
            {"airportIdent", airportIdent},
            {"runwayIdent", runwayIdent}
        };

        if (!navDatabase.isOpen()) {
            response["error"] = "Navdata database is not available";
            sendJson(send, response);
            return;
        }

        auto runwayEnd = navDatabase.getRunwayEnd(airportIdent, runwayIdent);
        if (!runwayEnd) {
            response["error"] = "Runway not found";
            sendJson(send, response);
            return;
        }

        {
            std::lock_guard<std::mutex> lock(activeRunwayMutex);
            activeRunway = runwayEnd;
        }

        response["ok"] = true;
        sendJson(send, response);
        return;
    }
}

}

int main(int argc, char** argv) {
    std::cout << "MSFS Turnaround Bridge starting..." << std::endl;

    ix::initNetSystem();

    msfs_turnaround::NavDatabase navDatabase;
    navDatabase.open(parseNavdataPath(argc, argv));

    std::mutex activeRunwayMutex;
    std::optional<msfs_turnaround::RunwayEnd> activeRunway;

    msfs_turnaround::WebSocketServer webSocketServer(48787);
    webSocketServer.setClientMessageHandler(
        [&navDatabase, &activeRunwayMutex, &activeRunway](
            const std::string& rawMessage,
            const std::function<void(const std::string&)>& send
        ) {
            handleClientMessage(
                rawMessage,
                navDatabase,
                activeRunwayMutex,
                activeRunway,
                send
            );
        }
    );

    if (!webSocketServer.start()) {
        ix::uninitNetSystem();
        return 1;
    }

    msfs_turnaround::SimConnectClient simConnectClient;

    if (!simConnectClient.connect()) {
        webSocketServer.stop();
        ix::uninitNetSystem();
        return 1;
    }

    msfs_turnaround::LandingDetector landingDetector;

    simConnectClient.setTelemetryCallback(
        [&webSocketServer, &landingDetector](const msfs_turnaround::AircraftTelemetry& telemetry) {
            webSocketServer.broadcast(telemetryToJson(telemetry));

            if (landingDetector.update(telemetry)) {
                const auto& analysis = landingDetector.latestLanding();
                webSocketServer.broadcast(landingAnalysisToJson(analysis));

                std::cout
                    << "Landing detected: VS="
                    << analysis.touchdownVerticalSpeedFpm
                    << " FPM IAS="
                    << analysis.touchdownAirspeedKt
                    << " KT SCORE="
                    << analysis.score
                    << std::endl;
            }
        }
    );

    simConnectClient.requestAircraftTelemetry();

    std::cout << "Streaming telemetry to WebSocket clients." << std::endl;
    std::cout << "Endpoint: ws://localhost:48787" << std::endl;

    while (true) {
        simConnectClient.poll();
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }

    simConnectClient.close();
    webSocketServer.stop();
    ix::uninitNetSystem();

    return 0;
}
