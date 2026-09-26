# Warcraft Prototype

A static, no-build mockup of a faction-based incremental RPG: recruit heroes, upgrade a base,
equip and train heroes, and send parties into deterministic auto-battles of growing size.

- **How to work in this repo:** [AGENTS.md](./AGENTS.md)
- **What to build next:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

## Quick start

```bash
npm run dev
```

No install step. `npm run dev` restarts any previous dev server, serves the repo on port 5173
(or the next free port), and opens `/mockup/`, which redirects to the Base screen. Set
`NO_OPEN=1` to skip opening a browser.

```bash
npm test
```

Runs the behavioral suite (`scripts/tests/`) and the deterministic combat smoke test.

## Screens

Player-facing (every page shares the top navigation: Base, Heroes, Raids & Sieges). Battle is
reached from the Embark bar or Raids & Sieges and returns there.

| Page                 | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `base.html`          | The hub: roster sidecar (left), map of buildings, Embark bar (bottom)    |
| `heroes.html`        | Roster, hero workspace (abilities, gear, stats, talents), party loadouts |
| `endgame.html`       | Raids & Sieges launches from saved raid and siege loadouts               |
| `battle.html`        | Deterministic auto-battle for 1, 3, 5, 10, and 20 heroes                 |
| `quest-journal.html` | Available, active, and completed quests                                  |
| `inventory.html`     | Global owned-item inventory                                              |
| `profession.html`    | Artisans Guild profession workspace                                      |
| `race-selector.html` | Faction, race, and class availability                                    |

Developer-only (linked from `dev.html`): `gear.html` and `talent-calculator.html`.

## Game rules (current contracts)

- **Factions:** Alliance (Human, Dwarf, Gnome, Night Elf; exclusive class Paladin) and Horde
  (Orc, Undead, Troll, Tauren; exclusive class Shaman). Each faction has its own campaign:
  Base, buildings, resources, roster, loadouts, professions, assignments, and clock. Heroes never
  cross factions.
- **Base Level** is the Keep level (1–5). It sets roster capacity (10 per level) and unlocks
  content: Quest 1, Incursion 2, Dungeon 3, Raid 4, Siege 5.
- **Hero XP:** a 20-point bar per level. Victories grant Quest +1, Incursion +2, Dungeon +3,
  Raid/Siege +0. A full bar makes a hero eligible to train; leveling happens only through the
  Class Hall and never above the Base Level. Max hero level is 5.
- **Formations:** parties are five fixed slots, 2 / 2 / 1 from rear to front; the front slot
  draws the most aggro. A raid is two parties and a siege is four; raid and siege groups can
  inherit a saved party and override individual slots.
- **Professions:** three tracks (Artisan, Gathering, Survival). A hero knows at most one
  profession per track.
- **Buildings with assignments** (Artisans Guild, Gathering Camp, Survival Lodge, Class Hall)
  have three hero slots. An assignment lasts one campaign day.
- **Campaign clock:** every confirmed Embark advances the faction's clock one phase
  (Day → Night → Day); one day is two phases.
- **Combat** is real-time, deterministic, and seeded. Each hero has an auto attack, two
  cooldown abilities, and an ultimate. A battle with no winner after three minutes of combat
  time ends as a defeat.

## Repository layout

```
mockup/           pages (*.html + page script + page stylesheet)
  ui/             shared runtime: state modules (warcraft-*.js) and UI layer (wow-*.js, wow-ui.css)
  battle/         battle page runtime (ES modules)
  combat/engine/  deterministic combat simulation (ES modules)
  combat/smoke-test.js
data/             authored runtime JSON fetched by the pages
scripts/tests/    node:test behavioral suite and its browser-like harness
dev-server.mjs    static dev server used by npm run dev
```
