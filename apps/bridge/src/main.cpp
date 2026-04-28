#include "msfs_turnaround/simconnect_client.hpp"

#include <chrono>
#include <iostream>
#include <thread>

int main() {
    std::cout << "MSFS Turnaround Bridge starting..." << std::endl;

    msfs_turnaround::SimConnectClient client;

    if (!client.connect()) {
        return 1;
    }

    client.requestAircraftTelemetry();

    std::cout << "Streaming telemetry. Press Ctrl+C to stop." << std::endl;

    while (true) {
        client.poll();
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }

    client.close();
    return 0;
}