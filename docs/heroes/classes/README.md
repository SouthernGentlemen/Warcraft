# Classes

## Purpose

Classes define a hero's combat identity, resource model, specialization choices, talent progression, auto-attack behavior, cooldown pool, and ultimate pool.

Every class follows the same five-level progression framework.

## Hero Setup

A configured hero is defined by four player-controlled setup layers:

1. Gear choices
2. Talent choices
3. Cooldown choices
4. Ultimate choice

The hero's auto-attack is determined by the hero's chosen specialization and is not a separate loadout slot.

## Specializations and Talent Trees

Every class has exactly three specializations.

Each specialization is represented by one talent tree.

A hero does not choose a specialization from a separate menu. The **first talent point assigned at Level 1 chooses the specialization** by locking the hero into the tree that received that point.

The chosen specialization determines:

- the hero's primary talent tree
- the hero's auto-attack behavior
- the hero's core combat role
- class-specific Mastery behavior later
- any specialization-specific ability restrictions

The other two talent trees remain locked until the hero selects a capstone in the primary tree.

## Talent Tree Structure

Every specialization has one talent tree with three tiers.

### Tier 1

- 3 talent options
- available when entering that tree
- selecting a Tier 1 talent is required before Tier 2 in that tree can be selected

### Tier 2

- 3 talent options
- requires a selected Tier 1 talent in the same tree
- selecting a Tier 2 talent is required before Tier 3 in that tree can be selected

### Tier 3 — Capstone

- 2 capstone options
- requires a selected Tier 2 talent in the same tree
- exactly one of the two capstones may be selected in that tree

All talents are one-point choices unless a later specification explicitly changes that rule.

## Talent Points and Level Thresholds

Every hero level grants exactly one talent point.

| Hero Level | Total Talent Points | Talent Threshold |
| --- | ---: | --- |
| 1 | 1 | Spend the first point in one tree. That tree becomes the hero's specialization; the other two trees lock. |
| 2 | 2 | Spend the second point in Tier 2 of the chosen specialization tree. |
| 3 | 3 | Spend the third point on exactly one of the two Tier 3 capstones in the chosen specialization tree. Completing the capstone unlocks the other two trees. |
| 4 | 4 | Spend one point in any legally available talent. Off-spec trees begin at Tier 1. |
| 5 | 5 | Spend one point in any legally available talent. Tier progression rules still apply independently inside each tree. |

This creates a mandatory Level 1–3 specialization progression:

**Tier 1 -> Tier 2 -> Capstone**

After the capstone is chosen, cross-tree talent investment becomes available.

Because the maximum hero level is 5, a hero can only spend two additional points after unlocking the off-spec trees. This naturally limits off-spec depth unless the level cap or talent-point system changes later.

## Cross-Tree Rules

Once the primary tree capstone is selected:

- the two other trees unlock
- the hero may continue buying unselected legal talents in the primary tree
- the hero may begin investing in Tier 1 of either off-spec tree
- Tier 2 of an off-spec tree requires a Tier 1 talent in that same tree
- Tier 3 of an off-spec tree requires a Tier 2 talent in that same tree
- normal capstone exclusivity applies in every tree

At the current Level 5 cap, an off-spec capstone cannot be reached through normal leveling because only two post-capstone talent points remain.

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
