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

Training Grounds remains a general training-support building. Hero level-up authority belongs to the Class Hall.

### Class Hall

Houses faction-valid class trainers and owns hero level training. The Class Hall uses the shared three-slot building assignment system. A hero at 20 / 20 XP may begin one full campaign day of level training only when the next hero level does not exceed the active faction Base Level. Successful completion increases the hero by one level and resets next-level XP to 0. Assigned heroes open the shared Roster Talents view rather than a separate talent interface.

### Recruitment

Provides faction-valid hero discovery and recruitment. Recruitment Hall level controls how many candidates are discovered; roster capacity comes only from the active faction's Base Level.

### Command or Mission Building

Used to discover, organize, or launch content.

### Storage

Controls how many resources and crafted items can be held.

## Profession Buildings

Profession buildings are documented under [profession-buildings](./profession-buildings/README.md).

Current Base profession buildings:

- **Artisans Guild** — Blacksmith, Alchemist, Enchanter, Tailor, Leatherworker, Engineer
- **Gathering Camp** — Mining, Skinning, Herbalism
- **Survival Lodge** — Fishing, First Aid, Cooking

All three use the same shared three-slot assignment system as Class Hall.

## Shared Building Assignments

Class Hall, Artisans Guild, Gathering Camp, and Survival Lodge each expose exactly three assignment slots through one reusable assignment runtime. A slot stores its building ID, slot index, hero ID, selected trainer/profession/action, campaign start phase, and remaining campaign phases.

A hero cannot occupy more than one building assignment slot at a time. Pre-start assignments may be removed or replaced. Once training starts, the hero becomes unavailable for content/formation launch and the slot is locked until completion. One assignment lasts one full campaign day, represented deterministically as two campaign phase advances; real-world timers are not used. Assignment state is faction-scoped and persists through reload.

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
