#include "msfs_turnaround/simconnect_client.hpp"
#include "msfs_turnaround/websocket_server.hpp"

#include "msfs_turnaround/landing_analysis.hpp"
#include "approach/ApproachGuidance.hpp"
#include "approach/StableApproachMonitor.hpp"
#include "navdata/NavDatabase.hpp"
#include "scenario/GenericAircraftAdapter.hpp"
#include "scenario/ScenarioSpawner.hpp"

#include <ixwebsocket/IXNetSystem.h>
#include <nlohmann/json.hpp>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <filesystem>
#include <functional>
#include <iostream>
#include <mutex>
#include <optional>
#include <thread>

namespace {

using msfs_turnaround::AircraftTelemetry;
using msfs_turnaround::RunwayEnd;

bool simBool(double value) {
    return std::isfinite(value) && std::abs(value) >= 0.5;
}

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

double landingScoreWithStableApproach(
    const msfs_turnaround::LandingAnalysis& analysis,
    bool includeStableApproach,
    const std::optional<msfs_turnaround::StableApproachGateResult>& gate1000,
    const std::optional<msfs_turnaround::StableApproachGateResult>& gate500
) {
    double score = analysis.score;

    if (includeStableApproach) {
        if (gate1000) {
            if (!gate1000->stable) {
                score -= 10.0;
            }
        } else {
            score -= 5.0;
        }

        if (gate500) {
            if (!gate500->stable) {
                score -= 15.0;
            }
        } else {
            score -= 5.0;
        }
    }

    return std::clamp(score, 0.0, 100.0);
}

nlohmann::json landingGateToJson(
    const std::optional<msfs_turnaround::StableApproachGateResult>& gate
) {
    if (!gate) {
        return {
            {"captured", false},
            {"stable", false},
            {"issues", nlohmann::json::array()}
        };
    }

    return {
        {"captured", true},
        {"stable", gate->stable},
        {"issues", gate->issues},
        {"distanceNm", gate->distanceNm},
        {"courseErrorDeg", gate->courseErrorDeg},
        {"lateralDeviationM", gate->lateralDeviationM},
        {"glidepathDeviationFt", gate->glidepathDeviationFt},
        {"verticalSpeedFpm", gate->verticalSpeedFpm},
        {"bankDeg", gate->bankDeg}
    };
}

std::string landingAnalysisToJson(
    const msfs_turnaround::LandingAnalysis& analysis,
    bool includeStableApproach,
    const std::optional<msfs_turnaround::StableApproachGateResult>& gate1000,
    const std::optional<msfs_turnaround::StableApproachGateResult>& gate500
) {
    const double score = landingScoreWithStableApproach(
        analysis,
        includeStableApproach,
        gate1000,
        gate500
    );

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
            {"score", score}
        }}
    };

    if (includeStableApproach) {
        message["payload"]["stableApproach"] = {
            {"gate1000", landingGateToJson(gate1000)},
            {"gate500", landingGateToJson(gate500)}
        };
    }

    return message.dump();
}

std::string approachGuidanceToJson(
    const msfs_turnaround::ApproachGuidanceResult& guidance
) {
    nlohmann::json message = {
        {"type", "approach.guidance"},
        {"airportIdent", guidance.airportIdent},
        {"runwayIdent", guidance.runwayIdent},
        {"distanceNm", guidance.distanceNm},
        {"bearingToThresholdDeg", guidance.bearingToThresholdDeg},
        {"runwayHeadingDeg", guidance.runwayHeadingDeg},
        {"courseErrorDeg", guidance.courseErrorDeg},
        {"lateralDeviationM", guidance.lateralDeviationM},
        {"alongTrackDistanceNm", guidance.alongTrackDistanceNm},
        {"glidepathDeg", guidance.glidepathDeg},
        {"glidepathTargetAltitudeFt", guidance.glidepathTargetAltitudeFt},
        {"glidepathDeviationFt", guidance.glidepathDeviationFt},
        {"stable", guidance.stable},
        {"issues", guidance.issues}
    };

    return message.dump();
}

std::string stabilityGateToJson(
    const msfs_turnaround::StableApproachGateResult& gate
) {
    nlohmann::json message = {
        {"type", "approach.stability_gate"},
        {"gateAglFt", gate.gateAglFt},
        {"airportIdent", gate.airportIdent},
        {"runwayIdent", gate.runwayIdent},
        {"stable", gate.stable},
        {"radioAltitudeFt", gate.radioAltitudeFt},
        {"distanceNm", gate.distanceNm},
        {"courseErrorDeg", gate.courseErrorDeg},
        {"lateralDeviationM", gate.lateralDeviationM},
        {"glidepathDeviationFt", gate.glidepathDeviationFt},
        {"indicatedAirspeedKt", gate.indicatedAirspeedKt},
        {"verticalSpeedFpm", gate.verticalSpeedFpm},
        {"bankDeg", gate.bankDeg},
        {"pitchDeg", gate.pitchDeg},
        {"issues", gate.issues}
    };

    return message.dump();
}

nlohmann::json runwayEndToJson(const RunwayEnd& runwayEnd);

std::string scenarioSpawnResultToJson(
    const msfs_turnaround::ScenarioSpawnResult& result,
    const std::optional<RunwayEnd>& selectedRunway
) {
    nlohmann::json message = {
        {"type", "scenario.spawn_final.result"},
        {"ok", result.ok},
        {"airportIdent", result.airportIdent},
        {"runwayIdent", result.runwayIdent},
        {"distanceNm", result.distanceNm},
        {"glidepathDeg", result.glidepathDeg},
        {"airspeedKt", result.airspeedKt},
        {"spawnLatitudeDeg", result.spawnLatitudeDeg},
        {"spawnLongitudeDeg", result.spawnLongitudeDeg},
        {"spawnAltitudeFt", result.spawnAltitudeFt},
        {"spawnHeadingDeg", result.spawnHeadingDeg},
        {"gearRequested", result.gearRequested},
        {"flapsRequested", result.flapsRequested},
        {"parkingBrakeRequested", result.parkingBrakeRequested},
        {"pauseRequested", result.pauseRequested},
        {"warnings", result.warnings}
    };

    if (!result.error.empty()) {
        message["error"] = result.error;
    }

    if (selectedRunway) {
        message["runway"] = runwayEndToJson(*selectedRunway);
    }

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

nlohmann::json runwayEndToJson(const RunwayEnd& runwayEnd) {
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

double jsonDouble(const nlohmann::json& message, const char* key, double fallback) {
    const auto it = message.find(key);
    if (it == message.end() || !it->is_number()) {
        return fallback;
    }

    return it->get<double>();
}

bool jsonBool(const nlohmann::json& message, const char* key, bool fallback) {
    const auto it = message.find(key);
    if (it == message.end() || !it->is_boolean()) {
        return fallback;
    }

    return it->get<bool>();
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
    msfs_turnaround::ScenarioSpawner& scenarioSpawner,
    std::mutex& activeRunwayMutex,
    std::optional<RunwayEnd>& activeRunway,
    std::mutex& latestTelemetryMutex,
    std::optional<AircraftTelemetry>& latestTelemetry,
    msfs_turnaround::StableApproachMonitor& stableApproachMonitor,
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
            stableApproachMonitor.resetForNewApproach();
        }

        response["ok"] = true;
        sendJson(send, response);
        return;
    }

    if (type == "scenario.spawn_final") {
        msfs_turnaround::ApproachScenarioRequest request;
        request.airportIdent = jsonString(message, "airportIdent");
        request.runwayIdent = jsonString(message, "runwayIdent");
        request.distanceNm = jsonDouble(message, "distanceNm", request.distanceNm);
        request.glidepathDeg = jsonDouble(message, "glidepathDeg", request.glidepathDeg);
        request.airspeedKt = jsonDouble(message, "airspeedKt", request.airspeedKt);
        request.gearDown = jsonBool(message, "gearDown", request.gearDown);
        request.flapsIndex = jsonInt(message, "flapsIndex", request.flapsIndex);
        request.pauseAfterSpawn =
            jsonBool(message, "pauseAfterSpawn", request.pauseAfterSpawn);

        std::optional<RunwayEnd> activeRunwayCopy;
        {
            std::lock_guard<std::mutex> lock(activeRunwayMutex);
            activeRunwayCopy = activeRunway;
        }

        if (!activeRunwayCopy &&
            request.airportIdent.empty() &&
            request.runwayIdent.empty()) {
            std::optional<AircraftTelemetry> latestTelemetryCopy;
            {
                std::lock_guard<std::mutex> lock(latestTelemetryMutex);
                latestTelemetryCopy = latestTelemetry;
            }

            if (latestTelemetryCopy && simBool(latestTelemetryCopy->simOnGround)) {
                activeRunwayCopy = navDatabase.findNearestRunwayEnd(
                    latestTelemetryCopy->latitudeDeg,
                    latestTelemetryCopy->longitudeDeg,
                    latestTelemetryCopy->headingDeg
                );

                if (activeRunwayCopy) {
                    std::cout
                        << "Inferred active runway from aircraft position: "
                        << activeRunwayCopy->airportIdent
                        << " "
                        << activeRunwayCopy->runwayIdent
                        << std::endl;
                }
            }
        }

        std::optional<RunwayEnd> selectedRunway;
        const auto result =
            scenarioSpawner.spawnFinal(request, activeRunwayCopy, selectedRunway);

        if (result.ok && selectedRunway) {
            std::lock_guard<std::mutex> lock(activeRunwayMutex);
            activeRunway = selectedRunway;
            stableApproachMonitor.resetForNewApproach();
        }

        send(scenarioSpawnResultToJson(result, selectedRunway));
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
    std::optional<RunwayEnd> activeRunway;
    std::mutex latestTelemetryMutex;
    std::optional<AircraftTelemetry> latestTelemetry;
    msfs_turnaround::StableApproachMonitor stableApproachMonitor;
    msfs_turnaround::SimConnectClient simConnectClient;
    msfs_turnaround::GenericAircraftAdapter genericAircraftAdapter;
    msfs_turnaround::ScenarioSpawner scenarioSpawner(
        navDatabase,
        simConnectClient,
        genericAircraftAdapter
    );

    msfs_turnaround::WebSocketServer webSocketServer(48787);
    webSocketServer.setClientMessageHandler(
        [
            &navDatabase,
            &scenarioSpawner,
            &activeRunwayMutex,
            &activeRunway,
            &latestTelemetryMutex,
            &latestTelemetry,
            &stableApproachMonitor
        ](
            const std::string& rawMessage,
            const std::function<void(const std::string&)>& send
        ) {
            handleClientMessage(
                rawMessage,
                navDatabase,
                scenarioSpawner,
                activeRunwayMutex,
                activeRunway,
                latestTelemetryMutex,
                latestTelemetry,
                stableApproachMonitor,
                send
            );
        }
    );

    if (!webSocketServer.start()) {
        ix::uninitNetSystem();
        return 1;
    }

    msfs_turnaround::LandingDetector landingDetector;
    bool hasSeenGroundState = false;
    bool previousOnGround = false;

    simConnectClient.setTelemetryCallback(
        [
            &webSocketServer,
            &landingDetector,
            &activeRunwayMutex,
            &activeRunway,
            &latestTelemetryMutex,
            &latestTelemetry,
            &stableApproachMonitor,
            &hasSeenGroundState,
            &previousOnGround
        ](const msfs_turnaround::AircraftTelemetry& telemetry) {
            {
                std::lock_guard<std::mutex> lock(latestTelemetryMutex);
                latestTelemetry = telemetry;
            }

            webSocketServer.broadcast(telemetryToJson(telemetry));

            std::optional<msfs_turnaround::RunwayEnd> runwayForGuidance;
            {
                std::lock_guard<std::mutex> lock(activeRunwayMutex);
                const bool isOnGround = simBool(telemetry.simOnGround);
                if (hasSeenGroundState && previousOnGround && !isOnGround) {
                    stableApproachMonitor.resetForNewApproach();
                }
                previousOnGround = isOnGround;
                hasSeenGroundState = true;

                runwayForGuidance = activeRunway;
            }

            if (runwayForGuidance) {
                const auto guidance =
                    msfs_turnaround::computeApproachGuidance(
                        telemetry,
                        *runwayForGuidance
                    );
                webSocketServer.broadcast(approachGuidanceToJson(guidance));

                std::optional<msfs_turnaround::StableApproachGateResult> capturedGate;
                {
                    std::lock_guard<std::mutex> lock(activeRunwayMutex);
                    capturedGate = stableApproachMonitor.update(telemetry, guidance);
                }

                if (capturedGate) {
                    webSocketServer.broadcast(stabilityGateToJson(*capturedGate));
                }
            }

            if (landingDetector.update(telemetry)) {
                const auto& analysis = landingDetector.latestLanding();
                std::optional<msfs_turnaround::StableApproachGateResult> gate1000;
                std::optional<msfs_turnaround::StableApproachGateResult> gate500;
                bool includeStableApproach = false;
                {
                    std::lock_guard<std::mutex> lock(activeRunwayMutex);
                    includeStableApproach = activeRunway.has_value();
                    gate1000 = stableApproachMonitor.gate1000();
                    gate500 = stableApproachMonitor.gate500();
                }

                webSocketServer.broadcast(
                    landingAnalysisToJson(
                        analysis,
                        includeStableApproach,
                        gate1000,
                        gate500
                    )
                );

                std::cout
                    << "Landing detected: VS="
                    << analysis.touchdownVerticalSpeedFpm
                    << " FPM IAS="
                    << analysis.touchdownAirspeedKt
                    << " KT SCORE="
                    << landingScoreWithStableApproach(
                        analysis,
                        includeStableApproach,
                        gate1000,
                        gate500
                    )
                    << std::endl;
            }
        }
    );

    auto connectToSimulator = [&simConnectClient]() {
        if (!simConnectClient.connect()) {
            std::cerr
                << "MSFS is not connected yet; bridge WebSocket remains available."
                << std::endl;
            return false;
        }

        simConnectClient.requestAircraftTelemetry();
        std::cout << "Streaming telemetry to WebSocket clients." << std::endl;
        return true;
    };

    std::cout << "Endpoint: ws://localhost:48787" << std::endl;
    const bool initiallyConnected = connectToSimulator();
    auto nextReconnectAttempt =
        std::chrono::steady_clock::now() +
        (initiallyConnected ? std::chrono::seconds(0) : std::chrono::seconds(5));

    while (true) {
        if (simConnectClient.isConnected()) {
            simConnectClient.poll();
        } else if (std::chrono::steady_clock::now() >= nextReconnectAttempt) {
            connectToSimulator();
            nextReconnectAttempt =
                std::chrono::steady_clock::now() + std::chrono::seconds(5);
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }

    simConnectClient.close();
    webSocketServer.stop();
    ix::uninitNetSystem();

    return 0;
}
