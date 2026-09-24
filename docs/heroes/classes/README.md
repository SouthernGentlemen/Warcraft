# Classes

## Purpose

Classes define a hero's combat identity, resource model, specialization choices, talent progression, auto-attack behavior, cooldown pool, and ultimate pool.

Every class follows the same five-level progression framework.

## Hero Combat Setup

A configured hero is defined by four player-controlled setup layers:

1. Gear choices
2. Talent choices
3. Cooldown choices
4. Ultimate choice

The hero's auto-attack is determined by the hero's active specialization and is not a separate loadout slot.

## Specializations

Every class has exactly three specializations.

Each specialization is represented by one talent tree.

A hero selects an active specialization at Level 1. The active specialization determines:

- which talent tree the hero uses
- the hero's auto-attack behavior
- the hero's preferred combat role
- class-specific Mastery behavior later
- any spec-specific ability restrictions

Only the active specialization's talent tree receives talent points.

Respecialization rules are not yet defined.

## Talent Tree Structure

Every specialization has one talent tree with three tiers.

### Tier 1

- 3 talent options
- first available at Hero Level 1

### Tier 2

- 3 talent options
- first available at Hero Level 2

### Tier 3 — Capstone

- 2 capstone options
- first available at Hero Level 3
- the hero must choose exactly one of the two capstones
- both capstones can never be active at the same time

All talents are currently treated as one-point choices.

## Talent Points and Level Thresholds

Every hero level grants exactly one talent point.

| Hero Level | Total Talent Points | Required Talent Progression | Crafted Gear Structure |
| --- | ---: | --- | --- |
| 1 | 1 | Choose specialization and one Tier 1 talent | White, no stat lines |
| 2 | 2 | Choose one Tier 2 talent | Green, 1 primary stat |
| 3 | 3 | Choose exactly one Tier 3 capstone | Blue, 2 primary stats |
| 4 | 4 | Choose one additional unselected Tier 1 or Tier 2 talent | Epic, 2 primary + 1 tertiary |
| 5 | 5 | Choose one additional unselected Tier 1 or Tier 2 talent | Epic, 2 primary + 2 tertiary |

By Level 5, a hero has five selected talents from the seven options in the active tree:

- up to three Tier 1 options
- up to three Tier 2 options
- exactly one of two Tier 3 capstones

The Level 3 capstone is mandatory before Level 4 or Level 5 talent points can be spent.

## Resource Models

Most classes use Mana.

### Mana

Mana is used by:

- Mage
- Warlock
- Priest
- Hunter
- Paladin
- Shaman

### Rage

Rage is used by:

- Warrior

Rage is expected to build through combat activity and be spent by abilities.

Exact generation and decay rules remain open.

### Energy

Energy is used by:

- Rogue

Energy is expected to regenerate continuously and be spent by abilities.

Exact pool size and regeneration rate remain open.

### Druid Resources

Druid resource behavior depends on form:

- caster forms use Mana
- Cat Form uses Energy
- Bear Form uses Rage

Form-switching rules, resource conversion, and resource retention remain open.

## Auto-Attacks

Every specialization defines its own auto-attack behavior.

The auto-attack uses the shared real-time attack-bar system.

A specialization may change:

- attack type
- damage school
- range
- weapon interaction
- base attack timing
- additional class-specific behavior

Exact timing and formulas will be defined later.

## Cooldown Loadout

A class can define more than two cooldown abilities.

A hero equips exactly two cooldown abilities at a time.

Selected cooldown abilities are used automatically when:

- the ability is off cooldown
- the hero has sufficient class resource
- a valid target or combat condition exists

Ability priority rules and tie-breaking remain open.

Individual cooldown choices may be class-wide or specialization-restricted.

## Ultimate Loadout

A class can define multiple ultimate abilities.

A hero equips exactly one ultimate at a time.

The selected ultimate becomes usable when the hero's ultimate bar is full and its activation conditions are satisfied.

Ultimate-bar generation rules remain open.

Individual ultimate choices may be class-wide or specialization-restricted.

## Class Specifications

- [Mage](./mage.md)
- [Rogue](./rogue.md)
- [Warlock](./warlock.md)
- [Warrior](./warrior.md)
- [Priest](./priest.md)
- [Druid](./druid.md)
- [Hunter](./hunter.md)
- [Paladin](./paladin.md)
- [Shaman](./shaman.md)

## Open Areas

Later class design must define:

- exact talents for every tree
- cooldown ability pools
- ultimate ability pools
- resource pool sizes
- resource regeneration or generation rates
- ability costs
- auto-attack timing
- class-specific Mastery
- class weapon proficiencies
- respecialization rules
