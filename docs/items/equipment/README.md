# Equipment

## Purpose

Equipment is the portion of the item system that can be assigned to heroes to improve combat performance.

The equipment system should remain simple enough to manage across a large roster while still allowing meaningful class identity and progression.

## Fixed Equipment Slots

Each hero currently has six fixed equipment slots.

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

Additional weapon families may be added later if they create useful class or profession distinctions.

Class-specific weapon proficiency rules are not fixed yet and should be defined when the individual class specifications are expanded.

## Trinkets

Trinkets are an equipment family and may provide specialized bonuses or effects.

A dedicated trinket slot is not yet part of the committed six-slot hero loadout. The exact trinket equip model remains open.

## Equipment Eligibility

An item can only be equipped when all of its requirements are satisfied.

At minimum, equipment eligibility may depend on:

- equipment slot
- armor or weapon family
- class proficiency
- hero level or progression tier
- any future faction or item-specific restriction

## Tiering

Equipment progression should align with the five hero levels and five game tiers.

Higher-tier equipment should support higher-tier content without making earlier equipment categories structurally obsolete.

## Open Areas

Later equipment design must define:

- class weapon proficiencies
- whether armor proficiency changes by hero level
- primary stats and secondary stats
- rarity and quality
- item power within a tier
- set bonuses, if any
- trinket slots and restrictions
- enchantable slots
- equipment acquisition and replacement flow
