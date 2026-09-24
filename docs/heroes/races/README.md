# Races

## Purpose

Race provides exactly one passive or proc-based bonus to every hero.

Racials should create flavor and small build preferences without outweighing class, specialization, gear, or talent choices.

The values below are **provisional starting balance targets** for playtesting.

## Balance Target

Combat racials should average roughly a low-single-digit contribution to combat value over a normal encounter.

Utility and economy racials should be bounded so their long-term value is comparable without becoming mandatory.

## Alliance

### Human — Every Man for Himself

Once per combat, the first time the hero is affected by a hard crowd-control effect, there is a **35% chance** to immediately break that effect.

Hard crowd control includes effects such as stun, fear, sleep, or incapacitate. Slows, damage-over-time effects, and ordinary debuffs do not trigger the racial.

**Balance intent:** situational but potentially high-value encounter utility. It does nothing in encounters without hard crowd control.

### Gnome — Resourceful

When the hero spends Mana, Rage, or Energy on an ability, there is a **10% chance to refund 50% of that ability's resource cost**.

The effect should use a short internal cooldown so very rapid or very cheap abilities cannot create excessive refunds.

For Druids, the racial refunds whichever resource the current form spent.

**Balance intent:** about 5% average resource efficiency before internal-cooldown effects.

### Dwarf — Treasure Finder

At the end of a successful activity, there is a **10% chance to receive one additional roll from that activity's standard loot table**.

The bonus roll cannot produce:

- dungeon or access keys
- quest or progression-critical items
- guaranteed first-clear rewards
- unique one-time rewards

**Balance intent:** meaningful long-term progression value without multiplying rare progression gates.

## Horde

### Orc — Blood Fury

Damaging attacks and abilities have a chance to grant **20% increased Attack Power for 6 seconds**.

Recommended starting rules:

- 10% proc chance
- 20-second internal cooldown

**Balance intent:** approximately 4–5% sustained physical throughput when regularly attacking.

Because Attack Power is a physical-output stat, this racial intentionally favors physical Orc builds unless the final class/race matrix limits incompatible combinations.

### Undead — Cannibal Strike

The hero heals for **5% of auto-attack damage dealt**.

Healing is applied after damage resolves and cannot exceed maximum health.

**Balance intent:** steady self-sustain worth roughly a few percent of maximum health over a typical encounter, depending on auto-attack contribution.

### Troll — Berserking

Auto-attacks have a chance to grant **20% increased auto-attack speed for 6 seconds**.

Recommended starting rules:

- 10% proc chance
- 20-second internal cooldown

This affects the auto-attack bar rather than all cooldown timers.

**Balance intent:** approximately 4–5% sustained auto-attack throughput when the proc is triggering normally.

## Tuning Notes

These racials are deliberately asymmetric:

- Human is encounter utility.
- Gnome is resource efficiency.
- Dwarf is economy/progression.
- Orc is burst physical throughput.
- Undead is sustain.
- Troll is attack-frequency throughput.

They should be compared by overall account and encounter value rather than by forcing every racial to produce the same DPS number.

## Open Areas

- final proc chances
- final effect magnitudes
- internal cooldown lengths
- exact definition of hard crowd control
- final Attack Power formula
- whether race/class combinations are unrestricted
- whether Dwarf bonus rolls can contain crafted reagents and equipment equally
