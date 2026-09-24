# Stats

## Purpose

Stats are shared numerical attributes used by heroes, equipment, crafting, and combat.

The stat system is split into primary stats and tertiary stats.

Production balance is not final. The deterministic combat prototype uses the explicit formulas below so every stat already maps to an authoritative action or resource hook.

## Primary Stats

The five primary stats are:

### Spirit

Represents magical or spiritual sustain and recovery.

Its exact effect on resource regeneration, healing sustain, or other recovery systems remains to be defined.

### Stamina

Represents durability and survivability.

Stamina is expected to contribute to a hero's health or effective staying power.

### Strength

Represents physical power.

Strength is expected to be a primary offensive stat for strength-oriented physical classes.

### Agility

Represents physical finesse and speed.

Agility is expected to be a primary offensive stat for agility-oriented physical classes.

### Intellect

Represents magical power and mental capability.

Intellect is expected to be a primary offensive stat for spell-oriented classes.

## Tertiary Stats

The six tertiary stats are:

### Crit

Improves the chance for eligible attacks, spells, or heals to critically resolve.

### Haste

Improves combat speed.

Haste may affect systems such as auto-attack bar fill time and ability timing. Exact affected systems will be specified in combat rules.

### Spell Power

Improves the output of offensive spells.

### Healing Power

Improves the output of healing effects.

### Hit Rating

Improves reliability against miss or accuracy checks.

The exact hit model and any caps remain open.

### Mastery

Improves a class-specific mechanic or scaling rule.

Each class will define what Mastery modifies.

## Prototype Simulation Mapping

The simulation uses integer arithmetic and a 10,000-point basis-point scale.

### Baseline Stats by Hero Level

These are prototype naked-hero baselines before equipment.

| Level | Major Primary | Minor Primary | Stamina | Spirit | Crit | Haste | Hit Rating | Mastery |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 12 | 4 | 14 | 10 | 0 | 0 | 0 | 0 |
| 2 | 20 | 6 | 22 | 16 | 1 | 1 | 1 | 0 |
| 3 | 30 | 8 | 32 | 23 | 2 | 2 | 2 | 1 |
| 4 | 42 | 10 | 44 | 31 | 4 | 4 | 3 | 2 |
| 5 | 56 | 12 | 58 | 40 | 6 | 6 | 4 | 4 |

The class/spec primary stat receives **Major Primary**. The other Strength, Agility, and Intellect values receive **Minor Primary**.

### Direct Mappings

- **Stamina** -> `Max Health = 500 + Stamina × 50`
- **Strength / Agility** -> `Physical Power = max(Strength, Agility) × 10`
- **Intellect + Spell Power** -> `Spell Power Total = Intellect × 10 + Spell Power × 10`
- **Intellect + Healing Power** -> `Healing Power Total = Intellect × 8 + Healing Power × 12`
- **Intellect** -> `Max Mana = 500 + Intellect × 20`
- **Spirit** -> `Mana Regen / second = 10 + Spirit × 2`
- **Crit** -> `Crit Chance BP = min(5000, 500 + Crit × 100)`
- **Hit Rating** -> `Hit Chance BP = min(10000, 9000 + Hit Rating × 200)`
- **Haste** -> `Haste BP = Haste × 100`
- **Mastery** -> prototype fallback `Mastery Output BP = Mastery × 100`

The Mastery fallback is only to keep the stat live in simulation. Each specialization can replace that generic output multiplier with its own Mastery hook later.

### Resources

- Mana starts full and regenerates through Spirit.
- Energy has a 100-point maximum and regenerates 10 points per second.
- Rage has a 100-point maximum, starts at 0, gains 10 on successful auto-attacks and 5 when taking direct damage.
- Druid resource type is selected from the active form/spec configuration.

### Haste Timing

Auto-attack and cooldown progress use accumulators.

Each simulation tick adds:

`10,000 + Haste BP`

to the relevant progress accumulator.

Every 10,000 accumulated progress advances one base timing tick. This keeps Haste deterministic without floating-point frame durations.

## Crafted Gear Stat Counts

Crafted gear uses these stat families according to its level.

| Level | Quality | Primary Stats | Tertiary Stats |
| --- | --- | ---: | ---: |
| 1 | White | 0 | 0 |
| 2 | Green | 1 | 0 |
| 3 | Blue | 2 | 0 |
| 4 | Epic | 2 | 1 |
| 5 | Epic | 2 | 2 |

A stat count indicates the number of distinct stat lines on the item.

Exact values and whether duplicate stat types can appear on the same item remain open.

## Open Areas

Later stat design must define:

- final production stat curves
- stat values by equipment tier
- class-to-primary-stat relationships
- final Stamina, Spirit, Haste, Crit, Hit, Spell Power, and Healing Power tuning
- class-specific Mastery effects
- stat caps and diminishing returns, if any
