# AGENTS.md

Working agreement for any agent (or human) changing this repo. Read this, then
[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the next task. Game rules and the screen
list live in [README.md](./README.md).

## Priorities

1. Keep the mockup playable end to end. `npm test` must stay green.
2. Speed of development over long-term architecture. Keep the current structure; flag
   long-term concerns in the plan instead of building for them.
3. Leave no dead weight. When a change supersedes code, CSS, or data, delete the old version in
   the same task. No compatibility shims, no commented-out code, no "legacy" fallbacks.

## Commands

| Command          | What it does                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| `npm run dev`    | Restart the static dev server (port 5173+) and open `/mockup/`           |
| `npm test`       | Behavioral suite (`scripts/tests/`) plus combat determinism smoke test   |
| `npm run format` | Prettier over `mockup/`, `scripts/`, `dev-server.mjs`, and the root docs |

No build step and no npm dependencies. Node 20.12+.

## Task workflow

One task per branch, one pull request per task, and every task ends with a clean worktree.

1. Start from an up-to-date `main` with a clean worktree (`git pull`, `git status`). Take the first
   task in IMPLEMENTATION_PLAN.md with `Status: todo` whose dependencies are complete, and create a
   branch `wowui-NNN-short-name`.
2. Implement it inside the existing structure, deleting whatever it supersedes.
3. Cover the new behavior with a test in `scripts/tests/`.
4. Run `npm run format`, then `npm test`.
5. Set the task to `Status: complete (YYYY-MM-DD)`. If you changed a rule or pattern, update
   README.md or this file in the same change.
6. Commit as `WOWUI-NNN: Title`, push, and open a pull request against `main`.
7. Merge once CI (`npm test` in GitHub Actions) passes; never merge a red build. Then switch back
   to `main`, pull, and delete the task branch so the worktree is clean.
8. Hand off: end your final message with a ready-to-paste prompt for the next `todo` task, in
   the same form as the prompt you were given.

A bug you find but don't fix goes into the plan as a new task; add a `{ todo: "..." }` test if it
can be reproduced.

## Architecture

### Pages

Each screen is `mockup/<page>.html` + `<page>.js` + `<page>.css`. A page loads
`ui/wow-ui.css`, its own stylesheet, the shared scripts it needs, and then its page script, all as
classic `<script>` tags. Page scripts read shared modules from `window`:

```js
const Roster = window.WarcraftRoster;
```

Shared scripts must load in dependency order (see `base.html`):
`wow-icons` → `wow-tooltips` → `wow-modal` → `warcraft-campaign` → `warcraft-campaign-clock` →
`wow-nav` → `warcraft-roster` → `warcraft-assignment-slots` → `warcraft-class-hall` →
`warcraft-professions` → `warcraft-equipment-rules` → `warcraft-equipment`.
`warcraft-content-progression` → `warcraft-content-assignments` load after the roster, and Base
then adds `warcraft-roster-sidecar` → `warcraft-embark-bar` (assignment slots look the sidecar up
when they mount).

### Shared runtime (`mockup/ui/`)

| Global                                           | Owns                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `WarcraftCampaign`                               | Both faction campaigns and persistence; Base/building levels, resources, clock, `confirmEmbark`               |
| `WarcraftRoster`                                 | Active faction's heroes, XP and levels, party/raid/siege loadouts, Quest Board rounds, pending battle handoff |
| `WarcraftAssignmentSlots`                        | Three-slot, one-day building assignments and the slots that render them                                       |
| `WarcraftClassHall`                              | Class trainers and level-up training                                                                          |
| `WarcraftProfessions`                            | Profession tracks and hero profession choices                                                                 |
| `WarcraftContentProgression`                     | Which content tiers the Base Level unlocks                                                                    |
| `WarcraftContentAssignments`                     | Automated Quest/Incursion/Dungeon assignments (the Quest Board's auto-quest slots)                            |
| `WarcraftEquipmentRules`, `WarcraftEquipment`    | Slots, armor access, the item catalog, `canEquip`                                                             |
| `WarcraftRosterSidecar`                          | The one hero list on Base; drag source for every assignment, `dropTarget` for any slot                        |
| `WarcraftEmbarkBar`                              | Quest / Incursion / Dungeon launcher docked under the Base map                                                |
| `WowUIModal`                                     | The shared `<dialog>`: blocking for focused tasks, floating for drag targets                                  |
| `WarcraftCampaignClock`                          | Clock widget rendering                                                                                        |
| `WowUIIcons`, `WowUITooltips`, `WowUINavigation` | Icon resolution, tooltips, top navigation                                                                     |

Modules announce changes with window events: `warcraft:campaign-changed`,
`warcraft:roster-changed`, `warcraft:assignments-changed`, `warcraft:professions-changed`.
Only export what another script or a test calls.

### State

- Everything persists under one localStorage key, `warcraft.mockup.campaigns.v2`, owned by
  `WarcraftCampaign`. Every record is faction-scoped; heroes never move between factions.
- Normalizers handle only the current shape. If you change the persisted shape incompatibly,
  bump the key (`…v3`) and let saves reset. Do not write migrations.

### Battle handoff

The Embark bar (Quest, Incursion, Dungeon) or Raids & Sieges calls
`Roster.setPendingEncounter({ kind, heroIds, partySize, npcPoolId, seed, source, returnTo, loadoutId?, formation? })`
and navigates to `battle.html?encounter=<kind>`. `battle.js` dynamic-imports
`battle/encounter-runtime.js`, which resolves heroes and the NPC pool and runs the combat
simulation. The result is written back through `Roster.resolvePendingEncounterResult`.

- Five-hero battles need a 2 / 2 / 1 party formation. Raids and sieges use their saved
  loadout's grouped formation (two or four parties).
- Every encounter needs an `npcPoolId` from `data/npcs/dungeon-pools.json`.
- Quest Board rounds come from `Roster.ensureQuestRound(pool, boardLevel)` and
  `Roster.advanceQuestRound(pool, boardLevel)`; any page may call them.

### Combat engine (`mockup/combat/engine/`)

The engine is deterministic: seeded RNG, integer basis-point math (`BP = 10000`), and FNV
state/log hashes. `mockup/combat/smoke-test.js` runs scenarios twice and fails on any hash
difference, so engine changes must keep results identical unless a task intends to change them.
The page runtime stops a battle with no winner at `MAX_SIM_TICKS` (three minutes) and records it
as a defeat.

### Data (`data/`)

- Authored JSON fetched at runtime (`"../data/..."` from pages; the battle modules use
  `"../../data/..."`). Class specs and ability kits are reached through `data_path` and
  `abilities_path` in `data/heroes/classes/index.json`.
- Every field must be read by code. No documentation, notes, or rule prose in data. Put rules
  in README.md and code, and delete fields nothing reads.
- Keep ids consistent across files; `scripts/tests/data.test.mjs` checks the cross-references.
- Data files use 2-space `JSON.stringify` formatting. Prettier does not touch `data/`.

## UI conventions

- **Flatness budget:** at most two framed layers in any screen region. Use one `.wow-panel` for a
  region and plain layout inside it; use cards only for things you drag or click. Secondary
  information goes in tooltips. Measure with this browser-console snippet (budget `maxDepth` ≤ 2):

  ```js
  (() => {
    const boxes = new Set(
      [...document.querySelectorAll("body *")].filter(el => {
        const cs = getComputedStyle(el);
        return (
          el.getClientRects().length &&
          parseFloat(cs.borderTopWidth) > 0 &&
          (cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.backgroundImage !== "none")
        );
      })
    );
    let maxDepth = 0;
    for (const el of boxes) {
      let d = 0;
      for (let p = el; p; p = p.parentElement) if (boxes.has(p)) d++;
      maxDepth = Math.max(maxDepth, d);
    }
    return { boxes: boxes.size, maxDepth };
  })();
  ```

- **One roster:** the roster sidecar is the only hero list. Anything that takes a hero (Embark
  party slots, building slots, Quest Board auto quests) is a `WarcraftRosterSidecar.dropTarget`;
  never render a second hero list, hero dropdown, or checkbox roster.
- **Modals:** `WowUIModal.open({ title, render, modal, onClose })` (`ui/wow-modal.js`) returns the
  body to render into; calling it while a modal is open swaps the content. Use `modal: true` for
  focused tasks. Use `modal: false` for panels that must accept heroes dragged from the roster
  sidecar, because a blocking `<dialog>` makes the rest of the page inert. Base building modals
  all float, so any plot can be opened straight from the map.
- **Buildings:** clicking a plot opens its modal: the building's one function above a footer
  Upgrade button whose tooltip carries the cost. Plot tooltips show only name, level, purpose, and
  next upgrade cost.
- Use the shared primitives in `ui/wow-ui.css` (`.wow-frame`, `.wow-button`, `.wow-tab`,
  `.wow-input`, `.wow-select`, `.wow-icon-frame`, …). Screen stylesheets hold only screen layout.
- Colors, spacing, and type come from `--wow-*` tokens defined in `ui/wow-ui.css`. A test fails if
  a stylesheet uses an undefined variable without a fallback.
- Icons go through `WowUIIcons` (`resolve`, `iconUrl`, `bindFallback`); never use emoji as icons.
  Game-concept help goes through `WowUITooltips` (`attach`, `hydrate`), not `title=`.
- Every page's top nav uses the same links: Base, Heroes, Raids & Sieges. A test enforces this. Mark the current page with `data-wow-nav-active`, and give its link
  `is-active` and `aria-current="page"`.
- When a class name is built at runtime, keep its literal prefix in the string
  (`"wow-quality--" + key`) so dead-CSS searches can find it.

## Testing

- `scripts/tests/harness.mjs` runs page scripts in a VM with a stub DOM, an in-memory
  `localStorage`, and `fetch` served from the repo. Use `createBrowser({ page, storage, search })`,
  `.boot()`, `.runTimers()`, and `.element(id)`. Use `sharedModules()` / `reload(storage)` for
  state-only tests.
- Test behavior through public `window` APIs and page boots. Never assert on source text or
  implementation details. Structural contracts, like assets existing and nav links, are fine.
- A reproducible bug without a fix yet gets a `{ todo: "..." }` test; drop the `todo` when you
  fix it.
- Keep the whole suite under ~10 seconds.

## Don'ts

- No new documentation files. README.md, AGENTS.md, and IMPLEMENTATION_PLAN.md are the only docs.
- No build tooling, bundlers, frameworks, or npm dependencies.
- Don't edit `.warcraft-dev.json`; the dev server writes it.
