# Shaman Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| lava-burst | Lava Burst | damage | spell | enemy | 130 | 9500 | 420 | mana | 105 | none |
| stormstrike | Stormstrike | damage | physical | enemy | 120 | 9000 | 360 | mana | 95 | none |
| riptide | Riptide | heal | healing | lowest-ally | 120 | 8500 | 360 | mana | 95 | none |
| chain-lightning | Chain Lightning | damage | spell | all-enemies | 90 | 6500 | 480 | mana | 110 | none |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| elemental | Elemental Mastery | capstone-elemental-mastery | damage | spell | all-enemies | 340 | 12500 | none |
| enhancement | Stormstrike | capstone-stormstrike | damage | physical | enemy | 420 | 13000 | none |
| restoration | Mana Tide Totem | capstone-mana-tide-totem | buff | none | all-allies | 0 | 0 | haste_bp:+1800@480 |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
