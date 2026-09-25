# Paladin Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| holy-shock | Holy Shock | heal | healing | lowest-ally | 120 | 8500 | 360 | mana | 95 | none |
| shield-of-the-righteous | Shield of the Righteous | damage | physical | enemy | 110 | 8500 | 360 | mana | 90 | none |
| templars-verdict | Templar's Verdict | damage | physical | enemy | 140 | 10000 | 420 | mana | 110 | none |
| consecration | Consecration | damage | spell | all-enemies | 85 | 6000 | 480 | mana | 105 | none |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| holy | Holy Shock | capstone-holy-shock | heal | healing | lowest-ally | 450 | 12000 | none |
| protection | Holy Shield | capstone-holy-shield | shield | healing | self | 520 | 9000 | none |
| retribution | Repentence | capstone-repentence | damage | spell | all-enemies | 280 | 10000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
