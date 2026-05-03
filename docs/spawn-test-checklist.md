# Approach Spawn Test Checklist

Use this checklist when validating the generic FSiPanel-style approach spawn lifecycle.

## Preconditions

- Build the bridge with `cmake --build --preset bridge-release`.
- Build the desktop UI with `npm run build` from `apps/desktop`.
- Start MSFS with a default aircraft before testing complex add-ons.
- Start `msfs_turnaround_bridge.exe` and confirm the UI is connected.
- Select a runway in Airport Setup before spawning.

## Default Aircraft Coverage

- Test with at least one default single-engine piston aircraft.
- Test with at least one default jet or turboprop if available.
- Confirm no Fenix/PMDG-specific assumptions are required.

## Spawn Distance Cases

- Spawn at 8 NM final.
- Spawn at 12 NM final.
- Spawn at 15 NM final.
- For each distance, confirm the UI progresses through:
  `CALCULATE_FINAL_POSITION`, `TELEPORT_WITH_INITPOSITION`, `FREEZE_HOLD`,
  `CONFIGURE_AIRCRAFT`, `STABILISE_SIM_STATE`, and either
  `READY_TO_RELEASE` or `FAILED` with a clear reason.

## Release Path

- When `READY_TO_RELEASE` appears, press `Release Aircraft`.
- Repeat using `Ctrl + Shift + Space`.
- Confirm release logs each step:
  attitude unfreeze, altitude unfreeze, latitude/longitude unfreeze.
- Confirm the aircraft does not pitch-drop, stall, roll, or yaw violently.

## Cancel Before Ready

- Start a spawn and press `Cancel` during `FREEZE_HOLD`.
- Repeat during `CONFIGURE_AIRCRAFT`.
- Repeat during `STABILISE_SIM_STATE`.
- Confirm the UI reports cancellation and the aircraft is unfrozen by user action, not by an automatic failure release.

## Failed Spawn Path

- Force a failure by selecting an unsafe/low approach speed or unsupported flap config.
- Confirm `FAILED` includes a useful reason.
- Confirm the aircraft does not auto-release on failure.
- Press `Unfreeze` only when safe and confirm freeze axes are cleared.

## Runway Change During Spawn

- Start a spawn, then try selecting another runway before release.
- Confirm the bridge rejects the runway change while the spawn/freeze hold is active.
- After release or unfreeze, confirm runway selection works again.

## Regression Checks

- Existing aircraft telemetry continues updating.
- Runway search and runway selection still work outside active spawn.
- Approach guidance continues after release.
- Landing analysis and touchdown scoring still emit after landing.
