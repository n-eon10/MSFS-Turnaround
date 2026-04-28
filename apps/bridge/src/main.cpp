#include <windows.h>
#include <SimConnect.h>

#include <iostream>

int main() {
    std::cout << "MSFS Turnaround Bridge starting..." << std::endl;

    HANDLE simConnect = nullptr;

    HRESULT result = SimConnect_Open(
        &simConnect,
        "MSFS Turnaround Bridge",
        nullptr,
        0,
        nullptr,
        0
    );

    if (SUCCEEDED(result)) {
        std::cout << "Connected to MSFS via SimConnect." << std::endl;
        SimConnect_Close(simConnect);
        return 0;
    }

    std::cerr << "Failed to connect to MSFS via SimConnect." << std::endl;
    std::cerr << "HRESULT: 0x" << std::hex << result << std::endl;

    return 1;
}