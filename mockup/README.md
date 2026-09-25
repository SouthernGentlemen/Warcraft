# Mockups

Static review screens backed directly by authored runtime JSON under the root-level `/data/` directory. `/docs/` is design documentation only; development does not generate or rewrite runtime data from Markdown.

## Implementation Plan

- [WoW UI Implementation Plan](./IMPLEMENTATION_PLAN.md) — dependency-ordered task backlog for bringing every mockup screen under one shared WoW-style frame, icon, tooltip, control, and interaction system.

## Shared UI Foundation

- `ui/wow-ui.css` — namespaced `--wow-*` design tokens plus reusable `.wow-*` frames, insets, title bars, separators, buttons, icon-button shells, tabs, form controls, checkboxes, scroll treatment, and status bars. Existing screen CSS still owns screen-specific layout until later WOWUI migration tasks.
- `ui/index.html` — static component reference demonstrating the shared primitives and interaction states without a framework or build step.
- Current mockup pages import the shared foundation before their existing stylesheet so later tasks can migrate incrementally without changing prototype mechanics.

The shared typography contract uses `.wow-title` / `.wow-name` for fantasy-serif display text, normal `.wow-ui` / `.wow-ui-text` styling for compact controls and descriptions, and `.wow-tech` only for technical values such as combat ticks and hashes.

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
- Player-facing navigation exposes neither standalone Gear nor standalone Talents. The shared Warcraft brand/home action returns to `base.html`; hero equipment and talent management live in the Heroes/Roster workflow. `gear.html` and `talent-calculator.html` remain developer-inspection surfaces reachable only from `dev.html`, not shared navigation.
- Use `data-wow-nav-active` on the shell and `data-wow-nav-key` on destination links. Keep the active link's `is-active` class and `aria-current="page"` in static markup so the selected screen is visible before enhancement.
- The shared game bar is sticky and horizontally scrollable at narrow widths. Player destinations are kept separate from developer-only inspection pages; page-specific controls such as Battle reset live in `.wow-game-shell__action` rather than creating a second website-style navbar.

### Developer Gear Paper Doll

- `gear.html` is retained only as a developer inspection surface. It uses the seven-slot equipment rule and presents equipment as compact icon slots around a character portrait; player equipment changes belong to the Heroes/Roster workflow.
- The central character portrait resolves from race identity, while the class icon is rendered separately with the shared class-color frame.
- The Armory is an icon-grid/bag surface. Each item exposes its name, quality, tier, slot, armor/weapon family, primary and secondary stats, restrictions, equipped state, and equipped-item comparison through `WowUITooltips`.
- Tier, slot, search, and equippable-only filters use the shared WoW form controls. Equip/unequip, stat recalculation, search/filter behavior, and class armor restrictions remain unchanged.


## Screens

- `index.html` — player-facing entry redirect to `base.html`
- `dev.html` — developer-only mockup launcher
- `race-selector.html` — faction, body type, race, class availability, and racial review
- `talent-calculator.html` — developer-only standalone class/spec inspection surface for the canonical 2 / 2 / 1 model
- `gear.html` — developer-only standalone equipment inspection surface; player gear management lives in Heroes/Roster
- `battle.html` — player-facing deterministic encounter surface for 1-, 3-, 5-, 10-, and 20-hero parties with NPC opponents, combat log, pause/reset, and speed controls
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

## Combat Smoke Test

Run:

```bash
npm run combat:test
```

The smoke test runs deterministic hero-versus-NPC combat scenarios twice with the same seed and fails if either the final state hash or full combat-log hash differs.


## Shared WoW UI architecture

All mockup screens now use the shared UI layer under `mockup/ui/` as the visual and interaction contract. `wow-ui.css` owns tokens, frames, inset surfaces, buttons, tabs, form controls, status bars, icon frames, focus states, and tooltip presentation. `wow-icons.js` is the single semantic icon resolver and fallback path. `wow-tooltips.js` is the single tooltip implementation and supports both pointer hover and keyboard focus. `wow-nav.js` hydrates the persistent game navigation and its shared icon language.

Screen CSS files remain responsible only for screen-specific layout and presentation. Interactive game concepts should use semantic icon frames plus visible text or an accessible label; emoji and Unicode symbols must not be used as game-icon substitutes. Locked, disabled, quality, error, and completion states must include text or accessibility metadata rather than relying on color alone. Custom focusable surfaces use the shared `:focus-visible` contract.

Responsive layouts are maintained in each screen stylesheet for desktop, tablet, and mobile widths. When adding controls, prefer `.wow-button`, `.wow-tab`, `.wow-input`, `.wow-select`, `.wow-checkbox`, `.wow-range`, and `.wow-icon-button` instead of browser-default controls. Run `npm run combat:test` after changes that touch the shared combat runtime, and use `npm run dev` for the normal restart-and-open development flow.


### Player gameplay loop

The player-facing loop is Base → Quest Journal/Roster/Inventory or Quest Board → randomized offer or dungeon map → exact party selection → Battle → deterministic result/reward state → Return to Quest Board or Return to Base. Battle completion persists quest or dungeon results through `WarcraftRoster`; returning to `base.html?building=questboard&mode=offers|dungeons` reopens the Quest Board sidecar in the relevant mode so the completed/retryable quest or latest dungeon run is immediately visible.

Alliance and Horde use the same loop. Faction state chooses the Base presentation and the starter dungeon used by quest encounters: The Stockade for Alliance and Ragefire Chasm for Horde. The shared Battle runtime supports 1-, 3-, 5-, 10-, and 20-hero encounters without size-specific engines.

Runtime gameplay inputs remain authored JSON under `/data/`. Documentation under `/docs/` does not generate or rewrite runtime data.

### Shared roster state

`ui/warcraft-roster.js` owns the prototype hero collection and exactly five saved party loadouts. The Heroes/Roster workspace owns a dedicated roster-level Party Loadouts manager beside the hero list; individual hero detail no longer edits party membership. Party templates store only hero IDs and read current identity and availability from the shared roster. Templates support only 3, 5, 10, or 20 heroes, and ready-state composition validation requires the exact selected size with no duplicate hero IDs. A saved template may contain a hero who later becomes unavailable without losing membership or ready state; Quest Board and dungeon launch-time validation re-check current availability before the party can enter an encounter.

### Talent data contract

Every specialization JSON under `data/heroes/classes/*/specs/` uses one exact compact shape: **2 Tier 1 choices, 2 Tier 2 choices, and 1 capstone**. These records use canonical Classic talent identities and icon/source metadata while leaving prototype tuning separate from the structural contract. The matching Markdown spec is kept byte-for-byte in each JSON file's `source_markdown` field so docs and runtime data cannot describe different trees.

Both the Talent Calculator and canonical combat talent tooling validate this shape. Talent records must have five unique names and complete canonical metadata; malformed 1 / 1 / 1 or oversized trees fail instead of silently rendering a partial set. Combat tooling exposes all five authored records even though a hero selects only one choice from each tier.

Each specialization capstone also owns an authored `ultimate_id`. Class ability data uses `ultimate_model: "specialization-capstone"` and defines one deterministic Ultimate action for each specialization. The capstone name, its `ultimate_id`, and the matching class Ultimate record are validated together in CI so the talent tree cannot point at a missing or unrelated action.

### Hero combat loadout state

Every normalized roster hero now owns an authoritative combat loadout in `WarcraftRoster`: fixed `autoAttackId: "auto"`, `ability1Id`, `ability2Id`, and `ultimateId`. Learned normal and ultimate ability IDs are tracked separately from the equipped slots, and all IDs resolve to the authored class ability pools under `data/heroes/classes/*/abilities/README.json`. Existing saves are migrated during roster normalization without resetting unrelated hero identity, equipment, talents, availability, or party membership.

Auto Attack itself is not selected from the class ability pool; its action identity is derived from the active specialization's authored `identity.auto_attack` field when the combat actor is built. Ability 1 and Ability 2 must be distinct learned abilities compatible with the active specialization. Spec changes deterministically normalize incompatible slots. Ultimate is not independently selectable: roster normalization binds `combatLoadout.ultimateId` to the active specialization capstone's authored `ultimate_id`, and Battle verifies that relationship again before constructing the combat actor.

The hero detail surface presents that state as one compact personal Abilities bar: Auto Attack, Ability 1, Ability 2, and Ultimate. Ability 1 and Ability 2 open an in-place gear-style picker populated only from the selected hero's learned, active-spec-compatible authored cooldown abilities. Picking an action writes through `WarcraftRoster.setCombatLoadout()`; the other equipped normal action is excluded from choices so duplicate normal slots cannot be selected. Clicking the Ultimate opens the same hero-scoped Talents popout focused on the capstone.

Talent management itself stays inside Heroes/Roster. The **Talents** control opens one reusable modal over the selected hero, showing exactly two Tier 1 choices, two Tier 2 choices, and the single specialization capstone. Tier choices persist through `WarcraftRoster.setTalentBuild()`; the capstone is fixed by the active specialization and persists its name plus resolved Ultimate action ID. Changing specialization deterministically swaps the capstone/Ultimate pair. The modal supports close button, backdrop, Escape, and focus restoration without navigating to a separate player-facing talent workflow.

### Map-first Base architecture

Base is the player-facing landing screen. The default view intentionally contains only the shared Warcraft navigation, a compact Gold/Lumber/Stone HUD, and the full stronghold map. There is no internal navigation rail, permanent building list, Quest Board dashboard, action bar, profile footer, or reserved detail column.

Buildings are the Base interaction model. Every authored building, including Quest Board and the consolidated Artisans Guild, is represented as a clickable map target whose displayed level comes from `data/base/buildings.json`. Clicking one opens the single shared `#baseSidecar`; selecting another replaces its contents in place, while close, Escape, or empty-map dismissal clears selection. The sidecar overlays the map rather than consuming permanent layout width.

Building sidecars keep functional actions in the body, while the selected building banner owns the single tooltip-driven **Upgrade** control. The banner shows the building level once; the Upgrade button itself stays compact as `Upgrade` or `Max`. Its tooltip exposes authored resource costs and blocking state without repeating current/required-level comparisons. Keep gating uses the concise `Upgrade Keep first.` message, and maximum level is represented directly by the banner control. Successful upgrades update resources, map labels, attention state, the banner, and open sidecar content without navigating away. Quest Board uses the same sidecar for randomized round offers, saved/ad-hoc party selection, dungeon selection, encounter launch, result state, and rewards through authoritative `WarcraftRoster` state.

The closed-sidecar map communicates at most one primary attention state per building. Priority is Quest complete, Quest ready, profession action, upgrade ready, then blocked. Markers are compact, accessible through the building label/tooltips, and recalculate after resource, upgrade, roster, dispatch, and completion changes.

Responsive behavior remains map-first: desktop and tablet use an overlay sidecar, while mobile uses a full-width bottom sheet that leaves part of the map visible. Mobile building positions are reflowed to reduce collisions, controls retain usable tap targets, sidecar content scrolls independently, tooltips clamp to the viewport, and reduced-motion preferences suppress unnecessary transitions.

### Faction-aware Base presentation

Base presentation is driven by the persisted player faction in `WarcraftRoster`. Race Selector writes that faction state, while `data/base/presentation.json` defines Alliance/Horde stronghold identity, crest, Keep art, terrain theme, and desktop/mobile hotspot coordinates. Building IDs, levels, upgrade rules, resources, quests, and sidecar logic remain shared between factions.

### Quest Journal

`quest-journal.html` is a read-only projection of `WarcraftRoster.getState().quests`. It groups current assignments into Available/Accepted, Active, and Completed sections, shows party/reward context with shared icons and tooltips, updates on `warcraft:roster-changed`, and never dispatches/completes/rerolls quests itself. Dungeon and world-map selection remain Quest Board responsibilities.

### Storage ownership model

Persistent item ownership is split across three Base buildings rather than one generic storage concept:

- **Storehouse** owns profession reagents only. Prototype reagent balances are authored in `data/items/reagents/holdings.json`; every record is categorized as `reagent`, tiered 1–5, and associated with its profession consumers.
- **Bank** owns persistent currencies, economy items, and meta-progression holdings. Prototype balances are authored in `data/items/economy/holdings.json` and restricted to `currency`, `meta_progression`, or `economy`.
- **Armory** owns equipment. It does not duplicate equipment into a new JSON inventory; Base derives Armory ownership from `WarcraftEquipment.owned()`, the same authoritative equipment catalog used by hero management.

Storehouse, Bank, and Armory are all normal five-level core Base buildings and therefore inherit the centralized Keep gate used by every non-Keep upgrade. Alliance and Horde presentation data supplies desktop/mobile hotspots for all three.

Clicking any of the three buildings opens its holdings directly inside the shared Base sidecar. Storehouse renders only authored reagent stacks, Bank renders only currency/economy/meta-progression balances, and Armory renders only equipment from `WarcraftEquipment.owned()`. These browsers reuse shared icons, item rarity frames, quantities, equipped-state context, and tooltips. They are inspection-only: no storage row writes roster state, changes equipment, or mutates the authored holdings. Equip/unequip remains hero-scoped in Heroes/Roster, and none of the three building routes redirects to a separate storage page.

### Global Inventory

`inventory.html` remains a developer/prototype-wide equipment browser backed by `WarcraftEquipment.owned()`. It never writes equipment state: equipped status is derived from `WarcraftRoster` item-ID references, and actual equip/unequip actions remain in hero-management workflows. Player-facing Base ownership is represented by the Armory rather than by treating Storehouse as a generic Inventory link.

### Base player action dock

Base now overlays a compact three-action player dock on the map with exactly Quest Journal, Roster, and Inventory. The dock uses shared semantic icons/tooltips and ordinary links to the functional destinations created in WOWUI-032/033. It does not consume layout width or reintroduce the old multi-system rail; narrow screens collapse it into a three-item bottom dock.

### Barracks removal

Barracks has been removed from authored Base building data, Alliance/Horde presentation data, map markup, runtime bindings, and shared icon mappings. Its `military_tier_*` progression had no downstream consumers or prerequisites, so no mechanic required migration.

### Command Hall removal

Command Hall has been removed from authored Base building data, Alliance/Horde hotspot layouts, map markup, runtime bindings, and shared icon mappings. Its former `missions_tier_1–5` progression now lives on the matching Keep levels, so Keep owns the surviving headquarters/mission progression responsibility. Quest Board now uses its own dedicated building icon rather than Command Hall art.

### Keep upgrade authority

Keep level is now the single structural upgrade ceiling for every other Base building: a non-Keep building may only advance to a level that the Keep has already reached. This rule lives in the centralized Base `keepUpgradeGate()` calculation instead of repeated per-building prerequisite data. Resource affordability remains a separate gate. The old Requirements block and prerequisite prose styles are removed; blocked upgrade controls remain focusable and explain the Keep/resource gate through the shared tooltip system.

### Compact building menus

Base building sidecars now contain only building identity in the header, one or more functional menu actions, a compact level indicator, and one shared Upgrade control. Upgrade cost, Keep gate, resource shortages, next level, and max-level state live in the Upgrade tooltip instead of permanent prose blocks. Quest Board keeps its dispatch workflow beneath the compact menu. Keep routes to Roster, Recruitment opens its in-sidecar discovery flow, Quest Board links to Quest Journal and its dungeon map, Storehouse/Bank/Armory browse their owned categories in place, and the single Artisans Guild owns profession entry. Training has no direct standalone Talent route; hero talents remain in the Heroes/Roster popout.

### Recruitment Hall

Recruitment Hall now opens a real in-sidecar discovery workflow. Level progression carries authored `roster_capacity` and `discovery_limit` values, so higher Hall levels reveal more faction-valid candidates and support a larger faction roster. Candidates come from `data/base/recruitment.json`; recruiting writes through `WarcraftRoster.recruitHero()`, which rejects duplicates, wrong-faction candidates, and over-capacity writes. Recruited heroes persist in shared roster storage, survive normalization/reload, and appear automatically in the existing Roster workspace.

### Artisans Guild Base hotspot

The six standalone profession hotspots have been consolidated into one `Artisans Guild` Base building. Alliance and Horde each position the Guild from shared faction presentation data, and the Guild participates in the normal five-level Keep-gated upgrade system. The original Blacksmith, Alchemy, Enchanting, Tailoring, Leatherworking, and Engineering definitions and their former five-tier progression records are preserved under `data/base/profession-buildings/`; only their standalone Base building entries/routes were removed. The Guild owns the shared profession selection menu; all six professions are available at every Guild level.

### Artisans Guild profession workspace

Artisans Guild now exposes Blacksmith, Alchemist, Enchanter, Tailor, Leatherworker, and Engineer through one compact profession menu. All six professions are always available; there is no per-profession unlock ladder. `WarcraftProfessions` persists the shared Artisans Guild level and selected profession, and every profession reads that same level as its current tier. `profession.html` is the shared profession workspace and renders the preserved profession progression data for the selected profession. Profession-specific material and recipe requirements are intentionally deferred until they are authored later.

### Randomized Quest Board rounds

Quest Board no longer owns one permanent quest per tier. `data/base/quest-offers.json` is an authored offer pool covering 1, 3, 5, 10, and 20 hero assignments, while `WarcraftRoster.questBoard` persists the current round, seed, and selected offer IDs. Base generates a bounded set of offers deterministically from that stored round state, so reloads do not reroll. Completing the current round automatically selects the next deterministic offer set without mutating accepted/active/completed quest-log records. Dispatching an offer creates a stable quest-log assignment in `WarcraftRoster.quests`, and Quest Journal remains a read-only projection of that quest history.

### Canonical dungeon catalog

`data/dungeons/catalog.json` is the authored Quest Board dungeon catalog. Each dungeon has a stable ID, canonical display/location metadata, normalized Azeroth/continent map coordinates, faction starter/presentation rules, canonical party-size metadata, and an `npc_pool_id` resolving into `data/npcs/dungeon-pools.json`. The initial catalog contains Ragefire Chasm, The Stockade, Scarlet Monastery, and Zul'Farrak. Ragefire Chasm is marked as the Horde starter and The Stockade as the Alliance starter. NPC pools resolve authored combat-ready NPC records used directly by the shared Battle runtime.

### Quest Board automatic rounds

Quest Board rounds are gameplay-state transitions rather than manual rerolls. A round owns one persisted deterministic offer set; `WarcraftRoster.setQuestBoardOffers()` may seed an empty round but refuses to replace a populated unresolved set. The round is resolved only when every current offer has a completed assignment. Unaccepted offers, active assignments, and defeated assignments all remain unresolved.

When the current set is fully completed, Base deterministically generates the next round from the same seed + round + Quest Board level inputs and calls the gated `WarcraftRoster.transitionQuestRound()`. There is no Advance Round control or player reroll path. Defeat returns the same assignment to `available` with `lastResult: "defeat"`, so it appears as **RETRY** and prevents rotation until successfully completed. Reloading preserves the current round/offer IDs, while completed quest records remain in Quest Journal history after later rounds replace the live offer set.

### Quest Board Azeroth dungeon map

Quest Board now switches between randomized quest offers and a data-driven Azeroth dungeon map. Dungeon hotspots are created from `data/dungeons/catalog.json` coordinates, not hardcoded map markup. The active faction's starter dungeon is selected/emphasized first (Ragefire Chasm for Horde, The Stockade for Alliance), while Scarlet Monastery and Zul'Farrak remain visible at their authored world positions. Selecting a dungeon opens an exact five-hero party picker using saved or ad-hoc roster selection; Launch Battle persists a `pendingEncounter` with dungeon ID, NPC-pool ID, party size, hero IDs, faction, and source before routing to `battle.html`. Battle consumes that handoff directly, resolves NPC opponents from the authored pool, persists the result, and provides explicit return actions back to the same Quest Board mode or to Base.

### Enemy NPC encounter contract

Dungeon enemies now come from `data/npcs/catalog.json`, governed by `data/npcs/schema.json`. NPC records own stable identity, family/type, level/tier, integer combat stats, auto attack, optional abilities, dungeon membership, and pool membership. `data/npcs/dungeon-pools.json` contains only ordered NPC IDs and resolves through the authoritative catalog. `mockup/combat/engine/npc-factory.js` converts those records into the fixed-tick combat definition shape, and repeated combat with the same actor set/seed is regression-tested for identical final-state and combat-log hashes. Battle uses that same catalog/pool contract so combat cards and log entries name authored dungeon NPCs.

### Battle hero action strips

Every hero Battle card renders the same four authoritative combat actions owned by the roster/runtime contract: **Auto Attack**, **Ability 1**, **Ability 2**, and the specialization-capstone **Ultimate**. The resolved hero definition preserves the roster-selected cooldown ordering and capstone Ultimate ID, and authored class ability records carry the icon slugs used by Battle. Shared ability tooltips expose action identity, target, cost/cooldown details, and current live state.

Readiness is not reimplemented in the Battle presentation. `CombatSimulation.actionState()` owns effective resource cost, cooldown remaining, resource blocking, and Ultimate charge/readiness; `BattleEncounterRuntime.snapshot()` exposes that canonical state alongside each actor. Battle only formats those values as **Ready**, cooldown time, **Resource**, Ultimate percentage, or **Down**. Normal 1/3/5-player cards show icon, slot label, action name, and live state; 10/20-player layouts retain all four slots as a condensed icon/state strip rather than hiding the loadout.

Hero actor construction now requires the roster-selected Ability 1 / Ability 2 IDs and the specialization-capstone Ultimate ID explicitly. The combat factory has no "first two compatible cooldowns" or "first Ultimate" fallback path, so presentation and simulation cannot silently diverge from the authoritative hero loadout.

### Battle Auto Attack swing timer

Every player hero card includes an engine-driven Auto Attack swing timer. `CombatSimulation.actionState().auto` exposes progress against the real Auto Attack threshold, the effective per-tick increment after stat Haste and talent auto-Haste, and remaining ticks. Battle converts only that snapshot state into bar width/text. The bar therefore advances on the same fixed ticks that can fire Auto Attack, resets through the same engine spend path when the swing fires, freezes when the runtime is paused, and returns to zero after encounter reset. The 10- and 20-player card rules retain a condensed version rather than hiding swing timing.

### Battle health rendering

Battle health presentation is normalized through `mockup/battle/health-bars.js`. Individual cards clamp snapshot HP to `0..maxHealth`, force dead actors to visual zero, and derive their fill width from that normalized percentage. Team/raid summaries sum those same normalized actor values, so aggregate health cannot drift from the visible unit cards.

Every runtime pulse processes combat events and then refreshes health from the returned deterministic snapshot. Reset rebuilds cards from the runtime's reset snapshot, restoring full-health fills without retaining stale DOM widths. Both actor and team bars expose progressbar values for current/max HP. The fill CSS keeps explicit `min-width: 0` / `max-width: 100%` bounds and no conflicting right inset, so inline snapshot widths remain visibly resizable in 1-, 3-, 5-, 10-, and 20-hero layouts.

### Shared Battle encounter framework

Battle now runs through `mockup/battle/encounter-runtime.js`, which accepts explicit party sizes `1, 3, 5, 10, 20`, resolves player participants from `WarcraftRoster` / saved loadout hero IDs, resolves enemies through the NPC catalog + pool contract, and drives one fixed-tick `CombatSimulation` event stream. Pause, reset, completion, deterministic seed replay, and the reward-completion hook are owned by this runtime rather than by separate size-specific loops. The canonical combat engine lives exclusively under `mockup/combat/engine/`, and `npm test` runs `mockup/combat/smoke-test.js` alongside integration acceptance. Battle presentation consumes runtime snapshots/events and uses `data-party-size` layout primitives for 1/3/5/10/20 without changing combat rules.

### One-hero Battle mode

One-hero Quest Board offers now launch a real deterministic Battle instead of ending at dispatch. Each authored 1-hero offer resolves one NPC from the active faction's starter dungeon pool, requires exactly one currently available hero, commits that hero to the quest, and persists a `kind: "quest"` pending encounter with quest assignment ID, NPC pool, enemy count, hero ID, faction, and deterministic seed. Battle accepts that exact committed quest hero while still rejecting unrelated unavailable heroes. On completion, `WarcraftRoster.resolvePendingEncounterResult()` writes the result back into quest state: victory completes the quest and releases the hero; defeat releases the hero and returns the same stable assignment to a retryable state. Active one-hero quests expose Resume Battle rather than the legacy manual Complete Quest action.

### Three-hero Battle mode

Three-hero Quest Board offers now use the same deterministic Battle path as one-hero quests. Each authored 3-hero offer carries a faction-starter NPC encounter with an explicit `enemy_count: 3`. The Quest Board supports both valid saved 3-person loadouts and ad-hoc selection of exactly three available heroes; saved loadout identity is preserved in the pending encounter while authoritative hero IDs are still carried explicitly. Duplicate or unavailable heroes are rejected by the shared encounter validator. The same quest assignment/result flow from the one-hero mode applies: committed heroes remain valid for the active Battle, and encounter completion releases all three heroes and writes victory/defeat back to the quest state.

### Five-hero dungeon Battle mode

The Quest Board dungeon map now owns the canonical five-player dungeon launch flow. Each dungeon uses its authored `party.canonical_size: 5` and NPC-pool reference, and the picker supports both valid saved five-person loadouts and ad-hoc selection of exactly five available heroes. Saved loadout identity is preserved in the pending encounter, while authoritative hero IDs remain explicit. `WarcraftRoster.setPendingEncounter()` now rejects duplicate, unknown, unavailable, or saved-party-mismatched dungeon launches before Battle. Dungeon results are persisted separately in a compact `dungeonRuns` history and exposed through `getLatestDungeonRun()`; returning to the Quest Board shows the latest victory/defeat for the selected dungeon. Five-player Battle keeps the shared actor-card presentation and adds a taller scrollable combat log with stable table width so actor/target/action columns remain readable.

### Ten-hero Battle mode

Level-4 ten-hero Quest Board offers now carry authored NPC encounter data with `enemy_count: 10` and launch through the same shared quest Battle flow as the smaller modes. Saved 10-person loadouts and ad-hoc exact hero IDs are both supported by the existing picker/validator. Large enemy groups are expanded deterministically from the selected authored NPC pool: pool order cycles as needed, repeated NPCs receive unique encounter-instance IDs/names, and each instance retains its source NPC ID for catalog provenance. Battle uses a compact five-column participant grid on wide screens, condensed card metadata/action chrome, responsive two/one-column fallbacks, and a taller scrollable full combat log. The combat engine, actor events, quest result integration, and deterministic seed behavior remain shared with every other Battle size.

### Twenty-hero Battle mode

Level-5 twenty-hero Quest Board offers now launch through the same shared deterministic Battle framework with authored `enemy_count: 20`. Saved 20-person loadouts and ad-hoc exact hero selection are both supported; the Quest Board exposes a live selected-count and enlarged scrollable roster picker for large ad-hoc parties. The encounter runtime deterministically expands the selected authored NPC pool to exactly twenty unique encounter actors while preserving each instance's source NPC identity. Battle switches to a condensed raid-style five-column participant grid with small per-actor health tiles, live aggregate team HP and alive/total counts in the HUD, responsive fallbacks, and a full scrollable combat log that continues to identify individual actors. Individual hero IDs/state remain authoritative even though presentation is condensed.
