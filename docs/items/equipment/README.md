# Equipment

## Purpose

Equipment is the portion of the item system that can be assigned to heroes to improve combat performance.

The equipment system should remain simple enough to manage across a large roster while still allowing meaningful class identity and progression.

## Fixed Equipment Slots

Each hero has seven fixed equipment slots.

### Armor Slots

- Head
- Chest
- Pants
- Feet
- Gloves

Each armor item occupies exactly one armor slot.

### Weapon Slot

- Weapon

Each hero equips exactly one weapon item.

The current design does not include a separate off-hand, shield, or second weapon slot. If those concepts are introduced later, they must fit within or explicitly expand the one-weapon-slot rule.

### Trinket Slot

- Trinket

Each hero equips exactly one trinket item.

## Armor Families

Armor uses four families:

- Cloth
- Leather
- Mail
- Plate

Class armor access follows a World of Warcraft-style proficiency hierarchy: classes that can use a heavier armor family may also use the lighter families below it.

| Class | Allowed Armor |
| --- | --- |
| Mage | Cloth |
| Priest | Cloth |
| Warlock | Cloth |
| Rogue | Cloth, Leather |
| Druid | Cloth, Leather |
| Hunter | Cloth, Leather, Mail |
| Shaman | Cloth, Leather, Mail |
| Paladin | Cloth, Leather, Mail, Plate |
| Warrior | Cloth, Leather, Mail, Plate |

This table defines equip eligibility, not balance preference. A class may ultimately be designed to prefer its heaviest available armor family.

## Weapons

All weapons occupy the single Weapon slot.

Initial weapon families include:

- Axe
- Sword
- Mace
- Dagger
- Staff
- Wand
- Bow
- Gun
- Crossbow

Additional weapon families may be added later if they create useful class or profession distinctions.

Class-specific weapon proficiency rules are not fixed yet and should be defined when the individual class specifications are expanded.

## Crafted Gear Progression

Crafted equipment has a fixed quality and stat structure by level.

| Level | Quality | Primary Stats | Tertiary Stats |
| --- | --- | ---: | ---: |
| 1 | White | 0 | 0 |
| 2 | Green | 1 | 0 |
| 3 | Blue | 2 | 0 |
| 4 | Epic | 2 | 1 |
| 5 | Epic | 2 | 2 |

Primary and tertiary stat families are defined in [Content / Stats](../../content/stats/README.md).

This structure defines how many stat lines crafted gear receives. Exact stat values, roll ranges, and selection rules remain open.

## Trinkets

Trinkets are an equipment family with one dedicated Trinket slot per hero. They may provide specialized bonuses or effects; exact effect rules and class/item restrictions remain open for later tuning.

## Equipment Eligibility

An item can only be equipped when all of its requirements are satisfied.

At minimum, equipment eligibility may depend on:

- equipment slot
- armor or weapon family
- class proficiency
- hero level or progression tier
- any future faction or item-specific restriction

## Tiering

Equipment progression aligns with the five hero levels and five game tiers.

Higher-tier equipment should support higher-tier content without making earlier equipment categories structurally obsolete.

## Open Areas

Later equipment design must define:

- class weapon proficiencies
- exact primary-stat values
- exact tertiary-stat values
- stat roll and selection rules
- item power within a tier
- set bonuses, if any
- trinket effect and restriction rules
- enchantable slots
- equipment acquisition and replacement flow
