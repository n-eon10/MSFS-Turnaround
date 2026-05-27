cmake_minimum_required(VERSION 3.24)

project(msfs_turnaround_bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(msfs_turnaround_bridge
    src/main.cpp
    src/simconnect_client.cpp
    src/websocket_server.cpp
    src/landing_analysis.cpp
    src/navdata/NavDatabase.cpp
    src/approach/Geo.cpp
    src/approach/ApproachGuidance.cpp
    src/approach/StableApproachMonitor.cpp
    src/scenario/ApproachScenario.cpp
    src/scenario/ScenarioSpawner.cpp
    src/aircraft/AircraftIdentity.cpp
    src/aircraft/AircraftAdapterRegistry.cpp
    src/aircraft/FenixAircraftAdapter.cpp
    src/aircraft/GenericAircraftAdapter.cpp
    src/spawn/AircraftConfigurator.cpp
    src/spawn/ApproachSpawnManager.cpp
    src/spawn/ApproachSpawnStateMachine.cpp
    src/spawn/ReleaseController.cpp
    src/spawn/SpawnFreezeController.cpp
    src/spawn/SpawnReadinessChecker.cpp
)

target_compile_definitions(msfs_turnaround_bridge PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
)

# ------------------------------------------------------------
# MSFS SDK discovery
# ------------------------------------------------------------

set(MSFS_SDK_DIR "" CACHE PATH "Path to the Microsoft Flight Simulator SDK root directory")

# Allow environment variable fallback:
#   PowerShell: $env:MSFS_SDK_DIR="C:/MSFS SDK"
if (NOT MSFS_SDK_DIR AND DEFINED ENV{MSFS_SDK_DIR})
    set(MSFS_SDK_DIR "$ENV{MSFS_SDK_DIR}" CACHE PATH "Path to the Microsoft Flight Simulator SDK root directory" FORCE)
endif()

# Common install locations.
set(MSFS_SDK_CANDIDATE_DIRS
    "C:/MSFS SDK"
    "C:/MSFS 2024 SDK"
    "C:/Program Files/Microsoft Flight Simulator SDK"
    "C:/Program Files/Microsoft Flight Simulator 2024 SDK"
    "C:/Program Files (x86)/Microsoft Flight Simulator SDK"
    "C:/Program Files (x86)/Microsoft Flight Simulator 2024 SDK"
)

# Auto-detect if not manually supplied.
if (NOT MSFS_SDK_DIR)
    foreach(candidate_dir IN LISTS MSFS_SDK_CANDIDATE_DIRS)
        if (EXISTS "${candidate_dir}/SimConnect SDK/include/SimConnect.h")
            set(MSFS_SDK_DIR "${candidate_dir}" CACHE PATH "Path to the Microsoft Flight Simulator SDK root directory" FORCE)
            break()
        endif()
    endforeach()
endif()

if (NOT MSFS_SDK_DIR)
    message(FATAL_ERROR
        "MSFS SDK not found.\n"
        "Install the MSFS SDK, then configure with one of:\n"
        "  cmake -S . -B build -DMSFS_SDK_DIR=\"C:/MSFS SDK\"\n"
        "or set an environment variable:\n"
        "  PowerShell: $env:MSFS_SDK_DIR=\"C:/MSFS SDK\"\n"
        "Expected file:\n"
        "  <MSFS_SDK_DIR>/SimConnect SDK/include/SimConnect.h"
    )
endif()

set(SIMCONNECT_INCLUDE_DIR "${MSFS_SDK_DIR}/SimConnect SDK/include")
set(SIMCONNECT_LIB_DIR "${MSFS_SDK_DIR}/SimConnect SDK/lib")

if (NOT EXISTS "${SIMCONNECT_INCLUDE_DIR}/SimConnect.h")
    message(FATAL_ERROR "SimConnect.h not found at: ${SIMCONNECT_INCLUDE_DIR}")
endif()

if (NOT EXISTS "${SIMCONNECT_LIB_DIR}/SimConnect.lib")
    message(FATAL_ERROR "SimConnect.lib not found at: ${SIMCONNECT_LIB_DIR}")
endif()

message(STATUS "Using MSFS SDK: ${MSFS_SDK_DIR}")

# ------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------

find_package(ixwebsocket CONFIG REQUIRED)
find_package(nlohmann_json CONFIG REQUIRED)
find_package(unofficial-sqlite3 CONFIG REQUIRED)

# ------------------------------------------------------------
# Includes
# ------------------------------------------------------------

target_include_directories(msfs_turnaround_bridge PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
    "${CMAKE_CURRENT_SOURCE_DIR}/src"
    "${SIMCONNECT_INCLUDE_DIR}"
)

# ------------------------------------------------------------
# Linking
# ------------------------------------------------------------

target_link_directories(msfs_turnaround_bridge PRIVATE
    "${SIMCONNECT_LIB_DIR}"
)

target_link_libraries(msfs_turnaround_bridge PRIVATE
    SimConnect
    ixwebsocket::ixwebsocket
    nlohmann_json::nlohmann_json
    unofficial::sqlite3::sqlite3
    bcrypt
)

# ------------------------------------------------------------
# Runtime DLL handling
# ------------------------------------------------------------

set(SIMCONNECT_DLL_CANDIDATES
    "${MSFS_SDK_DIR}/SimConnect SDK/lib/SimConnect.dll"
    "${MSFS_SDK_DIR}/SimConnect SDK/LegacyInterfaces/FSX-SP2-XPACK/SimConnect.dll"
    "${MSFS_SDK_DIR}/SimConnect SDK/LegacyInterfaces/FSX-RTM/SimConnect.dll"
)

set(SIMCONNECT_DLL_FOUND FALSE)

foreach(simconnect_dll IN LISTS SIMCONNECT_DLL_CANDIDATES)
    if (EXISTS "${simconnect_dll}")
        add_custom_command(TARGET msfs_turnaround_bridge POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
                "${simconnect_dll}"
                "$<TARGET_FILE_DIR:msfs_turnaround_bridge>"
        )

        message(STATUS "Will copy SimConnect.dll from: ${simconnect_dll}")
        set(SIMCONNECT_DLL_FOUND TRUE)
        break()
    endif()
endforeach()

if (NOT SIMCONNECT_DLL_FOUND)
    message(WARNING
        "SimConnect.dll was not found in the SDK. "
        "The bridge may still run if SimConnect.dll is available system-wide."
    )
endif()

# ------------------------------------------------------------
# MSVC warnings
# ------------------------------------------------------------

if (MSVC)
    target_compile_options(msfs_turnaround_bridge PRIVATE
        /W4
        /permissive-
    )
else()
    target_compile_options(msfs_turnaround_bridge PRIVATE
        -Wall
        -Wextra
        -Wpedantic
    )
endif()
