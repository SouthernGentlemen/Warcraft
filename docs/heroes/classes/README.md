# Classes

## Purpose

Classes define hero resource models, specializations, talent trees, auto-attacks, cooldown pools, ultimate pools, armor access, and weapon access.

Each class has its own directory. Each class directory contains a class README and a `specs/` directory with exactly three specialization documents.

## Shared Class Rules

Every class follows the shared hero-build framework:

- 1 gear loadout
- talent choices
- exactly 2 equipped cooldown abilities
- exactly 1 equipped ultimate
- 1 specialization-driven auto-attack

The first talent point chooses the hero's specialization. The other two talent trees remain locked until the chosen tree's Level 3 capstone is selected.

Every specialization tree contains:

- Tier 1 — 3 options
- Tier 2 — 3 options
- Tier 3 — 2 mutually exclusive capstones

Every hero level grants one talent point.

## Talent Thresholds

| Hero Level | Talent Rule |
| --- | --- |
| 1 | First point selects the specialization by entering one tree at Tier 1. |
| 2 | Second point advances to Tier 2 in the selected tree. |
| 3 | Third point selects one of two capstones in the selected tree; the other two trees then unlock. |
| 4 | One additional legal talent point; off-spec trees begin at Tier 1. |
| 5 | One additional legal talent point; tree prerequisites still apply. |

## Resource Models

- Mana — Mage, Warlock, Priest, Hunter, Paladin, Shaman
- Rage — Warrior
- Energy — Rogue
- Druid — Mana, Energy, or Rage depending on form

## Class Directories

- [Mage](./mage/README.md)
- [Rogue](./rogue/README.md)
- [Warlock](./warlock/README.md)
- [Warrior](./warrior/README.md)
- [Priest](./priest/README.md)
- [Druid](./druid/README.md)
- [Hunter](./hunter/README.md)
- [Paladin](./paladin/README.md)
- [Shaman](./shaman/README.md)

## Shared Combat Rules

Selected cooldown abilities are used automatically when their activation requirements are met.

The selected ultimate is used when the ultimate bar is full and its activation requirements are met.

Auto-attacks use the shared real-time attack bar, but the attack itself is defined by specialization.

## Open Areas

- exact talent nodes
- exact cooldown ability pools
- exact ultimate pools
- resource pool sizes and regeneration
- ability costs
- exact attack-bar timings
- class-specific Mastery effects
- class weapon proficiencies
- respecialization rules
