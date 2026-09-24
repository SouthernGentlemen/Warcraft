# Shaman Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Shaman equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| lava-burst | Lava Burst | damage | spell | enemy | 130 | 9500 | 420 | mana | 105 | none |
| stormstrike | Stormstrike | damage | physical | enemy | 120 | 9000 | 360 | mana | 95 | none |
| riptide | Riptide | heal | healing | lowest-ally | 120 | 8500 | 360 | mana | 95 | none |
| chain-lightning | Chain Lightning | damage | spell | all-enemies | 90 | 6500 | 480 | mana | 110 | none |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| ascendance | Ascendance | buff | none | self | 0 | 0 | 0 | ultimate | 10000 | all_power_bp:+2500@480 |
| spirit-link | Spirit Link | heal | healing | all-allies | 260 | 9500 | 0 | ultimate | 10000 | none |

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
