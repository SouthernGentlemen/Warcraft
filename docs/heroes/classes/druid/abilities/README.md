# Druid Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| starfire | Starfire | damage | spell | enemy | 125 | 9000 | 420 | mana | 110 | none |
| shred | Shred | damage | physical | enemy | 115 | 9000 | 300 | energy | 35 | none |
| regrowth | Regrowth | heal | healing | lowest-ally | 135 | 9000 | 420 | mana | 115 | none |
| mangle | Mangle | damage | physical | enemy | 110 | 8500 | 360 | energy | 25 | none |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| balance | Moonkin Form | capstone-moonkin-form | buff | none | self | 0 | 0 | all_power_bp:+2500@480 |
| feral | Leader of the Pack | capstone-leader-of-the-pack | buff | none | all-allies | 0 | 0 | haste_bp:+1800@480 |
| restoration | Swiftmend | capstone-swiftmend | heal | healing | all-allies | 260 | 9000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
