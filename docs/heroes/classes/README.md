# Classes

## Purpose

Classes define hero resource models, specializations, talent trees, auto-attacks, cooldown pools, ultimate pools, armor access, and weapon access.

Each class has its own directory. Each class directory contains a class README and a `specs/` directory with exactly three specialization documents.

## Shared Hero Build

Every hero has:

- gear choices
- talent choices
- exactly 2 selected cooldown abilities
- exactly 1 selected ultimate
- one specialization-defined auto-attack

## Talent Structure

Every class has 3 specialization trees.

Every specialization tree is now explicitly defined with:

- Tier 1 — 3 talents
- Tier 2 — 3 talents
- Tier 3 — 2 mutually exclusive capstones

Every hero level grants one talent point.

| Hero Level | Talent Rule |
| --- | --- |
| 1 | First point enters one tree and selects the specialization. |
| 2 | Second point selects one Tier 2 talent in that tree. |
| 3 | Third point selects one of two capstones; the other two trees unlock afterward. |
| 4 | One additional legal talent point; off-spec trees begin at Tier 1. |
| 5 | One additional legal talent point; normal tree prerequisites apply. |

## Ability Icon Contract

Every authored hero combat action carries a specific World of Warcraft icon mapping in runtime data. Normal abilities and Ultimates own `icon_slug` plus Wowhead-CDN source metadata in each class ability JSON. Each specialization's Auto Attack icon is authored on its class-index specialization record. Roster, Talent UI, and Battle resolve these authored slugs through the shared `WowUIIcons` layer; generic ability art is only a fallback for genuinely unknown/unauthored actions.

## Resources

- Mana — Mage, Warlock, Priest, Hunter, Paladin, Shaman
- Rage — Warrior
- Energy — Rogue
- Druid — Mana, Energy, or Rage depending on form

## Classes

- [Mage](./mage/README.md)
- [Rogue](./rogue/README.md)
- [Warlock](./warlock/README.md)
- [Warrior](./warrior/README.md)
- [Priest](./priest/README.md)
- [Druid](./druid/README.md)
- [Hunter](./hunter/README.md)
- [Paladin](./paladin/README.md)
- [Shaman](./shaman/README.md)

## Open Areas

The class framework is established. Remaining class work is primarily:

- cooldown ability pools
- ultimate ability pools
- resource pool sizes and regeneration/generation rates
- exact ability costs
- auto-attack timing and coefficients
- class-specific Mastery effects
- weapon proficiencies
- respecialization rules
