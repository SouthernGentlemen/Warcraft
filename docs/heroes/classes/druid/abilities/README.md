# Druid Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Druid equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| starfire | Starfire | damage | spell | enemy | 125 | 9000 | 420 | mana | 110 | none |
| shred | Shred | damage | physical | enemy | 115 | 9000 | 300 | energy | 35 | none |
| regrowth | Regrowth | heal | healing | lowest-ally | 135 | 9000 | 420 | mana | 115 | none |
| mangle | Mangle | damage | physical | enemy | 110 | 8500 | 360 | energy | 25 | none |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| tranquility | Tranquility | heal | healing | all-allies | 300 | 11000 | 0 | ultimate | 10000 | none |
| incarnation | Incarnation | buff | none | self | 0 | 0 | 0 | ultimate | 10000 | all_power_bp:+2500@480 |

## Action Fields

- **Kind** — damage, heal, shield, or buff.
- **School** — physical, spell, healing, or none.
- **Target** — enemy, all-enemies, lowest-ally, self, or all-allies.
- **Power** — flat integer action power.
- **Coefficient BP** — basis-point scaling against the mapped hero power stat. 10,000 BP = 100%.
- **Cooldown Ticks** — fixed base cooldown before Haste progression.
- **Resource / Cost** — deterministic resource spend required to execute the action.
- **Effect** — optional deterministic buff hook in `key:+basisPoints@ticks` form.

## Selection

The simulator currently selects the first two resource-compatible cooldowns and the first ultimate by default.

The battle system can later provide explicit loadout IDs without changing the simulation engine.
