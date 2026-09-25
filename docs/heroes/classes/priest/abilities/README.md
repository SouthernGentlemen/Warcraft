# Priest Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| penance | Penance | heal | healing | lowest-ally | 110 | 8000 | 360 | mana | 100 | none |
| flash-heal | Flash Heal | heal | healing | lowest-ally | 150 | 10000 | 480 | mana | 130 | none |
| mind-blast | Mind Blast | damage | spell | enemy | 125 | 9000 | 420 | mana | 100 | none |
| power-word-shield | Power Word: Shield | shield | healing | lowest-ally | 180 | 7000 | 600 | mana | 120 | none |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| discipline | Power Infusion | capstone-power-infusion | buff | none | all-allies | 0 | 0 | all_power_bp:+2000@480 |
| holy | Lightwell | capstone-lightwell | heal | healing | all-allies | 300 | 9000 | none |
| shadow | Shadowform | capstone-shadowform | damage | spell | all-enemies | 320 | 12000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
