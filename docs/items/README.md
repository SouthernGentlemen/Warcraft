# Items

## Purpose

Items are the persistent resource layer that connects hero power, professions, base development, and meta progression.

The item system is divided into three top-level groups:

- [Equipment](./equipment/README.md) — items equipped by heroes
- [Reagents](./reagents/README.md) — profession and crafting materials
- [Economy](./economy/README.md) — base-building and meta-progression resources

## Equipment

Equipment directly improves heroes.

The committed hero loadout currently contains six fixed slots:

- Head
- Chest
- Pants
- Feet
- Gloves
- Weapon

Armor is divided into Cloth, Leather, Mail, and Plate.

Weapon items occupy a single weapon slot. Weapon families include categories such as axes, swords, maces, daggers, staves, and wands. Exact class weapon proficiencies will be defined with the class and equipment specifications.

Trinkets are part of the equipment item family, but a trinket slot has not yet been committed to the loadout.

## Reagents

Reagents are profession-facing items used to craft, enhance, or otherwise produce gameplay items.

Each profession may have its own material families and tier progression. Reagents should align with the game's five progression tiers.

## Economy Items

Economy items are resources used for base construction, base upgrades, unlocks, and other meta-progression systems.

They are separate from hero equipment and profession reagents even when they share sources or progression tiers.

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

- item statistics
- rarity and quality
- item generation
- loot rules
- class weapon proficiencies
- trinket equip rules
- enchantment rules
- consumable limits
- inventory behavior
- duplicate-item handling
- economy resource families and sinks
- profession reagent families and recipes
