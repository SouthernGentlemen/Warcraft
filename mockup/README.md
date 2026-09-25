# Mockups

Static review screens backed directly by authored runtime JSON under the root-level `/data/` directory. `/docs/` is design documentation only; development does not generate or rewrite runtime data from Markdown.

## Implementation Plan

- [WoW UI Implementation Plan](./IMPLEMENTATION_PLAN.md) — dependency-ordered task backlog for bringing every mockup screen under one shared WoW-style frame, icon, tooltip, control, and interaction system.

## Shared UI Foundation

- `ui/wow-ui.css` — namespaced `--wow-*` design tokens plus reusable `.wow-*` frames, insets, title bars, separators, buttons, icon-button shells, tabs, form controls, checkboxes, scroll treatment, and status bars. Existing screen CSS still owns screen-specific layout until later WOWUI migration tasks.
- `ui/index.html` — static component reference demonstrating the shared primitives and interaction states without a framework or build step.
- Current mockup pages import the shared foundation before their existing stylesheet so later tasks can migrate incrementally without changing prototype mechanics.

The shared typography contract uses `.wow-title` / `.wow-name` for fantasy-serif display text, normal `.wow-ui` / `.wow-ui-text` styling for compact controls and descriptions, and `.wow-tech` only for technical values such as simulation ticks and hashes.

### Shared Icon System

- `ui/wow-icons.js` owns the Wowhead CDN URL/fallback behavior and semantic icon resolution for classes, specializations, races/factions, equipment slots, item families, abilities/talents, professions/buildings, currencies/resources, and battle controls/statuses.
- Use `WowUIIcons.resolve(category, key, context)` for semantic concepts, `WowUIIcons.iconUrl(slug)` only when existing data already supplies a concrete icon slug, and `WowUIIcons.bindFallback(img)` for dynamically-created images.
- `wow-ui.css` is the single color-token source for class and item-quality colors. Shared `.wow-icon-frame` modifiers provide class/quality borders plus selected, locked, disabled, count/rank, and cooldown states.
- Item tier and item quality are separate presentation concepts: use `.wow-tier-label` / `.wow-icon-tier` for tier and `.wow-quality--*` / `.wow-icon-frame--quality-*` for quality.

### Shared Tooltip System

- `ui/wow-tooltips.js` owns tooltip rendering, pointer/focus event binding, cursor/target anchoring, viewport collision/clamping, Escape dismissal, and optional side-by-side comparison.
- Use `WowUITooltips.attach(element, provider, options)` for dynamic game data. The provider returns structured fields such as `title`, `type`, `requirements`, `description`, `stats`, `meta`, `locked`, `icon`, and optional `comparison`.
- Declarative controls can use `data-wow-tooltip` plus the related `data-wow-tooltip-*` attributes and then call `WowUITooltips.hydrate(root)`.
- Shared variants cover controls, classes/races, talents/abilities, items/equipment, units, resources/currencies, and buildings/professions. Game-concept help should use this shared system rather than native `title=` tooltips.
- Item comparison uses one candidate model with a `comparison` model; the controller renders both cards together and keeps the full group inside the viewport.

### Shared Navigation

- `ui/wow-nav.js` enhances the common `.wow-game-shell` / `.wow-game-nav` markup with semantic game icons, shared destination tooltips, and active-screen state while leaving every destination as a normal static HTML `href`.
- Every primary mockup screen exposes the same top-level destinations: Heroes, Talents, Gear, Battle, Base, and Simulation. The shared Warcraft brand/home action returns to `base.html`.
- Use `data-wow-nav-active` on the shell and `data-wow-nav-key` on destination links. Keep the active link's `is-active` class and `aria-current="page"` in static markup so the selected screen is visible before enhancement.
- The shared game bar is sticky and horizontally scrollable at narrow widths. Page-specific actions such as Gear/Battle reset controls live in `.wow-game-shell__action` rather than creating a second website-style navbar.

### Gear Paper Doll

- `gear.html` keeps the six-slot rule but presents equipment as compact icon slots around a character portrait; item names and stat prose live in the shared tooltip rather than permanent slot chrome.
- The central character portrait resolves from race identity, while the class icon is rendered separately with the shared class-color frame.
- The Armory is an icon-grid/bag surface. Each item exposes its name, quality, tier, slot, armor/weapon family, primary and secondary stats, restrictions, equipped state, and equipped-item comparison through `WowUITooltips`.
- Tier, slot, search, and equippable-only filters use the shared WoW form controls. Equip/unequip, stat recalculation, search/filter behavior, and class armor restrictions remain unchanged.


## Screens

- `index.html` — player-facing entry redirect to `base.html`
- `dev.html` — developer-only mockup launcher
- `race-selector.html` — faction, body type, race, class availability, and racial review
- `talent-calculator.html` — class/spec browser and five-point talent calculator
- `gear.html` — interactive roster equipment screen with one hero per class, six fixed slots, class armor eligibility, and sample Tier 1–5 gear
- `simulation/` — deterministic 60 Hz combat lab for 1-person and 3-person battles with full frame reports
- `battle.html` — interactive six-on-six battleground combat mockup with team HP, combat FX, pause, reset, and 1×/2×/4× speed controls
- `base.html` — player-facing map-first stronghold landing screen with compact resources, clickable core/profession buildings, shared building sidecar, Quest Board dispatch, upgrades, and attention states
- `quest-journal.html` — read-only player Quest Journal mirroring available, active, and completed Quest Board assignments from authoritative roster state
- `inventory.html` — global owned-item inventory with compact bag/grid browsing, filters, rarity frames, shared item tooltips, and derived equipped-by state
- `profession.html` — shared Artisans Guild profession workspace; all six professions are available and mirror the Guild level

## Development

From the repository root:

```bash
npm run dev
```

No package installation is required.

Every run performs a local server restart only:

1. tears down the previously recorded Warcraft dev server, if one is still running
2. starts the static server against the repository exactly as it exists on disk
3. uses port 5173 when available, otherwise automatically selects the next available port
4. opens the mockup in the default browser

`npm run dev` does **not** generate, delete, normalize, or rewrite `/data/`. Runtime JSON is ordinary authored source data and changes only when explicitly edited.

You do not need to find or kill ports manually. Running `npm run dev` again replaces the previous Warcraft dev instance.

Once the server is listening, `/mockup/` is opened automatically in your default browser and enters the player-facing Base screen. The active URL is also printed in the terminal, and the root URL redirects to `/mockup/`.

`HOST` and `PORT` can still be supplied when needed, but occupied ports are handled automatically. Set `NO_OPEN=1` only when you intentionally want to suppress automatic browser launch.

## Simulation Smoke Test

Run:

```bash
npm run simulation:test
```

The smoke test runs the 1-person and 3-person scenarios twice with the same seed and fails if either the final state hash or full combat-log hash differs.


## Shared WoW UI architecture

All mockup screens now use the shared UI layer under `mockup/ui/` as the visual and interaction contract. `wow-ui.css` owns tokens, frames, inset surfaces, buttons, tabs, form controls, status bars, icon frames, focus states, and tooltip presentation. `wow-icons.js` is the single semantic icon resolver and fallback path. `wow-tooltips.js` is the single tooltip implementation and supports both pointer hover and keyboard focus. `wow-nav.js` hydrates the persistent game navigation and its shared icon language.

Screen CSS files remain responsible only for screen-specific layout and presentation. Interactive game concepts should use semantic icon frames plus visible text or an accessible label; emoji and Unicode symbols must not be used as game-icon substitutes. Locked, disabled, quality, error, and completion states must include text or accessibility metadata rather than relying on color alone. Custom focusable surfaces use the shared `:focus-visible` contract.

Responsive layouts are maintained in each screen stylesheet for desktop, tablet, and mobile widths. When adding controls, prefer `.wow-button`, `.wow-tab`, `.wow-input`, `.wow-select`, `.wow-checkbox`, `.wow-range`, and `.wow-icon-button` instead of browser-default controls. Run `npm run simulation:test` after shared UI changes that touch the simulation surface, and use `npm run dev` for the normal restart-and-open development flow.


### Shared roster state

`ui/warcraft-roster.js` owns the prototype hero collection and exactly five saved party loadouts. Hero-management surfaces should store only hero IDs in party templates and read current identity, availability, equipment, and talent-build data from this shared layer. Party templates support only 3, 5, 10, or 20 heroes; ready-state validation requires the exact selected size with no duplicate hero IDs. A saved template may contain a hero who later becomes unavailable, but launch-time validation must re-check current availability.

### Map-first Base architecture

Base is the player-facing landing screen. The default view intentionally contains only the shared Warcraft navigation, a compact Gold/Lumber/Stone HUD, and the full stronghold map. There is no internal navigation rail, permanent building list, Quest Board dashboard, action bar, profile footer, or reserved detail column.

Buildings are the Base interaction model. Every authored building, including Quest Board and the six profession buildings, is represented as a clickable map target whose displayed level comes from `data/base/buildings.json`. Clicking one opens the single shared `#baseSidecar`; selecting another replaces its contents in place, while close, Escape, or empty-map dismissal clears selection. The sidecar overlays the map rather than consuming permanent layout width.

Core and profession sidecars show current/next capabilities, prerequisites, Gold/Lumber/Stone costs, upgrade readiness, blocked reasons, and maximum-level state. Successful upgrades update resources, map labels, attention state, and the open sidecar without navigating away. Quest Board uses the same sidecar for Tier 1–5 dispatch, saved/ad-hoc party selection, active assignments, completion, and reward presentation through authoritative `WarcraftRoster` state.

The closed-sidecar map communicates at most one primary attention state per building. Priority is Quest complete, Quest ready, profession action, upgrade ready, then blocked. Markers are compact, accessible through the building label/tooltips, and recalculate after resource, upgrade, roster, dispatch, and completion changes.

Responsive behavior remains map-first: desktop and tablet use an overlay sidecar, while mobile uses a full-width bottom sheet that leaves part of the map visible. Mobile building positions are reflowed to reduce collisions, controls retain usable tap targets, sidecar content scrolls independently, tooltips clamp to the viewport, and reduced-motion preferences suppress unnecessary transitions.

### Faction-aware Base presentation

Base presentation is driven by the persisted player faction in `WarcraftRoster`. Race Selector writes that faction state, while `data/base/presentation.json` defines Alliance/Horde stronghold identity, crest, Keep art, terrain theme, and desktop/mobile hotspot coordinates. Building IDs, levels, upgrade rules, resources, quests, and sidecar logic remain shared between factions.

### Quest Journal

`quest-journal.html` is a read-only projection of `WarcraftRoster.getState().quests`. It groups current assignments into Available/Accepted, Active, and Completed sections, shows party/reward context with shared icons and tooltips, updates on `warcraft:roster-changed`, and never dispatches/completes/rerolls quests itself. Dungeon and world-map selection remain Quest Board responsibilities.

### Global Inventory

`inventory.html` reads owned prototype items from `WarcraftEquipment.owned()`, which derives from the same shared equipment catalog used by Gear and Hero Management. The Inventory never writes equipment state: equipped status is derived from `WarcraftRoster` item-ID references, and actual equip/unequip actions remain in hero-management workflows. This keeps one item catalog plus one authoritative roster equipment state with no duplicate Inventory copy.

### Base player action dock

Base now overlays a compact three-action player dock on the map with exactly Quest Journal, Roster, and Inventory. The dock uses shared semantic icons/tooltips and ordinary links to the functional destinations created in WOWUI-032/033. It does not consume layout width or reintroduce the old multi-system rail; narrow screens collapse it into a three-item bottom dock.

### Barracks removal

Barracks has been removed from authored Base building data, Alliance/Horde presentation data, map markup, runtime bindings, and shared icon mappings. Its `military_tier_*` progression had no downstream consumers or prerequisites, so no mechanic required migration.

### Command Hall removal

Command Hall has been removed from authored Base building data, Alliance/Horde hotspot layouts, map markup, runtime bindings, and shared icon mappings. Its former `missions_tier_1–5` progression now lives on the matching Keep levels, so Keep owns the surviving headquarters/mission progression responsibility. Quest Board now uses its own dedicated building icon rather than Command Hall art.

### Keep upgrade authority

Keep level is now the single structural upgrade ceiling for every other Base building: a non-Keep building may only advance to a level that the Keep has already reached. This rule lives in the centralized Base `keepUpgradeGate()` calculation instead of repeated per-building prerequisite data. Resource affordability remains a separate gate. The old Requirements block and prerequisite prose styles are removed; blocked upgrade controls remain focusable and explain the Keep/resource gate through the shared tooltip system.

### Compact building menus

Base building sidecars now contain only building identity in the header, one or more functional menu actions, a compact level indicator, and one shared Upgrade control. Upgrade cost, Keep gate, resource shortages, next level, and max-level state live in the Upgrade tooltip instead of permanent prose blocks. Quest Board keeps its dispatch workflow beneath the compact menu. Recruitment/Keep route to Roster, Training routes to Talents, Storehouse routes to Inventory, Quest Board links to Quest Journal, and the single Artisans Guild is now the only Base profession entry point.

### Recruitment Hall

Recruitment Hall now opens a real in-sidecar discovery workflow. Level progression carries authored `roster_capacity` and `discovery_limit` values, so higher Hall levels reveal more faction-valid candidates and support a larger faction roster. Candidates come from `data/base/recruitment.json`; recruiting writes through `WarcraftRoster.recruitHero()`, which rejects duplicates, wrong-faction candidates, and over-capacity writes. Recruited heroes persist in shared roster storage, survive normalization/reload, and appear automatically in the existing Roster workspace.

### Storehouse Inventory link

Storehouse is a direct Base entry point into global Inventory. Its compact sidecar contains exactly one primary building action, `Open Inventory`, plus the shared Upgrade control. It has no Storehouse-only informational workflow or selection-detail panel. Inventory remains read-only on navigation/load, so opening Storehouse → Inventory does not mutate roster or ownership state.

### Artisans Guild Base hotspot

The six standalone profession hotspots have been consolidated into one `Artisans Guild` Base building. Alliance and Horde each position the Guild from shared faction presentation data, and the Guild participates in the normal five-level Keep-gated upgrade system. The original Blacksmith, Alchemy, Enchanting, Tailoring, Leatherworking, and Engineering definitions and their former five-tier progression records are preserved under `data/base/profession-buildings/`; only their standalone Base building entries/routes were removed. WOWUI-042 owns the Guild's profession selection and lock/unlock menu.

### Artisans Guild profession workspace

Artisans Guild now exposes Blacksmith, Alchemist, Enchanter, Tailor, Leatherworker, and Engineer through one compact profession menu. All six professions are always available; there is no per-profession unlock ladder. `WarcraftProfessions` persists the shared Artisans Guild level and selected profession, and every profession reads that same level as its current tier. `profession.html` is the shared profession workspace and renders the preserved profession progression data for the selected profession. Profession-specific material and recipe requirements are intentionally deferred until they are authored later.

### Randomized Quest Board rounds

Quest Board no longer owns one permanent quest per tier. `data/base/quest-offers.json` is an authored offer pool covering 1, 3, 5, 10, and 20 hero assignments, while `WarcraftRoster.questBoard` persists the current round, seed, and selected offer IDs. Base generates a bounded set of offers deterministically from that stored round state, so reloads do not reroll. Advancing the round selects a new offer set without mutating accepted/active/completed quest-log records. Dispatching an offer creates a stable quest-log assignment in `WarcraftRoster.quests`, and Quest Journal remains a read-only projection of that quest history.

### Canonical dungeon catalog

`data/dungeons/catalog.json` is the authored Quest Board dungeon catalog. Each dungeon has a stable ID, canonical display/location metadata, normalized Azeroth/continent map coordinates, faction starter/presentation rules, canonical party-size metadata, and an `npc_pool_id` resolving into `data/npcs/dungeon-pools.json`. The initial catalog contains Ragefire Chasm, The Stockade, Scarlet Monastery, and Zul'Farrak. Ragefire Chasm is marked as the Horde starter and The Stockade as the Alliance starter. NPC pools currently contain identity-only boss seeds; combat stats and encounter composition remain future work.

### Quest Board Azeroth dungeon map

Quest Board now switches between randomized quest offers and a data-driven Azeroth dungeon map. Dungeon hotspots are created from `data/dungeons/catalog.json` coordinates, not hardcoded map markup. The active faction's starter dungeon is selected/emphasized first (Ragefire Chasm for Horde, The Stockade for Alliance), while Scarlet Monastery and Zul'Farrak remain visible at their authored world positions. Selecting a dungeon opens an exact five-hero party picker using saved or ad-hoc roster selection; Launch Battle persists a `pendingEncounter` with dungeon ID, NPC-pool ID, party size, hero IDs, faction, and source before routing to `battle.html`. The current Battle prototype only surfaces that handoff context; NPC encounter execution is owned by WOWUI-046–052.

### Enemy NPC encounter contract

Dungeon enemies now come from `data/npcs/catalog.json`, governed by `data/npcs/schema.json`. NPC records own stable identity, family/type, level/tier, integer combat stats, auto attack, optional abilities, dungeon membership, and pool membership. `data/npcs/dungeon-pools.json` contains only ordered NPC IDs and resolves through the authoritative catalog. `mockup/simulation/engine/npc-factory.js` converts those records into the fixed-tick combat definition shape, and repeated combat with the same actor set/seed is regression-tested for identical final-state and combat-log hashes. For dungeon handoffs, Battle fetches the same catalog/pool data and replaces the opposing prototype team with resolved NPC identities so combat cards and log entries name the actual dungeon NPCs. Full Battle-engine unification remains WOWUI-047.

### Shared Battle encounter framework

Battle now runs through `mockup/battle/encounter-runtime.js`, which accepts explicit party sizes `1, 3, 5, 10, 20`, resolves player participants from `WarcraftRoster` / saved loadout hero IDs, resolves enemies through the NPC catalog + pool contract, and drives one fixed-tick `CombatSimulation` event stream. Pause, reset, completion, deterministic seed replay, and the reward-completion hook are owned by this runtime rather than by separate size-specific loops. The canonical combat engine now lives under `mockup/combat/engine/`; legacy files under `mockup/simulation/engine/` are compatibility re-exports only, and `npm test` runs `mockup/combat/smoke-test.js` instead of a Simulation-screen test. Battle presentation consumes runtime snapshots/events and uses `data-party-size` layout primitives for 1/3/5/10/20 without changing combat rules.

### One-hero Battle mode

One-hero Quest Board offers now launch a real deterministic Battle instead of ending at dispatch. Each authored 1-hero offer resolves one NPC from the active faction's starter dungeon pool, requires exactly one currently available hero, commits that hero to the quest, and persists a `kind: "quest"` pending encounter with quest assignment ID, NPC pool, enemy count, hero ID, faction, and deterministic seed. Battle accepts that exact committed quest hero while still rejecting unrelated unavailable heroes. On completion, `WarcraftRoster.resolvePendingEncounterResult()` writes the result back into quest state: victory completes the quest and releases the hero; defeat releases the hero and returns the same stable assignment to a retryable state. Active one-hero quests expose Resume Battle rather than the legacy manual Complete Quest action.

### Three-hero Battle mode

Three-hero Quest Board offers now use the same deterministic Battle path as one-hero quests. Each authored 3-hero offer carries a faction-starter NPC encounter with an explicit `enemy_count: 3`. The Quest Board supports both valid saved 3-person loadouts and ad-hoc selection of exactly three available heroes; saved loadout identity is preserved in the pending encounter while authoritative hero IDs are still carried explicitly. Duplicate or unavailable heroes are rejected by the shared encounter validator. The same quest assignment/result flow from the one-hero mode applies: committed heroes remain valid for the active Battle, and encounter completion releases all three heroes and writes victory/defeat back to the quest state.

### Five-hero dungeon Battle mode

The Quest Board dungeon map now owns the canonical five-player dungeon launch flow. Each dungeon uses its authored `party.canonical_size: 5` and NPC-pool reference, and the picker supports both valid saved five-person loadouts and ad-hoc selection of exactly five available heroes. Saved loadout identity is preserved in the pending encounter, while authoritative hero IDs remain explicit. `WarcraftRoster.setPendingEncounter()` now rejects duplicate, unknown, unavailable, or saved-party-mismatched dungeon launches before Battle. Dungeon results are persisted separately in a compact `dungeonRuns` history and exposed through `getLatestDungeonRun()`; returning to the Quest Board shows the latest victory/defeat for the selected dungeon. Five-player Battle keeps the shared actor-card presentation and adds a taller scrollable combat log with stable table width so actor/target/action columns remain readable.
