# Warrior Abilities

## Purpose

This document defines the class-wide active ability pool used by hero loadouts and deterministic combat.

Every hero equips exactly **2 learned cooldown abilities**. The Ultimate is not independently selected: the hero's active specialization capstone resolves to exactly one authored Ultimate action.

All timing is authored in **60 Hz simulation ticks**.

## Cooldowns

| ID | Name | Kind | School | Target | Power | Coefficient BP | Cooldown Ticks | Resource | Cost | Effect |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| mortal-strike | Mortal Strike | damage | physical | enemy | 125 | 10000 | 360 | rage | 25 | none |
| bloodthirst | Bloodthirst | damage | physical | enemy | 105 | 8500 | 300 | rage | 25 | none |
| shield-slam | Shield Slam | damage | physical | enemy | 100 | 8000 | 360 | rage | 20 | none |
| thunder-clap | Thunder Clap | damage | physical | all-enemies | 80 | 6000 | 480 | rage | 20 | none |

## Capstone Ultimates

Ultimates consume the full 10,000-point ultimate bar. Each specialization capstone owns exactly one Ultimate action ID.

| Spec | Capstone | Action ID | Kind | School | Target | Power | Coefficient BP | Effect |
| --- | --- | --- | --- | --- | --- | ---: | ---: | --- |
| arms | Mortal Strike | capstone-mortal-strike | damage | physical | enemy | 440 | 13000 | none |
| fury | Bloodthirst | capstone-bloodthirst | damage | physical | enemy | 400 | 12500 | none |
| protection | Shield Slam | capstone-shield-slam | shield | physical | self | 500 | 10000 | none |

## Selection

Ability 1 and Ability 2 come from the learned compatible cooldown pool. Ultimate resolution comes only from the active specialization's selected capstone `ultimate_id`.
