# Rogue Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Rogue equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| mutilate | Mutilate | damage | physical | enemy | 110 | 9000 | 300 | energy | 35 | none |
| sinister-strike | Sinister Strike | damage | physical | enemy | 95 | 8000 | 240 | energy | 30 | none |
| backstab | Backstab | damage | physical | enemy | 135 | 10000 | 420 | energy | 40 | none |
| evasion | Evasion | buff | none | self | 0 | 0 | 600 | energy | 25 | damage_reduction_bp:+3000@300 |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| killing-spree | Killing Spree | damage | physical | all-enemies | 260 | 11000 | 0 | ultimate | 10000 | none |
| shadow-dance | Shadow Dance | buff | none | self | 0 | 0 | 0 | ultimate | 10000 | haste_bp:+3000@480 |

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
