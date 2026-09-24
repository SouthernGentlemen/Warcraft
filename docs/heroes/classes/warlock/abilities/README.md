# Warlock Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Warlock equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| haunt | Haunt | damage | spell | enemy | 115 | 9000 | 420 | mana | 110 | none |
| hand-of-guldan | Hand of Gul'dan | damage | spell | all-enemies | 100 | 7000 | 480 | mana | 130 | none |
| conflagrate | Conflagrate | damage | spell | enemy | 135 | 9000 | 360 | mana | 120 | none |
| drain-life | Drain Life | heal | healing | self | 100 | 6000 | 480 | mana | 100 | none |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| metamorphosis | Metamorphosis | buff | none | self | 0 | 0 | 0 | ultimate | 10000 | spell_power_bp:+3000@480 |
| soulburn | Soulburn | damage | spell | all-enemies | 270 | 11500 | 0 | ultimate | 10000 | none |

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
