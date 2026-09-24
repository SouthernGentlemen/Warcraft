# Combat Simulation Mockup

This directory is a headless deterministic combat lab.

## Engine

`engine/combat-sim.js` owns authoritative combat state and fixed-tick stepping.

The UI does not advance combat with browser delta-time. It fast-runs `step()` until the battle ends or the configured tick limit is reached.

## Current Scenarios

- one hero vs one training enemy
- three heroes vs one dungeon enemy

Both use the same engine.

## Determinism

Every run records:

- one frame report per 60 Hz tick
- deterministic state hash per tick
- complete event arrays
- final state hash
- full combat-log hash

The lab automatically repeats each run with the same seed and shows whether both hashes match.
