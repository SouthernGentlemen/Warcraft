# Rogue Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| mutilate | Mutilate | damage | physical | enemy | 110 | 9000 | 300 | energy | 35 | none |
| sinister-strike | Sinister Strike | damage | physical | enemy | 95 | 8000 | 240 | energy | 30 | none |
| backstab | Backstab | damage | physical | enemy | 135 | 10000 | 420 | energy | 40 | none |
| evasion | Evasion | buff | none | self | 0 | 0 | 600 | energy | 25 | damage_reduction_bp:+3000@300 |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| assassination | Vigor | capstone-vigor | buff | none | self | 0 | 0 | haste_bp:+2500@480 |
| combat | Adrenaline Rush | capstone-adrenaline-rush | buff | none | self | 0 | 0 | haste_bp:+3500@480 |
| subtlety | Premeditation | capstone-premeditation | damage | physical | enemy | 400 | 13000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
