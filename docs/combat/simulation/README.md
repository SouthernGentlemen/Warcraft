# Deterministic Combat Simulation

## Purpose

This specification defines the under-the-hood combat simulator used by the mockups and eventually by the battle system.

The simulator is intentionally headless. Rendering, animation, browser timing, and battle presentation consume simulation output but do not control authoritative combat state.

## Hexframe Timing Contract

The simulator follows the same core deterministic timing rules used by the Hexframe combat engine:

- **60 fixed simulation ticks per second**
- one call to `step()` advances exactly one tick
- simulation code never reads browser `deltaTime`, `Date.now()`, or animation-frame duration
- authoritative arithmetic is integer-only
- percentages use **10,000 basis points**
- seeded RNG lives inside authoritative simulation state
- replaying the same configuration and seed must produce the same state hash and combat log

The current seed generator is the same 32-bit xorshift family used by Hexframe.

## Authoritative State

A battle state carries:

- frame number
- RNG word
- round-over flag
- winning team
- one actor state per hero/enemy
- current health
- current resource
- resource regeneration accumulator
- auto-attack progress
- cooldown remaining ticks and progress accumulators
- ultimate-bar value
- active shields
- active timed buffs
- death state

Definitions such as action names and coefficients are immutable configuration, not mutable battle state.

## Integer Scale

`BP = 10,000`

Examples:

- 100% = 10,000 BP
- 25% = 2,500 BP
- 5% = 500 BP

No floating-point percentage is required by the authoritative simulation.

## Tick Order

Every call to `step()` executes this order:

1. create the frame report
2. tick and expire timed buffs
3. regenerate Mana/Energy using integer carry accumulators
4. advance cooldown progress using Haste
5. advance auto-attack progress using Haste
6. determine each living actor's ready actions
7. queue actions in stable actor-index order
8. for each actor, resolve Ultimate -> one ready Cooldown -> Auto-Attack
9. spend resources
10. resolve deterministic target selection
11. roll Hit and Crit through state-owned seeded RNG
12. calculate damage, healing, shields, or buffs
13. apply health/shield/resource/ultimate changes
14. record deaths and round completion
15. calculate the deterministic state hash
16. increment the authoritative frame

A dead actor never executes an action queued after its death.

## Targeting and Tie Breaks

Target selection must never depend on object iteration order.

- `enemy` -> lowest-index living hostile
- `all-enemies` -> all living hostiles in actor-index order
- `self` -> acting hero
- `lowest-ally` -> lowest health-percentage living ally, tie broken by actor index
- `all-allies` -> all living allies in actor-index order

## Action Formula

Each action defines:

- kind
- school
- target rule
- flat Power
- coefficient in basis points
- cooldown ticks
- resource type and cost
- optional deterministic effect hook

Damage/healing base amount:

`Output = Power + mappedStatPower × CoefficientBP / 10,000`

Then:

1. apply live power buffs
2. apply Mastery output hook
3. apply auto-attack talent output hook when applicable
4. roll Critical Strike when the action permits it
5. apply target damage reduction or shields
6. clamp health to valid bounds

Critical output currently uses **150%**.

## Auto-Attacks

Every specialization owns one auto-attack.

Prototype default:

- base interval: 120 ticks / 2 seconds
- damage auto: Power 55, coefficient 6,000 BP
- healing auto: Power 45, coefficient 5,000 BP

The specialization's documented auto-attack name, role, primary stat, and resource determine which mapped power stat it uses.

Auto-attacks are independent of cooldown readiness.

## Cooldowns

Each class documents four initial cooldown choices in:

`docs/heroes/classes/<class>/abilities/README.md`

A hero equips exactly two.

The simulator currently uses one ready cooldown per actor per tick, in equipped priority order.

## Ultimates

Each class documents two initial ultimate choices.

A hero equips exactly one.

Ultimate bar:

- maximum: 10,000
- successful auto action: +1,000
- successful cooldown action: +2,000
- direct damage received: +300
- ultimate use consumes 10,000

## Talent Hooks

Every specialization talent remains authored in its corresponding spec document.

The simulator accepts selected talent names and compiles them into deterministic hook descriptors.

Initial live hook patterns include straightforward static modifiers such as:

- increased auto-attack output
- increased auto-attack speed
- increased auto critical chance
- increased maximum Mana
- reduced resource costs

Talents whose mechanics need status, proc, pet, form, or encounter systems remain registered as deterministic **unimplemented hooks** rather than being silently discarded.

This lets future combat systems add behavior without changing hero-build data shapes.

## Initial Scenarios

### One-Person Battle

- 1 hero
- 1 hostile training target
- same authoritative simulation loop as larger content

### Three-Person Battle

- 3 heroes on one team
- 1 hostile dungeon target
- party actions and healing use deterministic team targeting

No separate combat engine exists for party size. Future 5-, 10-, and 20-hero battles extend the same actor-array/team model.

## Combat Log

Every simulation tick produces a frame report.

A frame report contains:

- frame number
- state hash
- all events produced during that tick

Event types include:

- action start
- resource spend/regeneration
- hit
- miss
- critical
- damage
- healing
- shield
- buff application/expiration
- ultimate gain/use
- cooldown start
- death
- round end

The mockup retains the complete array of frame reports, including ticks with no combat events.

A separate flattened event view exists only for review convenience.

## Determinism Verification

The mockup can run the same scenario twice with the same seed.

A deterministic match requires both:

- identical final state hash
- identical combat-log hash

Any mismatch is a simulation bug.
