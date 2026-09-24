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

Cooldown abilities are governed by their own cooldown timers.

Exact ability activation behavior, priorities, targeting, and cooldown lengths will be defined in the class specifications.

## Ultimate

Each class has one ultimate ability tied to a fillable ultimate bar.

The ultimate bar builds during combat.

When the bar is full, that class's ultimate becomes available.

The exact sources and rate of ultimate-bar generation remain open.

## Combat Stats

Combat uses the primary and tertiary stat families defined in [Content / Stats](../content/stats/README.md).

The stat model includes primary attributes such as Strength, Agility, Intellect, Stamina, and Spirit as well as tertiary combat modifiers such as Crit, Haste, Spell Power, Healing Power, Hit Rating, and Mastery.

Exact formulas are intentionally deferred until the systems are fully specified.

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

- primary-stat formulas
- tertiary-stat formulas
- damage formulas
- healing formulas
- defenses
- targeting
- base attack-bar timing
- cooldown timing
- ultimate-bar generation
- buffs and debuffs
- threat or tanking
- class abilities
- enemy behavior
- bosses
- encounter mechanics
- randomness
- success prediction
