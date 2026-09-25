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

Each combatant has a repeating auto-attack cycle driven by deterministic fixed combat ticks.

Battle presents that engine-owned progress as a swing-timer bar. The bar advances only when the combat simulation advances, freezes while Battle is paused, resets through the same action-spend path that fires Auto Attack, and returns to its initial state on encounter reset.

Swing progression is affected by the actor's live Haste plus authored auto-attack Haste talent hooks. Presentation never runs a separate CSS-only or wall-clock timer.

## Class Abilities

Every hero exposes the same four-slot combat package:

- Auto Attack
- Ability 1
- Ability 2
- specialization-capstone Ultimate

Each class defines authored normal and Ultimate actions in its class `abilities/README.md`. A hero equips exactly two distinct learned normal abilities compatible with the active specialization. The combat actor factory requires those explicit selected IDs; it does not fall back to the first compatible abilities.

The deterministic simulator automatically uses the first equipped normal ability that is ready, affordable, and has a valid target. Cooldown timing is expressed in fixed 60 Hz combat ticks and advances through the same Haste accumulator used by the authoritative combat runtime.

## Ultimate

Each specialization's capstone maps to one authored Ultimate action through its `ultimate_id`. The hero's combat loadout must resolve to that capstone Ultimate; the combat actor factory does not select a generic fallback Ultimate.

The ultimate bar builds during combat. When it is full, the capstone Ultimate becomes available.

The prototype ultimate bar uses a 10,000-point integer scale.

Current runtime generation:

- successful auto-attack or auto-heal: +1,000
- successful cooldown action: +2,000
- taking direct damage: +300
- ultimate use: consumes the full bar

These values are prototype tuning and are documented in [Combat Runtime](./runtime/README.md).

## Combat Stats

Combat uses the primary and tertiary stat families defined in [Content / Stats](../content/stats/README.md).

The stat model includes primary attributes such as Strength, Agility, Intellect, Stamina, and Spirit as well as tertiary combat modifiers such as Crit, Haste, Spell Power, Healing Power, Hit Rating, and Mastery.

The current prototype mappings are defined in [Content / Stats](../content/stats/README.md) and [Combat Runtime](./runtime/README.md). Production balance can change the numbers without changing the deterministic action contract.

## Deterministic Combat Runtime

The combat prototype follows the deterministic fixed-tick model used by Hexframe:

- 60 fixed ticks per second
- one combat-runtime `step()` advances exactly one tick
- no wall-clock or browser delta-time inside combat-runtime logic
- authoritative arithmetic uses integers
- percentages use 10,000 basis points
- seeded RNG is carried in combat state
- actor-index order resolves all ties deterministically
- every tick produces a frame report and deterministic state hash

See [Combat Runtime](./runtime/README.md).

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
- final auto-attack timing and tuning
- buffs and debuffs
- threat or tanking
- class abilities
- enemy behavior
- bosses
- encounter mechanics
- randomness
- success prediction
