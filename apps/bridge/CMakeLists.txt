cmake_minimum_required(VERSION 3.24)

project(msfs_turnaround_bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(msfs_turnaround_bridge
    src/main.cpp
    src/simconnect_client.cpp
)

target_include_directories(msfs_turnaround_bridge PRIVATE
    "${CMAKE_CURRENT_SOURCE_DIR}/include"
    "${SIMCONNECT_INCLUDE_DIR}"
)

# ------------------------------------------------------------
# MSFS SDK discovery
# ------------------------------------------------------------

set(MSFS_SDK_DIR "" CACHE PATH "Path to the Microsoft Flight Simulator SDK root directory")

# Allow environment variable fallback:
#   $env:MSFS_SDK_DIR="C:\MSFS SDK"
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
set(SIMCONNECT_DLL_CANDIDATES
    "${MSFS_SDK_DIR}/SimConnect SDK/lib/SimConnect.dll"
    "${MSFS_SDK_DIR}/SimConnect SDK/lib/managed/SimConnect.dll"
)

if (NOT EXISTS "${SIMCONNECT_INCLUDE_DIR}/SimConnect.h")
    message(FATAL_ERROR "SimConnect.h not found at: ${SIMCONNECT_INCLUDE_DIR}")
endif()

if (NOT EXISTS "${SIMCONNECT_LIB_DIR}/SimConnect.lib")
    message(FATAL_ERROR "SimConnect.lib not found at: ${SIMCONNECT_LIB_DIR}")
endif()

message(STATUS "Using MSFS SDK: ${MSFS_SDK_DIR}")

target_include_directories(msfs_turnaround_bridge PRIVATE
    "${SIMCONNECT_INCLUDE_DIR}"
)

target_link_directories(msfs_turnaround_bridge PRIVATE
    "${SIMCONNECT_LIB_DIR}"
)

target_link_libraries(msfs_turnaround_bridge PRIVATE
    SimConnect
)

# Copy SimConnect.dll beside the executable if CMake can find it.
foreach(simconnect_dll IN LISTS SIMCONNECT_DLL_CANDIDATES)
    if (EXISTS "${simconnect_dll}")
        add_custom_command(TARGET msfs_turnaround_bridge POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
                "${simconnect_dll}"
                "$<TARGET_FILE_DIR:msfs_turnaround_bridge>"
        )
        message(STATUS "Will copy SimConnect.dll from: ${simconnect_dll}")
        break()
    endif()
endforeach()