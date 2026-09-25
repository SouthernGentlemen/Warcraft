# Base

## Purpose

The base is the player's persistent organizational progression layer.

It supports recruitment, hero advancement, crafting, storage, mission management, and access to higher tiers.

## Base Progression

Base systems are expected to use the same five-tier progression model as heroes and content.

Upgrading the base should gradually unlock stronger heroes, better crafting, more resources, and larger-scale activities.

### Faction Base Level and Roster Capacity

Each faction campaign owns its own Headquarters (Keep) level. The Keep level is the canonical **Base Level** and directly sets that faction's maximum roster size:

- Base Level 1 → 10 heroes
- Base Level 2 → 20 heroes
- Base Level 3 → 30 heroes
- Base Level 4 → 40 heroes
- Base Level 5 → 50 heroes

Alliance and Horde roster membership is isolated. A hero belongs to exactly one faction campaign, and saved formations, assignments, Quest/Embark state, and Battle handoffs may only reference heroes from that same faction.

## Expected Core Buildings

### Headquarters

The central base progression building.

Expected to gate major tier advancement and access to stronger buildings.

Faction presentation may differ between Alliance and Horde.

### Training

Supports hero leveling and may control the current hero level cap.

### Recruitment

Provides faction-valid hero discovery and recruitment. Recruitment Hall level controls how many candidates are discovered; roster capacity comes only from the active faction's Base Level.

### Command or Mission Building

Used to discover, organize, or launch content.

### Storage

Controls how many resources and crafted items can be held.

## Profession Buildings

Profession buildings are documented under [profession-buildings](./profession-buildings/README.md).

Current profession buildings:

- [Blacksmith](./profession-buildings/blacksmith/README.md)
- [Alchemist](./profession-buildings/alchemist/README.md)
- [Enchanter](./profession-buildings/enchanter/README.md)
- [Tailor](./profession-buildings/tailor/README.md)
- [Leatherworker](./profession-buildings/leatherworker/README.md)
- [Engineer](./profession-buildings/engineer/README.md)

## Building Progression

Buildings are expected to have five tiers.

Upgrades may require:

- gold
- construction resources
- crafted materials
- progression milestones
- headquarters tier

Exact costs and dependencies are not yet defined.

## Open Areas

Later base design must define:

- complete building list
- build slots
- construction time
- upgrade time
- resource buildings
- building prerequisites
- concurrent queues
- automation
- faction-specific presentation
