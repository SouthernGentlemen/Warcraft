# Warrior Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Warrior equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| mortal-strike | Mortal Strike | damage | physical | enemy | 125 | 10000 | 360 | rage | 25 | none |
| bloodthirst | Bloodthirst | damage | physical | enemy | 105 | 8500 | 300 | rage | 25 | none |
| shield-slam | Shield Slam | damage | physical | enemy | 100 | 8000 | 360 | rage | 20 | none |
| thunder-clap | Thunder Clap | damage | physical | all-enemies | 80 | 6000 | 480 | rage | 20 | none |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| bladestorm | Bladestorm | damage | physical | all-enemies | 300 | 12000 | 0 | ultimate | 10000 | none |
| avatar | Avatar | buff | none | self | 0 | 0 | 0 | ultimate | 10000 | physical_power_bp:+3000@480 |

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
