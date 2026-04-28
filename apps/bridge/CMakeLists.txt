cmake_minimum_required(VERSION 3.24)

project(msfs_turnaround_bridge LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(msfs_turnaround_bridge
    src/main.cpp
)