# MSFS Turnaround

An open-source external panel for **Microsoft Flight Simulator 2024** — live telemetry, approach setup, and a post-flight landing debrief — running outside the sim as a desktop app.

The project is split into a C++ **bridge** that speaks to the simulator and a Tauri/React **desktop app** that visualises the data.

```
+--------------------+        ws://localhost:48787       +-----------------------+
|  MSFS 2024         |  <-- SimConnect -->  bridge  ---> |  Tauri desktop panel  |
|  (running locally) |                      (C++)        |  (React + Vite)       |
+--------------------+                                   +-----------------------+
```

> **Status:** early. Bridge streams live aircraft telemetry and a basic landing-analysis event. Most domain features in the panel (flight plan, navdata-driven approach, stable-approach gates, full debrief) are still wired as `TODO` placeholders waiting for backend support. Contributions welcome.

## Repo layout

```
apps/
  bridge/          C++ SimConnect <-> WebSocket bridge (CMake + vcpkg)
  desktop/         Tauri 2 + React 19 + Vite + TypeScript desktop app
data/
  raw/             Source CSVs (airports.csv, runways.csv)
  processed/       Generated SQLite navdata used by the bridge
docs/              Architecture and dev notes
packages/          Reserved for shared protocol/navdata/aircraft adapters
scripts/           build_navdata.py and PowerShell dev helpers
CMakeLists.txt     Top-level CMake (delegates to apps/bridge)
CMakePresets.json  windows-msvc-{debug,release} presets
vcpkg.json         vcpkg manifest (ixwebsocket, nlohmann-json, sqlite3)
```

## Prerequisites

The bridge is **Windows-only** (it links against the MSFS SimConnect SDK). The desktop app builds anywhere Tauri runs, but is only useful on the same machine as the bridge.

- **Windows 10/11** with **MSFS 2024** installed (for runtime; not required to build the panel)
- **Microsoft Flight Simulator SDK** — install from inside MSFS via *Options → General Options → Developers → SDK Installer*. Provides `SimConnect.h` / `SimConnect.lib` / `SimConnect.dll`.
- **Visual Studio 2022** with the *Desktop development with C++* workload (MSVC v143)
- **CMake ≥ 3.24**
- **vcpkg** — clone and bootstrap:
  ```powershell
  git clone https://github.com/microsoft/vcpkg C:/dev/vcpkg
  C:/dev/vcpkg/bootstrap-vcpkg.bat
  ```
- **Node.js ≥ 20** (for the desktop app)
- **Rust toolchain** (stable) — required by Tauri:
  ```powershell
  winget install Rustlang.Rustup
  rustup default stable
  ```
- **Python 3** — only if you want to regenerate `data/processed/navdata.sqlite` from the CSVs

## First-time setup

```powershell
git clone https://github.com/<your-fork>/MSFS-Turnaround.git
cd MSFS-Turnaround

# Bridge: configure with your vcpkg toolchain and (optionally) MSFS SDK path
$env:VCPKG_ROOT = "C:/dev/vcpkg"
$env:MSFS_SDK_DIR = "C:/MSFS 2024 SDK"   # only if not auto-detected

# Desktop app: install JS deps
cd apps/desktop
npm install
cd ../..
```

> `CMakePresets.json` currently hardcodes a vcpkg path. Either edit it locally or override via `-DCMAKE_TOOLCHAIN_FILE=$env:VCPKG_ROOT/scripts/buildsystems/vcpkg.cmake` on the command line.

## Build & run the bridge

```powershell
# From the repo root
cmake --preset windows-msvc-debug
cmake --build --preset bridge-debug

# Run it (binary lives under build/windows-msvc-debug/apps/bridge/Debug/)
.\build\windows-msvc-debug\apps\bridge\Debug\msfs_turnaround_bridge.exe
```

The bridge connects to a running MSFS instance via SimConnect, reads telemetry, and serves it over `ws://localhost:48787`. Start MSFS first; the bridge will keep retrying SimConnect until the sim is up.

To produce a release build, swap `windows-msvc-debug` → `windows-msvc-release` and `bridge-debug` → `bridge-release`.

## Build & run the desktop app

```powershell
cd apps/desktop

# Tauri dev (recommended) — opens the desktop window with HMR
npm run tauri dev

# Or just the web frontend (no native shell)
npm run dev
```

The frontend connects to `ws://localhost:48787`. If the bridge isn't running you'll see the panel in its `WAITING` / `TODO` state — that's expected.

To produce an installer:

```powershell
npm run tauri build
```

## Build the navdata SQLite (optional)

Only needed if `data/processed/navdata.sqlite` is missing or you want to refresh it from updated CSVs.

```powershell
python scripts/build_navdata.py `
  --airports data/raw/airports.csv `
  --runways  data/raw/runways.csv `
  --out      data/processed/navdata.sqlite
```

## Contributing

- Open an issue before larger changes so we can align on direction.
- Match the existing style: TypeScript on the frontend, C++20 on the bridge, no silent mocking — prefer `TODO` placeholders that surface unimplemented backend fields rather than fabricated values.
- Keep PRs scoped. A passing `npm run build` (in `apps/desktop`) and a clean `cmake --build --preset bridge-release` are the bar for review.
- New bridge messages should be documented in `docs/` and reflected in the desktop app's `types/telemetry.ts`.

## License

[MIT](./LICENSE) © Afam
