# Priest Abilities

## Purpose

This document defines the initial class-wide active ability pool used by hero loadouts and the deterministic combat simulator.

A Priest equips exactly **2 cooldown abilities** and exactly **1 ultimate**. Specialization talents can modify these actions without adding extra active slots.

All timing is authored in **60 Hz simulation ticks**. These are prototype combat values and can be tuned without changing the action schema.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| penance | Penance | heal | healing | lowest-ally | 110 | 8000 | 360 | mana | 100 | none |
| flash-heal | Flash Heal | heal | healing | lowest-ally | 150 | 10000 | 480 | mana | 130 | none |
| mind-blast | Mind Blast | damage | spell | enemy | 125 | 9000 | 420 | mana | 100 | none |
| power-word-shield | Power Word: Shield | shield | healing | lowest-ally | 180 | 7000 | 600 | mana | 120 | none |

## Ultimates

Ultimates consume a full 10,000-point ultimate bar.

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| divine-hymn | Divine Hymn | heal | healing | all-allies | 280 | 10000 | 0 | ultimate | 10000 | none |
| void-eruption | Void Eruption | damage | spell | all-enemies | 280 | 11000 | 0 | ultimate | 10000 | none |

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
