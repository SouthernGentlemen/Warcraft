# Implementation Plan

Dependency-ordered task queue for the Warcraft mockup. Agents take the first `todo` task whose
dependencies are complete and follow the workflow in [AGENTS.md](./AGENTS.md).

WOWUI-001 through WOWUI-090 are complete. Their full specs are in git history:
`git show 918ed56:mockup/IMPLEMENTATION_PLAN.md`.

## Task format

```md
### WOWUI-NNN — Title

Status: todo | in progress | complete (YYYY-MM-DD) | superseded by WOWUI-NNN

Depends on: WOWUI-NNN

#### Objective

One or two sentences on the player-visible outcome.

#### Work

- Concrete changes, including what gets deleted.

#### Acceptance Criteria

- Observable, testable results.
- New behavior is covered in `scripts/tests/`.
- `npm test` passes.
```

Keep tasks small enough to land in one commit (`WOWUI-NNN: Title`).

## Phase 5 — Streamlined, End-to-End Playable Loop

Goal: a new player can play both faction campaigns from Base Level 1 through Sieges without
hitting a dead end.

### WOWUI-091 — Repository Streamline

Status: complete (2026-09-26)

Depends on: WOWUI-090

#### Objective

Remove legacy systems, redundant code, and documentation drift, and replace the source-grep
acceptance script with a behavioral test gate.

#### Work

- Deleted `/docs`, the old `mockup/README.md` and plan, `mockup/ui/index.html`, and every doc
  mirror in `data/` (`source_markdown`, doc-only `README.json` files). Replaced them with the
  root README.md, AGENTS.md, and this plan.
- Replaced the 200 KB `scripts/integration-acceptance.mjs` with `scripts/tests/` (node:test plus
  a browser-like harness): static integrity, data cross-references, shared-state behavior, and
  page-level player-loop flows.
- Reformatted all code with Prettier (`npm run format`).
- Removed the v1 localStorage migration, 20 uncalled API functions, 29 unused exports, dead
  helpers (e.g. `createEnemyDefinition`), 108 unused CSS classes, 23 unused CSS variables, 2
  unloaded data files, and about 250 unread data fields.
- Fixed: Embark crashed at Base Level 3 (`Roster.getLoadouts`); Embark quests and incursions had
  no NPC pool; Raids & Sieges rejected raid/siege loadouts and dropped their formations; raid and
  siege NPC pools were missing (placeholders, see WOWUI-094); `gear.html` threw on load and then
  looped; literal `\n` text on seven pages; undefined CSS tokens hid the HP mini-bars and swing
  timer; the Trinket icon was missing; stalemated battles never ended (now a defeat at three
  minutes); Embark and Raids & Sieges were missing from the top navigation on most pages.

#### Acceptance Criteria

- `npm test` passes with no `todo` tests.
- Every page boots with no errors or failed requests.
- Embark (Quest, Incursion, Dungeon) and Raids & Sieges (Raid) hand off to a Battle that
  completes and records its result.

---

### WOWUI-092 — Embark Quests on a Fresh Save

Status: superseded by WOWUI-101

Depends on: WOWUI-091

#### Objective

A new player can Embark at Base Level 1. Today a fresh save has no quests, so Embark shows "No
manual content is currently available" until the Quest Board sidecar on Base generates offers.

#### Work

- Move Quest Board round generation (`ensureQuestRoundOffers` in `base.js`) into
  `WarcraftRoster` so any page can guarantee the current round's offers.
- Have Embark list the current round's quest offers and launch them the way the Quest Board does.
- Delete the duplicated generation logic from `base.js`.

#### Acceptance Criteria

- A fresh save shows at least one Quest on Embark at Base Level 1.
- Launching it confirms the Embark, advances the clock once, and completes in Battle.
- The Quest Board and Embark show the same round.
- `npm test` passes.

---

### WOWUI-093 — Siege-Capable Rosters

Status: todo

Depends on: WOWUI-091

#### Objective

A Base Level 5 faction can field the 20 available heroes a Siege needs. Recruitment currently
offers 8 fixed candidates per faction, so a faction tops out at 14 heroes.

#### Work

- Let the Recruitment Hall offer enough candidates (for example rotating or generated recruits
  from the faction's valid race/class pairs) to reach the Base Level roster capacity.

#### Acceptance Criteria

- Through player actions only, a Base Level 5 faction can recruit at least 20 heroes.
- A Siege loadout of four ready parties launches from Raids & Sieges and completes in Battle.
- `npm test` covers the Siege launch.

---

### WOWUI-094 — Raid and Siege NPC Encounters

Status: todo

Depends on: WOWUI-091

#### Objective

Molten Core and the Siege of Blackrock fight their own enemies. The `raid-molten-core` and
`siege-blackrock` pools are placeholders that reuse the tier 2–3 dungeon bosses.

#### Work

- Author raid and siege NPCs in `data/npcs/catalog.json` with combat stats scaled for 10 and 20
  heroes.
- Point the two pools at them.

#### Acceptance Criteria

- Neither pool references dungeon NPCs.
- A Raid and a Siege both complete in Battle.
- `npm test` passes.

---

### WOWUI-095 — Starter Roster Levels and Base Level

Status: todo

Depends on: WOWUI-091

#### Objective

The starting roster follows the Base Level cap. Seeded heroes start at levels 1–5 while the
Base is level 1, which contradicts "heroes never level above the Base Level".

#### Work

- Decide whether starter heroes start at level 1 or the cap only governs training, then make
  the seed data and README agree.

#### Acceptance Criteria

- A fresh save's heroes match the documented rule, and a test enforces it.
- `npm test` passes.

---

### WOWUI-096 — Solo Healer Quests

Status: todo

Depends on: WOWUI-091

#### Objective

A solo healer's quest has a fair outcome. A lone Holy Priest cannot kill a single quest NPC, so
the fight always runs to the three-minute limit and ends as a defeat.

#### Work

- Either give healers enough damage to finish solo fights, or have one-hero quests require a
  damage-capable specialization and say so on the Quest Board and Embark.

#### Acceptance Criteria

- A one-hero quest with any allowed hero ends in a win or loss before the time limit.
- `npm test` passes.

---

### WOWUI-097 — Gear Inspection Layout at Narrow Widths

Status: superseded by WOWUI-108

Depends on: WOWUI-091

#### Objective

The developer-only `gear.html` stays readable at about 800 px wide, where the roster column
currently overlaps the character header.

#### Acceptance Criteria

- No overlapping text on `gear.html` at 800 px wide or more.
- `npm test` passes.

## Phase 6 — Flat, Minimal UI

Goal: every screen is flat, icon-first, and obvious. Heroes live in one roster; information sits
in tooltips; focused tasks open in modals.

Target layout contracts for this phase:

- **Base** is the hub: top bar (navigation, resources, clock), a **roster sidecar** on the left
  with an icon strip clamped to its right edge (Journal, Inventory, Crafting), the map in the
  center, and the **Embark bar** docked at the bottom.
- **One roster.** The roster sidecar is the only hero list. Every assignment (party slot,
  building slot, Quest Board automation) is a drag from it. Clicking a hero opens the hero modal.
- **Embark bar** covers Quest, Incursion, and Dungeon: pick content, drag a 2 / 2 / 1 party (or
  load a saved party), Embark. Battle returns to Base.
- **Raids & Sieges** stays a separate page with deliberate setup friction: raid and siege
  loadouts are built there, not in the Embark bar.
- **Buildings** open a compact modal with their one function plus an upgrade button. Profession
  buildings train heroes and hold the recipe bank; crafting has its own page. Armory, Bank, and
  Storehouse merge into one Storehouse that owns all inventory.
- **Navigation:** Base, Crafting, Raids & Sieges. Battle is not a navigation destination.
- **Flatness budget** (every screen): at most two framed layers, no hero lists outside the roster
  sidecar, secondary information in tooltips.

### WOWUI-098 — Loadout Editors Stay Open After a Drop

Status: complete (2026-09-26)

Depends on: WOWUI-091

#### Objective

Dragging heroes into Party, Raid, and Siege formations works continuously. Today every drop
saves but re-renders the manager with `openId = null`, collapsing the editor.

#### Work

- Keep each manager's open editor id outside its render function in `heroes.js`.

#### Acceptance Criteria

- Five heroes can be dragged into a party one after another without reopening the editor
  (verified in a browser).
- `npm test` passes.

---

### WOWUI-099 — Flat UI Foundation

Status: complete (2026-09-26)

Depends on: WOWUI-091

#### Objective

Give screens one flat surface and one modal instead of nested frames.

#### Work

- Add `.wow-panel` (single framed surface) to `ui/wow-ui.css` and a shared `WowUIModal`
  (`<dialog>`-based open/close, Escape and backdrop close) in `ui/`.
- Document the flatness budget and a nesting-depth check in AGENTS.md.

#### Acceptance Criteria

- The modal opens, closes with Escape and backdrop click, and returns focus.
- A behavioral test covers the modal API.
- `npm test` passes.

---

### WOWUI-100 — Roster Sidecar on Base

Status: complete (2026-09-26)

Depends on: WOWUI-099

#### Objective

Base shows the active faction's roster in a left sidecar that every hero assignment drags from.

#### Work

- New shared roster sidecar: portrait, name, and status per hero; details in a tooltip;
  draggable when available; click opens hero details. Expose a small drop-target API other
  components use.
- Clamp an icon strip to its right edge: Journal, Inventory, Crafting.
- Delete the left action dock and the stronghold badge.

#### Acceptance Criteria

- The sidecar lists exactly the active faction's heroes and updates on roster changes.
- A behavioral test covers the drop-target API.
- `npm test` passes.

---

### WOWUI-101 — Embark Bar

Status: complete (2026-09-26)

Depends on: WOWUI-100

#### Objective

Manual play starts from a bar docked at the bottom of Base: Quest, Incursion, or Dungeon, a
2 / 2 / 1 party, and one Embark button.

#### Work

- Move `embark.js` logic into the bar: content picker by Base Level, party strip fed by drags
  from the roster sidecar, saved-party selector, Embark into Battle and back to Base.
- A fresh save always offers at least one Quest (absorbs WOWUI-092).
- Delete `embark.html/js/css` and the Embark and Battle navigation entries.

#### Acceptance Criteria

- From a fresh save, a Quest launches from the bar and completes in Battle.
- A Dungeon launches with a party built in the bar at Base Level 3.
- Loop tests drive the bar instead of the Embark page.
- `npm test` passes.

---

### WOWUI-102 — Buildings Take Heroes From the Roster Sidecar

Status: todo

Depends on: WOWUI-100

#### Objective

Assignment slots (Class Hall, Artisans Guild, Gathering Camp, Survival Lodge, Quest Board
automation) are drop targets fed by the roster sidecar.

#### Work

- Delete the inline roster from the assignment board, the Class Hall trainer grid (the trainer
  shows in the slot tooltip), and the Quest Board dispatch cards, hero dropdowns, and duplicate
  Dungeon Map (manual play is the Embark bar).

#### Acceptance Criteria

- No building renders its own hero list.
- Assigning, training, and removing heroes still works in every assignment building.
- `npm test` passes.

---

### WOWUI-103 — Building Modal Replaces the Sidecar

Status: todo

Depends on: WOWUI-099, WOWUI-102

#### Objective

Clicking a building opens a compact modal with its one function and an upgrade button.

#### Work

- Replace the building sidecar with `WowUIModal`; upgrade cost moves into the button tooltip.
- Building tooltips show name, level, purpose, and next upgrade cost only.
- Delete the sidecar shell, the duplicate clock row, and duplicate links and tabs.
- Remove Training Grounds (it has no function; the Class Hall owns training).

#### Acceptance Criteria

- Every building's function works from its modal.
- The Base screen meets the flatness budget.
- `npm test` passes.

---

### WOWUI-104 — One Storehouse for Inventory

Status: todo

Depends on: WOWUI-103

#### Objective

Armory, Bank, and Storehouse become one Storehouse whose modal is the inventory: equipment,
reagents, and currencies as an icon grid with names in tooltips.

#### Work

- Merge the three buildings in `data/base/buildings.json` and `presentation.json`; point bank
  and reagent holdings at the Storehouse.
- The icon strip's Inventory button opens the Storehouse modal.
- Delete the Armory and Bank buildings and `inventory.html/js/css`.

#### Acceptance Criteria

- All owned equipment, reagents, and currencies are browsable from the Storehouse modal.
- `npm test` passes.

---

### WOWUI-105 — Profession Buildings: Training and Recipe Bank

Status: todo

Depends on: WOWUI-103

#### Objective

Artisans Guild, Gathering Camp, and Survival Lodge keep their function: train heroes in a
profession and show the faction's recipe bank.

#### Work

- Author a minimal recipe catalog in `data/crafting/recipes.json` (profession, tier, output,
  reagents) to replace the raw `*_tier_N` capability ids.
- Building modal: three training slots (drag a hero, pick a profession) and the recipe bank
  (known recipes by tier; icons with tooltips).
- Remove the Learn/Change Profession form from the profession page (training lives in buildings).

#### Acceptance Criteria

- Training a hero in a profession works from each profession building.
- The recipe bank lists the recipes the building level unlocks.
- A data test checks recipe references.
- `npm test` passes.

---

### WOWUI-106 — Crafting Page

Status: todo

Depends on: WOWUI-104, WOWUI-105

#### Objective

Crafting lives on its own page: pick a hero with a profession, choose a known recipe, and craft
from Storehouse reagents.

#### Work

- Turn `profession.html` into the Crafting page; crafting consumes reagents and adds the output
  to the Storehouse.
- Navigation becomes Base, Crafting, Raids & Sieges.

#### Acceptance Criteria

- Crafting a recipe removes its reagents and adds its output (behavioral test).
- `npm test` passes.

---

### WOWUI-107 — Battle: Icons and Timers

Status: todo

Depends on: WOWUI-099

#### Objective

Battle shows state at a glance: each unit is a portrait with a swing timer, a thin health bar,
and ability icons with cooldown sweeps.

#### Work

- Names, numbers, resources, and effects move into tooltips; the combat log sits behind one
  toggle.
- Delete the ACTION box, bar labels and numbers, level and class badges, empty buff boxes, the
  seed text, and per-team numeric totals.
- Use real NPC icons instead of the crossed-swords placeholder.

#### Acceptance Criteria

- Battle meets the flatness budget with no visible numbers except timers.
- 1-, 3-, 5-, 10-, and 20-hero battles still complete and record results.
- `npm test` passes.

---

### WOWUI-108 — Hero Modal

Status: todo

Depends on: WOWUI-100, WOWUI-104

#### Objective

Clicking a hero in the roster sidecar opens one flat hero modal: portrait (stats in its tooltip),
ability loadout, seven gear slots (clicking a slot opens a picker from the Storehouse), and a
compact talent tree.

#### Work

- Move raid and siege loadout editors to Raids & Sieges; party loadouts live in the Embark bar.
- Once nothing remains on it, delete `heroes.html`; delete the developer pages `gear.html`,
  `talent-calculator.html`, and `dev.html` (supersedes WOWUI-097). Link the race selector from
  the Recruitment Hall.

#### Acceptance Criteria

- Abilities, gear, and talents can be changed from the modal.
- Raid and siege loadouts are built and launched on Raids & Sieges.
- `npm test` passes.

---

### WOWUI-109 — Journal Modal

Status: todo

Depends on: WOWUI-103

#### Objective

The Quest Journal opens as a modal from the icon strip and the Quest Board.

#### Work

- Delete `quest-journal.html/js/css`.

#### Acceptance Criteria

- Available, active, and completed quests show in the modal.
- `npm test` passes.

---

### WOWUI-110 — Tooltip Copy Pass

Status: todo

Depends on: WOWUI-103, WOWUI-107, WOWUI-108

#### Objective

Every tooltip is short, human text.

#### Work

- Remove raw ids (`quest_tier_1`, `blacksmithing_tier_1`) and internal rows (Category,
  Attention, Progression tier) from all tooltips.

#### Acceptance Criteria

- No tooltip shows an id, snake_case value, or internal field.
- `npm test` passes.

---

### WOWUI-111 — Phase 6 Sweep

Status: todo

Depends on: WOWUI-098 through WOWUI-110

#### Objective

Nothing superseded remains, and every screen meets the flatness budget.

#### Work

- Rerun the dead JS, CSS, and data scans; delete leftovers.
- Update README.md and AGENTS.md for the final layout.

#### Acceptance Criteria

- Every screen passes the flatness budget.
- `npm test` passes.
