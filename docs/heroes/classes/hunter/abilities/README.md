# Hunter Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Hunter equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| kill-command | Kill Command | damage | physical | enemy | 110 | 9000 | 300 | mana | 90 | none |
| aimed-shot | Aimed Shot | damage | physical | enemy | 135 | 10000 | 420 | mana | 110 | none |
| explosive-trap | Explosive Trap | damage | physical | all-enemies | 90 | 6500 | 480 | mana | 105 | none |
| survival-instinct | Survival Instinct | buff | none | self | 0 | 0 | 600 | mana | 80 | damage_reduction_bp:+2500@300 |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| bestial-wrath | Bestial Wrath | buff | none | self | 0 | 0 | 0 | ultimate | 10000 | physical_power_bp:+3000@480 |
| volley | Volley | damage | physical | all-enemies | 275 | 11000 | 0 | ultimate | 10000 | none |

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
