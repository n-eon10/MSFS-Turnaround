#include "msfs_turnaround/simconnect_client.hpp"
#include "msfs_turnaround/websocket_server.hpp"

#include "msfs_turnaround/landing_analysis.hpp"

#include <ixwebsocket/IXNetSystem.h>
#include <nlohmann/json.hpp>

#include <chrono>
#include <iostream>
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
            {"simOnGround", telemetry.simOnGround}
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
            {"score", analysis.score}
        }}
    };

    return message.dump();
}

}

int main() {
    std::cout << "MSFS Turnaround Bridge starting..." << std::endl;

    ix::initNetSystem();

    msfs_turnaround::WebSocketServer webSocketServer(48787);

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
