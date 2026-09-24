# Combat

## Purpose

This section defines how deployed heroes and enemies resolve encounters.

## Combat Direction

Combat is real time and predominantly automatic.

The player should not directly control MMO-style movement or manually execute every basic action.

The player's major decisions should come from:

- hero selection
- party composition
- equipment
- consumables
- content selection
- preparation
- future ability-priority or targeting rules if those systems are added

## Auto-Attacks

Each combatant has a repeating auto-attack bar.

The bar fills over real time.

When the bar fills:

1. the combatant performs an auto-attack
2. the auto-attack resolves
3. the bar resets
4. the next auto-attack cycle begins

Attack-bar fill speed is part of the combat timing model and may be affected by stats such as Haste.

## Class Abilities

Every class has a fixed core combat package:

- 2 cooldown abilities
- 1 ultimate ability

Each class defines a pool of cooldown abilities in its class `abilities/README.md`.

A hero equips exactly two cooldown abilities. The deterministic simulator automatically uses the first equipped cooldown that is ready, affordable, and has a valid target.

Cooldown timing is expressed in fixed 60 Hz simulation ticks and advances through the same Haste accumulator used by the authoritative combat simulation.

## Ultimate

Each class has one ultimate ability tied to a fillable ultimate bar.

The ultimate bar builds during combat.

When the bar is full, that class's ultimate becomes available.

The prototype ultimate bar uses a 10,000-point integer scale.

Current simulation generation:

- successful auto-attack or auto-heal: +1,000
- successful cooldown action: +2,000
- taking direct damage: +300
- ultimate use: consumes the full bar

These values are prototype tuning and are documented in [Simulation](./simulation/README.md).

## Combat Stats

Combat uses the primary and tertiary stat families defined in [Content / Stats](../content/stats/README.md).

The stat model includes primary attributes such as Strength, Agility, Intellect, Stamina, and Spirit as well as tertiary combat modifiers such as Crit, Haste, Spell Power, Healing Power, Hit Rating, and Mastery.

The current prototype mappings are defined in [Content / Stats](../content/stats/README.md) and [Simulation](./simulation/README.md). Production balance can change the numbers without changing the deterministic action contract.

## Deterministic Simulation

The combat prototype follows the deterministic fixed-tick model used by Hexframe:

- 60 fixed ticks per second
- one simulation `step()` advances exactly one tick
- no wall-clock or browser delta-time inside simulation logic
- authoritative arithmetic uses integers
- percentages use 10,000 basis points
- seeded RNG is carried in simulation state
- actor-index order resolves all ties deterministically
- every tick produces a frame report and deterministic state hash

See [Simulation](./simulation/README.md).

## Party Capability

Combat should evaluate contributions such as:

- damage
- defense
- healing or sustain
- support
- utility

Different classes should create different ways to satisfy encounter requirements.

## Content Scale

Combat must support:

- solo encounters
- 3-hero groups
- 5-hero groups
- 10-hero groups
- 20-hero groups

The same underlying real-time combat model should scale across these group sizes.

## Encounter Difficulty

Higher-tier content should demand stronger heroes, better equipment, and increasingly thoughtful party composition.

The game should communicate expected difficulty before deployment rather than hide all risk.

## Failure

Failure should create a setback without destroying long-term roster investment.

Permanent hero death is not currently part of the design.

Potential failure consequences include:

- reduced or no rewards
- mission time lost
- temporary fatigue
- temporary injury

Exact consequences remain open.

## Open Areas

Later combat specifications need to define:

- final production stat curves
- final damage and healing tuning
- defenses
- targeting
- base attack-bar timing
- buffs and debuffs
- threat or tanking
- class abilities
- enemy behavior
- bosses
- encounter mechanics
- randomness
- success prediction
