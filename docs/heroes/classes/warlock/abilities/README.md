# Warlock Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| haunt | Haunt | damage | spell | enemy | 115 | 9000 | 420 | mana | 110 | none |
| hand-of-guldan | Hand of Gul'dan | damage | spell | all-enemies | 100 | 7000 | 480 | mana | 130 | none |
| conflagrate | Conflagrate | damage | spell | enemy | 135 | 9000 | 360 | mana | 120 | none |
| drain-life | Drain Life | heal | healing | self | 100 | 6000 | 480 | mana | 100 | none |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| affliction | Dark Pact | capstone-dark-pact | damage | spell | enemy | 360 | 12000 | none |
| demonology | Improved Spellstone | capstone-improved-spellstone | shield | healing | self | 480 | 9000 | none |
| destruction | Conflagrate | capstone-conflagrate | damage | spell | all-enemies | 380 | 13000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
