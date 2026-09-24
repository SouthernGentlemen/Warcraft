# Paladin Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Paladin equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| holy-shock | Holy Shock | heal | healing | lowest-ally | 120 | 8500 | 360 | mana | 95 | none |
| shield-of-the-righteous | Shield of the Righteous | damage | physical | enemy | 110 | 8500 | 360 | mana | 90 | none |
| templars-verdict | Templar's Verdict | damage | physical | enemy | 140 | 10000 | 420 | mana | 110 | none |
| consecration | Consecration | damage | spell | all-enemies | 85 | 6000 | 480 | mana | 105 | none |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| avenging-wrath | Avenging Wrath | buff | none | self | 0 | 0 | 0 | ultimate | 10000 | all_power_bp:+2500@480 |
| divine-guardian | Divine Guardian | buff | none | all-allies | 0 | 0 | 0 | ultimate | 10000 | damage_reduction_bp:+2000@480 |

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
