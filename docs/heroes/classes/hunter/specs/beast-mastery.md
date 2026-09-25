# Hunter — Beast Mastery

## Identity

- Role: Ranged damage / pet support
- Resource: Mana
- Primary stat: Agility
- Auto-attack: Beast Shot — ranged weapon damage; companion follows for 30% of shot damage

## Talent Prototype

This compact prototype uses exactly **2 Tier 1 talents**, **2 Tier 2 talents**, and **1 capstone**. The choices are canonical Classic talents from the **Beast Mastery** tree; prototype combat tuning may be added separately without changing this 2 / 2 / 1 structure.

The single capstone is the active specialization's Ultimate and resolves through its authored `ultimate_id`.

### Tier 1

Choose 1 of 2.

| Talent | Prototype effect |
| --- | --- |
| **Improved Aspect of the Hawk** | Canonical Classic talent; prototype tuning is intentionally deferred. |
| **Endurance Training** | Canonical Classic talent; prototype tuning is intentionally deferred. |

### Tier 2

Requires a Tier 1 choice. Choose 1 of 2.

| Talent | Prototype effect |
| --- | --- |
| **Pathfinding** | Canonical Classic talent; prototype tuning is intentionally deferred. |
| **Bestial Swiftness** | Canonical Classic talent; prototype tuning is intentionally deferred. |

### Capstone

Requires a Tier 2 choice. Choose the single capstone.

| Capstone | Prototype effect |
| --- | --- |
| **Bestial Wrath** | Defines the hero Ultimate action `capstone-bestial-wrath`. |

Canonical source: https://github.com/maladr0it/classic-talent-calculator/blob/master/src/trees/Hunter/data.ts

## Combat Loadout

This specialization uses its authored auto-attack, exactly 2 equipped cooldown abilities, and exactly 1 equipped ultimate.

Talents modify that shared combat package; they do not add extra active ability slots.
