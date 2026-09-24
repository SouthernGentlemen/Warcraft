# Game Design Documentation

## Purpose

This directory is the authoritative design specification for the game.

The project will define the complete game at the systems level before meaningful implementation begins. Documentation starts broad and drills down only after each major system is coherent.

## Game Overview

The game is a faction-based incremental fantasy RPG built around developing a persistent roster of heroes, upgrading a base, crafting equipment, and sending increasingly large groups into progressively harder content.

The core progression is organized around five hero levels and five corresponding game tiers.

## Core Loop

Recruit heroes -> level heroes -> equip heroes -> deploy heroes -> earn resources -> upgrade the base -> craft stronger equipment -> unlock higher tiers -> expand the roster -> repeat.

## Factions

### Alliance

- Human
- Gnome
- Dwarf
- Faction-exclusive class: Paladin

### Horde

- Orc
- Undead
- Troll
- Faction-exclusive class: Shaman

## Classes

Shared classes:

- Mage
- Rogue
- Warlock
- Warrior
- Priest
- Druid

Faction-exclusive classes:

- Paladin — Alliance
- Shaman — Horde

## Hero Progression

Heroes progress from Level 1 through Level 5.

Hero level is the primary progression gate for content, roster development, base advancement, crafting tiers, and equipment progression.

## Content Progression

| Content | Party Size | First Available |
| --- | ---: | ---: |
| Quest | 1 | Level 1 |
| Incursion | 1 | Level 1 |
| Assault | 3 | Level 2 |
| Dungeon | 5 | Level 3 |
| Raid | 10 | Level 4 |
| Siege | 20 | Level 5 |

Earlier content types remain relevant at higher tiers.

The intended content range is:

- Level 1–5 Quests
- Level 1–5 Incursions
- Level 2–5 Assaults
- Level 3–5 Dungeons
- Level 4–5 Raids
- Level 5 Sieges

## Base and Crafting

The player maintains a persistent base that supports hero progression and resource production.

Known crafting paths include:

- Blacksmith: Copper -> Iron -> Steel -> Mithril -> Thorium
- Tailoring/Loom: Linen -> Wool -> Silk -> Mageweave -> Runecloth
- Leatherworking: five material tiers to be defined
- Enchanting: tiered essences and corresponding shards
- Alchemy: potions and flasks using elemental reagents including Air, Water, Earth, Fire, and Undeath
- Engineering: devices, utility items, and crafted technology to be defined

## Documentation Sections

- [Design](./design/README.md)
- [World](./world/README.md)
- [Heroes](./heroes/README.md)
- [Combat](./combat/README.md)
- [Content](./content/README.md)
- [Base](./base/README.md)
- [Crafting](./crafting/README.md)
- [Items](./items/README.md)
- [Economy](./economy/README.md)
- [Progression](./progression/README.md)
- [Incremental Systems](./incremental/README.md)

## Documentation Rule

Each section begins as a high-level README.

Detailed child specifications should only be added after the parent system is reviewed and its major rules are agreed upon.
