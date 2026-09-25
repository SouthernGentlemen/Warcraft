# Hunter Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| kill-command | Kill Command | damage | physical | enemy | 110 | 9000 | 300 | mana | 90 | none |
| aimed-shot | Aimed Shot | damage | physical | enemy | 135 | 10000 | 420 | mana | 110 | none |
| explosive-trap | Explosive Trap | damage | physical | all-enemies | 90 | 6500 | 480 | mana | 105 | none |
| survival-instinct | Survival Instinct | buff | none | self | 0 | 0 | 600 | mana | 80 | damage_reduction_bp:+2500@300 |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| beast-mastery | Bestial Wrath | capstone-bestial-wrath | buff | none | self | 0 | 0 | physical_power_bp:+3000@480 |
| marksmanship | Trueshot Aura | capstone-trueshot-aura | buff | none | all-allies | 0 | 0 | all_power_bp:+1800@480 |
| survival | Wyvern Sting | capstone-wyvern-sting | damage | physical | enemy | 360 | 12000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
