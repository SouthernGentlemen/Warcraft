# Shaman — Elemental

## Identity

- Role: Ranged elemental spell damage
- Resource: Mana
- Primary stat: Intellect
- Auto-attack: Lightning Bolt — ranged Nature damage

## Talent Prototype

This compact prototype uses exactly **2 Tier 1 talents**, **2 Tier 2 talents**, and **1 capstone**. The choices are canonical Classic talents from the **Elemental** tree; prototype combat tuning may be added separately without changing this 2 / 2 / 1 structure.

The single capstone is the active specialization's Ultimate and resolves through its authored `ultimate_id`.

### Tier 1

Choose 1 of 2.

| Talent | Prototype effect |
| --- | --- |
| **Convection** | Canonical Classic talent; prototype tuning is intentionally deferred. |
| **Concussion** | Canonical Classic talent; prototype tuning is intentionally deferred. |

### Tier 2

Requires a Tier 1 choice. Choose 1 of 2.

| Talent | Prototype effect |
| --- | --- |
| **Elemental Focus** | Canonical Classic talent; prototype tuning is intentionally deferred. |
| **Reverberation** | Canonical Classic talent; prototype tuning is intentionally deferred. |

### Capstone

Requires a Tier 2 choice. Choose the single capstone.

| Capstone | Prototype effect |
| --- | --- |
| **Elemental Mastery** | Defines the hero Ultimate action `capstone-elemental-mastery`. |

Canonical source: https://github.com/maladr0it/classic-talent-calculator/blob/master/src/trees/Shaman/data.ts

## Combat Loadout

This specialization uses its authored auto-attack, exactly 2 equipped cooldown abilities, and exactly 1 equipped ultimate.

Talents modify that shared combat package; they do not add extra active ability slots.
