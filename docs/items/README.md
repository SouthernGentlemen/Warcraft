# Items

## Purpose

Items are the persistent resource layer that connects hero power, professions, base development, content access, and meta progression.

The item system is divided into four top-level groups:

- [Equipment](./equipment/README.md) — items equipped by heroes
- [Reagents](./reagents/README.md) — profession and crafting materials
- [Economy](./economy/README.md) — base-building and meta-progression resources
- [Keys & Access Items](./keys/README.md) — dungeon keys and other items that unlock or gate content

## Equipment

Equipment directly improves heroes.

The committed hero loadout contains seven fixed slots:

- Head
- Chest
- Pants
- Feet
- Gloves
- Weapon
- Trinket

Armor is divided into Cloth, Leather, Mail, and Plate.

Weapon items occupy a single weapon slot. Weapon families include melee and ranged categories such as axes, swords, maces, daggers, staves, wands, bows, guns, and crossbows. Exact class weapon proficiencies will be defined with the class and equipment specifications.

Trinkets occupy the dedicated Trinket slot. They remain part of the equipment item family and may provide specialized stats or effects without changing the one-item-per-slot loadout rule.

## Reagents

Reagents are profession-facing items used to craft, enhance, or otherwise produce gameplay items.

Each profession may have its own material families and tier progression. Reagents should align with the game's five progression tiers.

## Economy Items

Economy items are resources used for base construction, base upgrades, unlocks, and other meta-progression systems.

They are separate from hero equipment and profession reagents even when they share sources or progression tiers.

## Keys & Access Items

Keys and access items gate specific content rather than directly increasing hero power.

Examples include dungeon keys, access tokens, and future attunement-style items.

Each key must define the content it unlocks, whether it is permanent or consumed, and how it is acquired.

## Tiering

Items should align with the five game tiers wherever tiering is relevant.

Tier defines progression position. Rarity, quality, or item-specific power can exist within a tier without replacing the tier system.

## Enchantments

Enchanting may add permanent enhancements to equipment.

The system must eventually define valid enchantment targets, replacement rules, upgrade rules, and whether enchantment materials can be recovered.

## Consumables

Alchemy may produce temporary-use items such as potions and flasks.

Consumables should provide useful preparation without becoming mandatory busywork for routine content.

## Open Areas

Later item design must define:

- item generation
- loot rules
- class weapon proficiencies
- trinket effect and restriction rules
- enchantment rules
- consumable limits
- inventory behavior
- duplicate-item handling
- economy resource families and sinks
- profession reagent families and recipes
- key consumption and persistence rules
