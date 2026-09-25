# Heroes

## Purpose

Heroes are the player's persistent roster and the central unit of progression.

## Hero Roster

The player recruits and develops multiple heroes rather than controlling one permanent main character.

Roster depth becomes increasingly important because advanced content requires larger parties.

## Hero Levels

Heroes progress through five levels:

- Level 1
- Level 2
- Level 3
- Level 4
- Level 5

Levels correspond to the game's five progression tiers.

Every class has an authored Level 1–5 baseline for Strength, Agility, Intellect, Stamina, and Spirit in `data/heroes/classes/index.json`. These base values are immutable identity/progression data; equipment, talents, and temporary effects are applied separately when final combat values are calculated.

A hero should remain capable of progressing from Level 1 to Level 5 rather than becoming permanently obsolete because of recruitment quality.

## Races

Alliance:

- Human
- Gnome
- Dwarf

Horde:

- Orc
- Undead
- Troll

Each race provides exactly one passive racial bonus. The Roster reads the authored racial name and mechanic directly from `data/heroes/races/index.json` and presents it with the hero's identity.

See [Races](./races/README.md).

## Classes

Shared:

- Mage
- Rogue
- Warlock
- Warrior
- Priest
- Druid
- Hunter

Faction-exclusive:

- Paladin — Alliance
- Shaman — Horde

See [Classes](./classes/README.md).

## Hero Setup

A hero's build is defined by:

- seven equipment slots
- one compact 2 / 2 / 1 specialization talent build
- fixed Auto Attack
- selected Ability 1
- selected Ability 2
- the specialization-capstone Ultimate

Auto Attack identity comes from the active specialization. Ability 1 and Ability 2 must be distinct learned abilities compatible with that specialization. The capstone defines the hero's Ultimate; Ultimate is not an independent generic class selection.

Saved party loadouts are roster-level records, not hero-level configuration. They store authoritative hero IDs and are validated for current availability when content launches.

## Hero Roles

Classes and specializations provide different contributions to a party such as:

- damage
- defense
- healing
- support
- utility

## Roster Pressure

Content scales from one hero to twenty heroes:

- Quest: 1
- Incursion: 1
- Assault: 3
- Dungeon: 5
- Raid: 10
- Siege: 20

This makes developing many capable heroes a core long-term objective.

## Hero Development

Expected hero development systems include:

- recruitment
- experience
- leveling
- class progression
- talents
- equipment
- consumables
- party composition
- temporary fatigue, injury, or recovery if needed

## Open Areas

The following require later specification:

- exact XP curves
- exact class talent nodes
- authored ability-pool expansion
- capstone and Ultimate tuning
- exact racial bonuses
- recruitment generation
- roster capacity
- class weapon restrictions
- recovery rules
- respec rules
