# Mage Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| arcane-barrage | Arcane Barrage | damage | spell | enemy | 100 | 9000 | 360 | mana | 100 | none |
| fire-blast | Fire Blast | damage | spell | enemy | 125 | 8500 | 480 | mana | 120 | none |
| frost-nova | Frost Nova | damage | spell | all-enemies | 70 | 5000 | 600 | mana | 130 | none |
| ice-barrier | Ice Barrier | shield | healing | self | 180 | 6000 | 720 | mana | 140 | none |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| arcane | Arcane Power | capstone-arcane-power | buff | none | self | 0 | 0 | spell_power_bp:+3000@480 |
| fire | Combustion | capstone-combustion | damage | spell | all-enemies | 300 | 12000 | none |
| frost | Ice Barrier | capstone-ice-barrier | shield | healing | self | 500 | 10000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
