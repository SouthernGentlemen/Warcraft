# Warrior — Protection

## Identity

- Role: Tank / defense
- Resource: Rage
- Primary stat: Strength
- Auto-attack: Guarded Strike — defensive melee weapon damage

## Talent Prototype

This compact prototype uses exactly **2 Tier 1 talents**, **2 Tier 2 talents**, and **1 capstone**. The choices are canonical Classic talents from the **Protection** tree; prototype combat tuning may be added separately without changing this 2 / 2 / 1 structure.

The single capstone is the active specialization's Ultimate and resolves through its authored `ultimate_id`.

### Tier 1

Choose 1 of 2.

| Talent | Prototype effect |
| --- | --- |
| **Shield Specialization** | Canonical Classic talent; prototype tuning is intentionally deferred. |
| **Anticipation** | Canonical Classic talent; prototype tuning is intentionally deferred. |

### Tier 2

Requires a Tier 1 choice. Choose 1 of 2.

| Talent | Prototype effect |
| --- | --- |
| **Last Stand** | Canonical Classic talent; prototype tuning is intentionally deferred. |
| **Improved Shield Block** | Canonical Classic talent; prototype tuning is intentionally deferred. |

### Capstone

Requires a Tier 2 choice. Choose the single capstone.

| Capstone | Prototype effect |
| --- | --- |
| **Shield Slam** | Defines the hero Ultimate action `capstone-shield-slam`. |

Canonical source: https://github.com/maladr0it/classic-talent-calculator/blob/master/src/trees/Warrior/data.ts

## Combat Loadout

This specialization uses its authored auto-attack, exactly 2 equipped cooldown abilities, and exactly 1 equipped ultimate.

Talents modify that shared combat package; they do not add extra active ability slots.
