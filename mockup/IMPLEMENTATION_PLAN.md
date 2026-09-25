# Warcraft Mockup Implementation Plan

WOWUI-001 through WOWUI-054 are complete as of 2026-09-25. WOWUI-055 onward is the active hero-loadout, Base-storage, and Battle-HUD implementation phase.

Completed scope: WOWUI-001 through WOWUI-054.

The active mockup now uses the shared WoW UI foundation, canonical race/class data, compact Classic talent model, seven-slot equipment including Trinket, five-level Base progression, authoritative roster state, five saved party loadouts, Quest Board meta-progression, and the unified Hero Management workspace.

## Validation

Run the management/gameplay integration acceptance suite and deterministic combat smoke tests with:

```bash
npm test
```

Run the full mockup development server with:

```bash
npm run dev
```

New implementation work should continue through the dependency-ordered queue below rather than reopening completed items.

## WOWUI-020 — Roster Popup and Runtime Cleanup

Status: complete (2026-09-24)

- Guard race/class rendering against stale or incomplete race metadata; canonical Night Elf and Tauren entries remain authoritative.
- Keep Heroes as the primary management surface; Gear and Talents are hero-specific popup content opened from the roster, not standalone navigation destinations.
- Hide the Simulation lab from player-facing navigation while retaining the under-the-hood deterministic engine.
- Restore Base runtime/icon hydration by removing invalid escaped newline artifacts from `base.js`.
- Add the combat event log directly to Battle using the simulation log event vocabulary for damage, healing, criticals, and deaths.

## Base Landing Redesign Queue

The Base redesign is intentionally split into dependency-ordered tasks. Each task must leave the mockup in a coherent, testable state before the next begins.

### WOWUI-021 — Base Entry Point and Player-Facing Routing

Status: complete (2026-09-24)

Depends on: WOWUI-020

#### Objective

Make Base the player-facing landing screen without deleting the developer-oriented screen index.

#### Work

- Change `/mockup/` so it opens or redirects to `base.html`.
- Preserve the existing launcher as a developer-only screen, moved or duplicated to a clearly non-player-facing path such as `/mockup/dev.html`.
- Keep direct URLs to Heroes, Battle, Race Selector, and other mockups working.
- Ensure the shared brand/home action returns to Base rather than the developer launcher.
- Do not alter Base layout yet beyond what is required for routing.
- Do not introduce any generated-data or file-writing behavior.

#### Acceptance Criteria

- Visiting `/mockup/` lands on Base.
- The developer screen index remains available at a separate URL.
- Shared player-facing home/brand navigation returns to Base.
- Direct links to other mockup screens still work.
- No gameplay state is reset by navigation.
- `npm test` passes.

---

### WOWUI-022 — Base Shell De-clutter

Status: complete (2026-09-24)

Depends on: WOWUI-021

#### Objective

Remove duplicated navigation and unrelated persistent chrome so the Base screen has a clean structural shell before the map layout is redesigned.

#### Work

- Remove the internal Base/Heroes/Combat/Crafting/Research/Events/Challenges left rail.
- Keep the shared top WoW navigation as the only primary screen navigation.
- Remove the large bottom action bar.
- Remove the persistent full-width profile/status footer.
- Remove generic Base-screen actions that belong elsewhere, including Train Heroes and Start Mission.
- Remove the permanent building list from the right side.
- Remove the permanently visible Quest Board section.
- Keep all existing upgrade and quest logic in JavaScript temporarily if later tasks still depend on it; remove only the persistent presentation at this stage.
- Preserve Base resource state and map building buttons.

#### Acceptance Criteria

- No duplicate internal navigation rail remains.
- No bottom action bar remains.
- No persistent profile/status footer remains.
- No permanent building list remains.
- No permanent Quest Board panel remains.
- The map and resource area still render.
- Existing Base JavaScript initializes without console/runtime errors.
- No upgrade or quest state data is deleted.
- `npm test` passes.

---

### WOWUI-023 — Map-First Base Layout and Compact Resources

Status: complete (2026-09-24)

Depends on: WOWUI-022

#### Objective

Make the stronghold map the dominant landing surface and reduce persistent information to the minimum needed for a quick scan.

#### Work

- Rework the Base layout so the map occupies the majority of the available viewport.
- Keep the map centered and visually dominant on desktop.
- Simplify the persistent resource bar to:
  - Gold
  - Lumber
  - Stone
  - at most one additional progression resource if it is truly required
- Move secondary currencies and explanatory details into shared tooltips or their relevant subsystem.
- Remove unnecessary resource-rate prose from the default view where it creates noise.
- Standardize building labels to:
  - building name
  - level
  - at most one concise status cue
- Preserve all currently visible core and profession buildings.
- Add a clear visual hierarchy between:
  - map terrain/background
  - building interaction points
  - building label
  - actionable state
- Ensure no detail panel occupies width on initial load.

#### Acceptance Criteria

- Initial Base load is primarily the stronghold map.
- Persistent resource chrome is compact.
- All current buildings remain discoverable and clickable.
- Building labels do not contain dense descriptive prose.
- No side detail area is visible or reserved.
- Desktop layout can visually scan the whole base without scrolling through panels.
- Existing shared icons/tooltips continue to render.
- `npm test` passes.

---

### WOWUI-024 — Hidden Building Sidecar Framework

Status: complete (2026-09-24)

Depends on: WOWUI-023

#### Objective

Create the reusable right-side sidecar interaction model before moving any building-specific management into it.

#### Work

- Add a reusable Base sidecar container.
- Sidecar is closed and non-layout-reserving by default.
- Clicking a map building:
  - selects that building
  - visually highlights the selected building
  - opens the sidecar
  - renders a minimal building identity shell
- Sidecar identity shell contains:
  - building icon
  - building name
  - category
  - current level
  - close control
- Clicking another building replaces sidecar content in-place.
- Never stack multiple sidecars or dialogs.
- Escape closes the sidecar.
- Explicit close control closes the sidecar.
- Clicking empty map space closes the sidecar unless the click originated from another interactive Base control.
- Closing clears selected-building visual state.
- Sidecar must overlay or slide beside the map without permanently shrinking the closed-state layout.
- On narrow screens, sidecar may become a bottom sheet or full-height overlay, but must retain the same interaction semantics.
- Manage focus sensibly:
  - opening does not strand keyboard users
  - close control is reachable
  - closing restores focus to the originating building when possible

#### Acceptance Criteria

- No sidecar is visible on page load.
- Every map building can open the sidecar.
- Only one sidecar exists.
- Switching buildings replaces content rather than stacking UI.
- Close button works.
- Escape works.
- Empty-map dismissal works where appropriate.
- Selected building has a clear active state only while sidecar is open.
- Closed sidecar occupies no persistent layout width.
- Keyboard interaction remains usable.
- `npm test` passes.

---

### WOWUI-025 — Building Management in the Sidecar

Status: complete (2026-09-24)

Depends on: WOWUI-024

#### Objective

Move real building progression and upgrade management into the sidecar and eliminate the old right-panel/building-list interaction model completely.

#### Work

- Replace the temporary identity-only sidecar contents with data-driven building detail.
- Core building sidecars show:
  - current level
  - maximum level
  - current capabilities
  - next-level capabilities
  - upgrade requirements
  - upgrade resource costs
  - upgrade action
  - maximum-level state
- Profession building sidecars show:
  - profession identity
  - current level/tier
  - current capabilities
  - next-level capability
  - requirements/cost
  - profession-specific action placeholder only where no real action exists yet
- Reuse `data/base/buildings.json` as the authored source.
- Reuse existing upgrade-state calculation rather than duplicating progression logic.
- Keep insufficient-resource and unmet-requirement feedback inside the sidecar.
- After a successful upgrade:
  - update resources
  - update building level
  - refresh map label/state
  - refresh sidecar contents without closing it
- Ensure every map building's displayed level is driven from current runtime building state rather than hardcoded HTML values.
- Remove obsolete building-list rendering and event handlers once the sidecar owns this functionality.

#### Acceptance Criteria

- Every non-Quest-Board building has functional sidecar detail.
- Upgrade costs and requirements match authored building data.
- Successful upgrades update both sidecar and map immediately.
- Blocked upgrades explain why they are blocked.
- Maximum-level buildings cannot upgrade and show an explicit max state.
- Profession buildings use the same sidecar framework.
- No legacy building-list UI or dead list handlers remain.
- `npm test` passes.

---

### WOWUI-026 — Quest Board Sidecar Migration

Status: complete (2026-09-24)

Depends on: WOWUI-025

#### Objective

Treat Quest Board as a first-class map building and move the entire hero-dispatch workflow into its sidecar.

#### Work

- Ensure Quest Board is represented as a clear clickable location on the map.
- Clicking Quest Board opens the shared Base sidecar rather than a special permanent panel.
- Move into the Quest Board sidecar:
  - quest tier list
  - required hero count
  - hero eligibility/availability
  - hero selection
  - dispatch action
  - active quest state
  - completion action
  - reward presentation
- Preserve existing roster integration through `WarcraftRoster`.
- Preserve current quest tier rules and hero-count requirements.
- Preserve hero availability transitions:
  - available
  - on quest
  - returned after completion
- Keep quest errors/status inside the Quest Board sidecar.
- Do not create a second quest-specific modal or panel system.
- Refresh map-level Quest Board state after dispatch/completion.

#### Acceptance Criteria

- Quest Board has no permanent Base panel.
- Clicking Quest Board opens quest management in the shared sidecar.
- Tier 1–5 quest definitions remain available.
- Required party sizes remain correct.
- Dispatch validates hero availability.
- Dispatched heroes become unavailable elsewhere.
- Completion returns heroes to available state.
- Rewards/completion state render without leaving the Base screen.
- Quest Board sidecar can be closed/reopened without losing state.
- `npm test` passes.

---

### WOWUI-027 — Building Attention and Landing-State Signaling

Status: complete (2026-09-24)

Depends on: WOWUI-026

#### Objective

Let the default closed-sidecar Base view communicate actionable state without reintroducing dense dashboards.

#### Work

- Define a single compact attention-state contract for map buildings.
- Support at minimum:
  - upgrade available
  - blocked by requirement/resource
  - quest ready/attention
  - quest complete
  - profession action available
- Give each building at most one primary attention marker at a time.
- Establish deterministic priority when multiple states are true.
- Use shared semantic icons where possible.
- Include accessible labels/text so state is not color-only.
- Keep markers visually subordinate to building identity.
- Add tooltip detail for attention markers rather than permanent explanatory prose.
- Recalculate attention state after:
  - upgrades
  - resource changes
  - quest dispatch
  - quest completion
- Avoid notification badges for passive/non-actionable information.

#### Acceptance Criteria

- Actionable buildings are identifiable from the closed-sidecar map.
- Attention state is understandable without opening every building.
- No building accumulates a stack of noisy badges.
- State changes update immediately after relevant actions.
- Attention cues are keyboard/screen-reader understandable.
- No dense overview panel is added to compensate for removed UI.
- `npm test` passes.

---

### WOWUI-028 — Base Responsive Behavior and Interaction Polish

Status: complete (2026-09-24)

Depends on: WOWUI-027

#### Objective

Make the map-first/sidecar model work cleanly across desktop, tablet, and mobile without restoring permanent panels.

#### Work

- Desktop:
  - map remains dominant
  - sidecar opens from the right
  - closed state uses full map width
- Tablet:
  - preserve useful map scale
  - sidecar may overlay more aggressively
- Mobile:
  - use a full-width sheet/overlay or bottom sheet
  - maintain close/Escape semantics where supported
  - keep building targets large enough to tap
- Ensure map labels do not collide excessively at supported widths.
- Ensure sidecar content scrolls independently when necessary.
- Ensure tooltips do not render offscreen.
- Ensure selected/attention states remain visible at smaller sizes.
- Reduce unnecessary animation if it harms clarity.
- Respect reduced-motion preferences for sidecar transitions.
- Verify no horizontal page overflow.

#### Acceptance Criteria

- Base is usable at desktop, tablet, and mobile widths.
- Closed sidecar never consumes permanent screen width.
- Mobile sidecar does not make the map permanently inaccessible.
- All buildings remain tappable.
- Sidecar close behavior remains consistent.
- No persistent horizontal overflow.
- Focus and tooltip behavior remain usable.
- `npm test` passes.

---

### WOWUI-029 — Base Cleanup, Dead-Code Removal, and Regression Coverage

Status: complete (2026-09-24)

Depends on: WOWUI-028

#### Objective

Finish the redesign by deleting superseded Base code and strengthening automated checks around the new interaction contract.

#### Work

- Remove obsolete CSS for:
  - left Base navigation rail
  - old building list
  - old permanent right panel
  - old action bar
  - old profile footer
  - old permanent Quest Board layout
- Remove obsolete JavaScript renderers/listeners for superseded UI.
- Remove stale HTML nodes and data attributes.
- Keep only one source of truth for selected building state.
- Add integration assertions covering:
  - Base is the landing route
  - no sidecar open by default
  - Base HTML has no removed persistent panels
  - building runtime data remains five-level
  - Quest Board still integrates with roster state
  - malformed escaped-newline corruption is rejected by tests
- Update `mockup/README.md` to describe the map-first Base interaction model.
- Update this implementation plan statuses as tasks are completed.

#### Acceptance Criteria

- No dead Base UI implementation remains.
- No duplicate building-selection system remains.
- No old permanent Quest Board implementation remains.
- Base source is materially simpler than before the redesign.
- Automated tests cover the new structural contract.
- `npm test` passes cleanly.

## Base, Quest, Dungeon, and Battle Gameplay Queue

This queue replaces the current prototype-heavy Base interactions with compact functional menus and builds the player-facing quest/dungeon/battle loop. Tasks are ordered so shared state and navigation exist before individual building and encounter implementations.

### WOWUI-030 — Lumber Resource Icon

Status: complete (2026-09-24)

Depends on: WOWUI-029

#### Objective

Give Lumber a clear dedicated Warcraft-style resource icon everywhere it appears.

#### Work

- Add or verify one semantic Lumber icon mapping in the shared icon resolver.
- Use that mapping in the Base resource HUD, building upgrade tooltips, and any inventory/resource surfaces.
- Remove any generic/fallback icon usage for Lumber.
- Keep the icon semantic and shared rather than screen-specific.

#### Acceptance Criteria

- Lumber never renders with the fallback icon.
- Base and upgrade tooltips use the same Lumber icon.
- Icon hydration has regression coverage.
- `npm test` passes.

---

### WOWUI-031 — Alliance and Horde Base Variants

Status: complete (2026-09-24)

Depends on: WOWUI-030

#### Objective

Make Base presentation faction-aware so Alliance and Horde have distinct stronghold versions without duplicating gameplay logic.

#### Work

- Drive Base faction from authoritative player/roster faction state.
- Create distinct Alliance and Horde map presentation data.
- Keep one shared building/progression system.
- Allow faction-specific map backdrop, stronghold visual treatment, crest, labels, and hotspot positioning where useful.
- Preserve the same functional building IDs across faction variants unless a later task explicitly introduces a faction-specific mechanic.
- Ensure switching or loading faction state selects the correct Base presentation.

#### Acceptance Criteria

- Alliance and Horde render visibly distinct Base versions.
- Both variants expose the same required functional hotspots.
- No building progression logic is duplicated by faction.
- Direct Base load resolves the correct faction variant.
- `npm test` passes.

---

### WOWUI-032 — Quest Journal Player Surface

Status: complete (2026-09-24)

Depends on: WOWUI-031

#### Objective

Create a real player-facing Quest Journal destination for active, available/accepted, and completed quest state.

#### Work

- Add a Quest Journal surface under `mockup/`.
- Read quest state from one shared quest source rather than duplicating Quest Board state.
- Support at minimum:
  - available/accepted quests
  - active/dispatched quests
  - completed quests/rewards
- Use compact WoW-style quest rows and shared tooltips.
- Keep dungeon/world-map selection out of the Journal; that remains a Quest Board function.
- Make the Journal safe to open/close without mutating quest state.

#### Acceptance Criteria

- Quest Journal is a real functional player surface.
- Active/completed state matches Quest Board state.
- No duplicate quest store is introduced.
- Empty states are handled cleanly.
- `npm test` passes.

---

### WOWUI-033 — Global Inventory Player Surface

Status: complete (2026-09-24)

Depends on: WOWUI-031

#### Objective

Create a global Inventory destination separate from hero-specific equipped Gear.

#### Work

- Add an Inventory surface under `mockup/`.
- Back it with the shared equipment/item catalog and authoritative owned-item state.
- Show unequipped and owned items in a compact bag/grid presentation.
- Preserve shared item rarity, icon, tooltip, and comparison conventions.
- Do not turn Inventory into another hero paper-doll screen.
- Keep hero equipping actions routed through the existing roster/hero management flow where appropriate.

#### Acceptance Criteria

- Inventory is a functional player destination.
- Owned items render once from authoritative state.
- Item tooltips use the shared tooltip system.
- Inventory and hero equipment do not maintain conflicting copies of item state.
- `npm test` passes.

---

### WOWUI-034 — Base Left Action Bar

Status: complete (2026-09-24)

Depends on: WOWUI-032, WOWUI-033

#### Objective

Add a compact persistent left-hand action bar to Base for the three high-frequency player destinations.

#### Work

- Add exactly these primary Base actions:
  - Quest Journal
  - Roster
  - Inventory
- Quest Journal opens/navigates to the Quest Journal surface.
- Roster opens/navigates to the unified Heroes/Roster workspace.
- Inventory opens/navigates to the global Inventory surface.
- Use icons plus accessible labels.
- Keep the action bar narrow and visually subordinate to the map.
- Do not reintroduce the old large multi-destination Base navigation rail.
- Preserve map-first responsive behavior; on narrow layouts the action bar may collapse to a compact dock.

#### Acceptance Criteria

- Base has a left action bar with exactly Quest Journal, Roster, and Inventory.
- Every action reaches a functional destination.
- The bar does not contain Base, Battle, Research, Crafting, Simulation, or other old rail entries.
- The map remains the dominant surface.
- `npm test` passes.

---

### WOWUI-035 — Remove Barracks from Base

Status: complete (2026-09-24)

Depends on: WOWUI-034

#### Objective

Remove Barracks as a Base building/hotspot and delete its unused progression/UI data.

#### Work

- Remove Barracks from the Base map.
- Remove Barracks building progression data if no other runtime consumes it.
- Remove Barracks icon bindings, attention state, and sidecar handling.
- Migrate any still-required mechanic to the correct surviving system before deletion.
- Update regression coverage and authored building counts.

#### Acceptance Criteria

- Barracks is not visible or selectable on either faction Base.
- No dead Barracks runtime/CSS/data path remains.
- No surviving gameplay feature depends on Barracks.
- `npm test` passes.

---

### WOWUI-036 — Remove Command Hall from Base

Status: complete (2026-09-24)

Depends on: WOWUI-035

#### Objective

Remove Command Hall as a Base building/hotspot and eliminate its redundant progression role.

#### Work

- Remove Command Hall from the Base map.
- Remove Command Hall progression data if no other runtime consumes it.
- Migrate any progression responsibility that belongs to Keep into the Keep system.
- Remove Command Hall icon/sidecar/attention bindings that become dead.
- Update authored building counts and tests.

#### Acceptance Criteria

- Command Hall is not visible or selectable on either faction Base.
- Keep owns the surviving headquarters progression responsibilities.
- No dead Command Hall runtime/data remains.
- `npm test` passes.

---

### WOWUI-037 — Keep as Base Upgrade Authority

Status: complete (2026-09-24)

Depends on: WOWUI-036

#### Objective

Make Keep level the authoritative progression gate for every other upgradable Base building.

#### Work

- Define explicit Keep-level gates for other building levels.
- A building may never upgrade beyond the level/tier permitted by Keep.
- Keep upgrade state controls when higher building tiers become available.
- Preserve resource costs, but make Keep progression the primary structural prerequisite.
- Replace verbose requirement prose with concise disabled-action tooltips.
- Centralize the gate calculation so individual buildings do not duplicate Keep rules.
- Ensure faction Base variants share the same progression contract.

#### Acceptance Criteria

- Upgrading Keep expands the allowed upgrade ceiling for other buildings.
- Other buildings cannot bypass the Keep gate.
- Disabled upgrade actions explain the Keep requirement in a tooltip.
- No large requirement/capability prose block is necessary to understand the gate.
- `npm test` passes.

---

### WOWUI-038 — Compact Functional Building Menu Contract

Status: complete (2026-09-24)

Depends on: WOWUI-037

#### Objective

Replace the current verbose sidecar content with compact functional building menus.

#### Work

- Remove permanent sidecar sections for:
  - building description prose
  - Current Capability
  - Next Level
  - Requirements
  - Upgrade Cost
  - Ready/Blocked explanatory paragraphs
- Keep only information needed to act.
- Standard building sidecar/menu structure:
  - building identity
  - functional building-specific actions/menu
  - compact level indicator
  - one Upgrade icon/button
- Upgrade action uses a tooltip to show:
  - next level
  - Gold/Lumber/Stone cost
  - Keep gate or other blocking requirement
  - max-level state
- Disabled upgrade button remains visible but compact.
- Building-specific actions must perform real navigation/state changes; placeholders are not acceptable.
- Keep sidecar hidden until a building is clicked.

#### Acceptance Criteria

- Recruitment Hall no longer shows the verbose capability/requirements/cost blocks.
- Quest Board no longer shows the verbose capability/requirements/cost blocks.
- No building sidecar uses explanatory paragraphs where a functional action or tooltip suffices.
- Upgrade remains discoverable and fully explained via tooltip.
- No `Profession actions coming later` placeholder remains.
- `npm test` passes.

---

### WOWUI-039 — Functional Recruitment Hall

Status: complete (2026-09-24)

Depends on: WOWUI-038

#### Objective

Turn Recruitment Hall into a functional hero recruitment/discovery menu rather than a progression-description panel.

#### Work

- Recruitment Hall primary action opens the recruitment/discovery workflow.
- Recruitment Hall level controls recruitment capacity and/or hero discovery limits from authored data.
- Show current actionable recruitment state, not capability prose.
- Route recruited/discovered heroes into authoritative roster state.
- Keep upgrade as the compact tooltip-driven control from WOWUI-038.
- Respect Keep-level upgrade gates.

#### Acceptance Criteria

- Recruitment Hall has a functional primary menu/action.
- Recruitment capacity/discovery changes meaningfully with building level.
- New roster state is authoritative and visible from Roster.
- No descriptive capability list substitutes for functionality.
- `npm test` passes.

---

### WOWUI-040 — Global Inventory Link from Storehouse

Status: complete (2026-09-24)

Depends on: WOWUI-033, WOWUI-038

#### Objective

Make Storehouse a direct Base entry point into global Inventory.

#### Work

- Storehouse primary action is Open Inventory.
- Clicking the Storehouse action opens/navigates to the Inventory surface from WOWUI-033.
- Keep Storehouse upgrade available as the compact tooltip-driven control.
- If Storehouse level later affects capacity, expose that through actual inventory behavior/data rather than prose-only capability text.
- Remove any dead Storehouse selection-detail content.

#### Acceptance Criteria

- Storehouse reaches Inventory in one action.
- Storehouse does not show an informational-only management panel.
- Inventory state is unchanged by simple navigation.
- `npm test` passes.

---

### WOWUI-041 — Artisans Guild Base Hotspot

Status: complete (2026-09-24)

Depends on: WOWUI-038

#### Objective

Replace all individual profession hotspots with one Artisans Guild hotspot.

#### Work

- Add Artisans Guild as a Base building/hotspot.
- Remove Blacksmith, Alchemy Lab, Enchanter, Tailor, Leatherworker, and Engineer as separate map hotspots.
- Keep profession data/mechanics; only the Base entry points are consolidated.
- Artisans Guild is the only Base route into professions.
- Give Artisans Guild its own progression record and Keep-level upgrade gate.
- Provide Alliance/Horde-compatible presentation.

#### Acceptance Criteria

- Base shows one Artisans Guild instead of six profession buildings.
- No profession can be opened from a removed standalone hotspot.
- Profession data is preserved.
- Artisans Guild participates in normal Keep-gated upgrades.
- `npm test` passes.

---

### WOWUI-042 — Functional Artisans Guild Profession Menu

Status: complete (2026-09-24)

Depends on: WOWUI-041

#### Objective

Make Artisans Guild a real profession launcher/menu.

#### Work

- Artisans Guild menu lists:
  - Blacksmith
  - Alchemist
  - Enchanter
  - Tailor
  - Leatherworker
  - Engineer
- All six profession entries are available from Artisans Guild.
- Every profession level/tier mirrors the Artisans Guild level.
- Clicking a profession opens its actual profession surface/workflow.
- Profession-specific material or recipe requirements are deferred until authored later.
- Do not render six nested verbose building-progression panels.
- Remove any remaining profession placeholder actions.

#### Acceptance Criteria

- Every profession is reached through Artisans Guild.
- All six professions are available through the Guild.
- Profession actions are functional.
- Guild level is authoritative and persisted, and each profession mirrors that level.
- `npm test` passes.

---

### WOWUI-043 — Randomized Quest Board Rounds

Status: complete (2026-09-24)

Depends on: WOWUI-038

#### Objective

Replace the static Tier 1–5 Quest Board list with a randomized quest offer list that refreshes by round.

#### Work

- Define a quest-offer pool separate from active/completed quest state.
- Introduce an explicit Quest Board round identifier/state.
- Generate a bounded list of random quest offers for each round.
- Keep generation deterministic from a stored round seed/ID so tests and reloads do not reroll unexpectedly.
- Completing/advancing a round generates the next offer set.
- Quest offers include party-size requirements compatible with supported battle sizes.
- Quest Journal reflects accepted/active/completed quests but does not own offer generation.
- Remove the assumption that one fixed quest exists for each building tier.

#### Acceptance Criteria

- Quest Board shows a list of randomized offers for the current round.
- Reloading does not silently reroll the current round.
- Advancing a round changes the offer set.
- Accepted/active quests remain stable when offers refresh.
- `npm test` passes.

---

### WOWUI-044 — Canonical WoW Dungeon Catalog

Status: complete (2026-09-24)

Depends on: WOWUI-043

#### Objective

Create an authored dungeon catalog based on World of Warcraft dungeon locations for Quest Board dungeon content.

#### Work

- Add a canonical dungeon data source under `data/`.
- Store at minimum:
  - stable dungeon ID
  - display name
  - continent/zone
  - map coordinates suitable for the Azeroth map
  - faction access/presentation rules
  - supported party-size metadata
  - enemy/NPC pool reference
- Seed the catalog with at least:
  - Ragefire Chasm — Horde starter dungeon
  - The Stockade / Stormwind Stockades — Alliance starter dungeon
  - Scarlet Monastery
  - Zul'Farrak
- Use canonical WoW naming/location data when implementing the catalog.
- Structure the catalog so additional WoW dungeons can be added without rewriting Quest Board.

#### Acceptance Criteria

- Ragefire Chasm is the Horde starter dungeon.
- The Stockade is the Alliance starter dungeon.
- Scarlet Monastery and Zul'Farrak are present.
- Dungeon records include usable world-map coordinates and NPC-pool references.
- Dungeon data is authored runtime JSON, not generated from Markdown.
- `npm test` passes.

---

### WOWUI-045 — Quest Board Azeroth Dungeon Map

Status: complete (2026-09-24)

Depends on: WOWUI-044

#### Objective

Add a special Quest Board menu that presents dungeon content spatially on an Azeroth world map.

#### Work

- Add Dungeon Map as a functional Quest Board menu/action.
- Render an Azeroth world map with clickable dungeon hotspots from the dungeon catalog.
- Position dungeons from authored coordinates rather than hardcoded per-screen DOM where practical.
- Apply faction rules:
  - Horde starts with Ragefire Chasm access/presentation.
  - Alliance starts with The Stockade access/presentation.
- Show Scarlet Monastery and Zul'Farrak at their world locations.
- Dungeon hotspot tooltip shows concise dungeon identity and party-size/access information.
- Selecting a dungeon flows into quest/party/battle selection rather than opening a dead informational panel.
- Keep the regular randomized Quest Board offer list available separately.

#### Acceptance Criteria

- Quest Board can switch between quest offers and the dungeon map.
- Dungeon hotspots are placed on the Azeroth map from data.
- Starter dungeon presentation follows faction.
- Dungeon selection reaches a functional encounter flow.
- `npm test` passes.

---

### WOWUI-046 — Enemy NPC Catalog and Encounter Contract

Status: complete (2026-09-24)

Depends on: WOWUI-044

#### Objective

Make battle enemies real NPC entities selected from authored NPC lists rather than mirrored player heroes or anonymous placeholders.

#### Work

- Define an NPC enemy schema under `data/`.
- NPC records support:
  - stable ID
  - name
  - family/type
  - level/tier
  - combat stats
  - auto attack
  - abilities where present
  - dungeon/pool membership
- Create dungeon enemy pool references that Battle can resolve.
- Keep initial content intentionally small; deeper NPC content can be expanded later.
- Enemy selection must pull from NPC pools rather than the hero roster.
- Preserve deterministic combat behavior for a fixed encounter seed.

#### Acceptance Criteria

- Player heroes and enemy NPCs come from different authoritative data sources.
- Dungeon encounters resolve enemies from NPC pool IDs.
- Battle can render NPC identity and combat log entries.
- Fixed seed + fixed party + fixed NPC pool remains deterministic.
- `npm test` passes.

---

### WOWUI-047 — Shared Battle Encounter Framework

Status: complete (2026-09-24)

Depends on: WOWUI-046

#### Objective

Refactor Battle into one encounter framework that supports multiple player party sizes and NPC enemy groups without duplicating combat code.

#### Work

- Make party size an explicit encounter configuration.
- Support the required sizes structurally: 1, 3, 5, 10, 20.
- Resolve player participants from authoritative roster/loadout state.
- Resolve enemies from the NPC encounter contract.
- Use one combat log/event model across all encounter sizes.
- Ensure encounter state, pause/reset, completion, rewards hook, and deterministic tick/update logic do not depend on the removed Simulation screen.
- Add size-aware layout primitives so later size tasks focus on presentation/tuning rather than engine rewrites.

#### Acceptance Criteria

- One Battle runtime accepts a party-size configuration.
- No separate combat engine exists for each size.
- Player and NPC sources are clearly separated.
- Combat log behavior is shared.
- `npm test` passes.

---

### WOWUI-048 — One-Hero Battle Mode

Status: complete (2026-09-24)

Depends on: WOWUI-047

#### Objective

Deliver a functional 1-hero versus NPC battle mode.

#### Work

- Support selecting/launching exactly 1 available hero.
- Resolve an appropriate NPC encounter from the selected quest/dungeon.
- Render readable hero/enemy state and combat log.
- Validate availability and prevent dispatching an unavailable hero.
- Return encounter result to quest/dungeon state.

#### Acceptance Criteria

- Exactly one hero can launch.
- Enemies are NPCs from the selected encounter pool.
- Battle completes deterministically.
- Quest/dungeon result state updates.
- `npm test` passes.

---

### WOWUI-049 — Three-Hero Battle Mode

Status: complete (2026-09-25)

Depends on: WOWUI-048

#### Objective

Deliver a functional 3-hero versus NPC battle mode using the shared encounter framework.

#### Work

- Support exactly 3 heroes from a saved or ad-hoc party.
- Reuse shared availability validation.
- Scale opponent group/configuration through encounter data rather than hardcoded mirrored teams.
- Preserve shared combat log and result flow.

#### Acceptance Criteria

- Exactly three valid heroes can launch.
- Duplicate/unavailable heroes are rejected.
- NPC encounter resolves from data.
- Result returns to quest/dungeon state.
- `npm test` passes.

---

### WOWUI-050 — Five-Hero Battle Mode

Status: complete (2026-09-25)

Depends on: WOWUI-049

#### Objective

Deliver a functional 5-hero dungeon-party battle mode.

#### Work

- Add exact 5-hero party validation.
- Support saved/ad-hoc five-person parties.
- Ensure Battle presentation remains readable at five player units plus NPC opponents.
- Integrate 5-player dungeon quest requirements with Quest Board/dungeon selection.

#### Acceptance Criteria

- Exactly five heroes can launch.
- Five-player dungeon encounters use NPC data.
- Combat log remains readable.
- Quest/dungeon result integration works.
- `npm test` passes.

---

### WOWUI-051 — Ten-Hero Battle Mode

Status: complete (2026-09-25)

Depends on: WOWUI-050

#### Objective

Deliver a functional 10-hero encounter mode.

#### Work

- Add exact 10-hero party validation.
- Support saved/ad-hoc ten-person parties.
- Introduce compact multi-unit Battle presentation appropriate for larger encounters.
- Keep combat state and log on the same shared engine.
- Ensure NPC group sizing comes from encounter data.

#### Acceptance Criteria

- Exactly ten heroes can launch.
- UI remains usable without ten separate oversized cards.
- NPC encounter sizing is data-driven.
- Deterministic encounter completion works.
- `npm test` passes.

---

### WOWUI-052 — Twenty-Hero Battle Mode

Status: complete (2026-09-25)

Depends on: WOWUI-051

#### Objective

Deliver the largest required 20-hero encounter mode.

#### Work

- Add exact 20-hero party validation.
- Support saved/ad-hoc twenty-person parties.
- Use condensed raid-style participant presentation.
- Preserve meaningful aggregate health/status visibility and full combat log.
- Keep individual hero IDs/state authoritative for combat even when presentation is condensed.
- Scale NPC groups through encounter data.

#### Acceptance Criteria

- Exactly twenty heroes can launch.
- The Battle UI remains navigable and readable.
- Full combat events still identify individual actors.
- Encounter resolution remains deterministic.
- `npm test` passes.

---

### WOWUI-053 — Remove Simulation Surface and Simulation-Specific Runtime

Status: complete (2026-09-25)

Depends on: WOWUI-052

#### Objective

Delete the obsolete Simulation product surface after Battle owns every required encounter capability.

#### Work

- Remove `mockup/simulation/` player/developer screen content.
- Remove Simulation from shared navigation, developer launcher, docs, and routing.
- Migrate any still-required deterministic/tick/combat utilities into a neutral Battle/combat runtime location before deletion.
- Delete simulation-only smoke/demo code that has no gameplay consumer.
- Replace `simulation:test` with combat/Battle tests where appropriate.
- Ensure no production mockup code imports from a deleted Simulation path.

#### Acceptance Criteria

- No Simulation destination exists.
- No Simulation-specific runtime directory is required by Battle.
- Deterministic Battle tests still cover the shared combat runtime.
- `npm test` passes.

---

### WOWUI-054 — Gameplay Navigation and Loop Cleanup

Status: complete (2026-09-25)

Depends on: WOWUI-053

#### Objective

Finish the phase by validating the complete player loop and deleting superseded prototype paths.

#### Work

- Validate the primary loop:
  - Base
  - left action bar
  - Quest Journal / Roster / Inventory
  - Quest Board random offers
  - Quest Board dungeon map
  - party selection
  - Battle
  - result/reward
  - return to quest/base state
- Remove dead building IDs, obsolete sidecar prose CSS, Simulation references, and deprecated quest-tier assumptions.
- Update `mockup/README.md` to describe the functional player flow.
- Extend CI coverage across both Alliance and Horde Base variants and all five Battle party sizes.
- Ensure authored JSON remains the runtime source; do not reintroduce Markdown-to-JSON generation.

#### Acceptance Criteria

- The player loop has no dead-end menu or placeholder action.
- Alliance and Horde can both enter the quest/dungeon/battle loop.
- Base has only the intended functional building hotspots.
- All five Battle sizes have automated acceptance coverage.
- No Simulation references remain.
- `npm test` passes cleanly in CI.

## Hero Loadout, Base Storage, and Battle HUD Queue

This phase makes hero combat loadouts explicit, moves party composition to the roster level, repairs the talent model, gives Base storage buildings clear item ownership, and exposes the actual combat timing/action state in Battle.

### WOWUI-055 — Roster-Level Party Loadout Management

Status: complete (2026-09-25)

Depends on: WOWUI-054

#### Objective

Move saved party management out of individual hero detail and make it a roster-level management system.

#### Work

- Preserve the existing hero-specific personal loadout presentation and hero-selection workflow.
- Remove the PARTY LOADOUTS panel from individual hero detail.
- Remove hero-level add/remove-party controls from heroes.js.
- Remove party-membership copy from hero identity where it makes the hero detail read like a party editor.
- Add a dedicated roster-level Party Loadouts area to the Heroes/Roster workspace.
- Manage the existing five saved party records from that roster-level surface.
- Support the existing 3-, 5-, 10-, and 20-hero saved party sizes.
- Continue storing only authoritative hero IDs in saved loadouts.
- Keep availability validation at launch time rather than mutating party membership when a hero becomes temporarily unavailable.

#### Acceptance Criteria

- Selecting a hero never exposes party editing controls.
- The roster has one dedicated saved-party management surface.
- All five saved party records remain editable.
- Party state still uses the existing authoritative WarcraftRoster.loadouts records.
- Quest Board and dungeon party selection continue to consume the same saved parties.
- npm test passes.

---

### WOWUI-056 — Hero Combat Loadout State

Status: complete (2026-09-25)

Depends on: WOWUI-055

#### Objective

Define one authoritative per-hero combat loadout matching the player-facing action bar.

#### Work

- Every hero always has a fixed Auto Attack.
- Define exactly three hero-selected combat action slots:
  - Ability 1
  - Ability 2
  - Ultimate
- Derive Auto Attack identity from the hero's active specialization data.
- Persist hero combat-loadout IDs in WarcraftRoster rather than relying on combat-engine array order.
- Track or derive each hero's learned ability IDs separately from the equipped combat slots.
- Limit selectable Ability 1 / Ability 2 choices to abilities the hero has learned.
- Seed existing heroes deterministically from the current authored class ability pools.
- Keep Auto Attack non-removable and non-empty.
- Update mockup/combat/engine/hero-factory.js to consume the hero's explicit selected ability IDs.
- Stop treating "first two compatible cooldowns" as the long-term authoritative player loadout.
- Preserve migration handling for old saved roster state without duplicating ability state.

#### Acceptance Criteria

- Every normalized hero has Auto Attack, Ability 1, Ability 2, and Ultimate state.
- Auto Attack cannot be removed.
- Ability slots reference authored ability IDs.
- Invalid, duplicate, or unlearned Ability 1 / Ability 2 selections are rejected or normalized deterministically.
- Combat actor creation uses the selected hero loadout.
- Existing saves migrate without resetting unrelated hero state.
- npm test passes.

---

### WOWUI-057 — Hero Ability Loadout Picker

Status: complete (2026-09-25)

Depends on: WOWUI-056

#### Objective

Make the hero's personal loadout bar the primary place to inspect and equip combat abilities.

#### Work

- Keep the current compact hero personal-loadout visual language rather than replacing it with another full panel.
- Show four action positions:
  - Auto Attack
  - Ability 1
  - Ability 2
  - Ultimate
- Replace any direct Talent-page action in the personal loadout with an Abilities interaction.
- Clicking Ability 1 or Ability 2 opens a compact picker/dropdown using the same interaction pattern as the existing hero gear picker.
- The picker lists only the selected hero's currently learned compatible abilities.
- Show ability icon, name, resource/cost, cooldown, target, and effect through the shared tooltip system.
- Mark the currently equipped action in the picker.
- Prevent the same normal ability from occupying both Ability 1 and Ability 2.
- Auto Attack is visible and inspectable but not replaceable.
- Do not navigate away from the Roster screen to change combat abilities.

#### Acceptance Criteria

- Every hero visibly exposes the four-slot combat bar.
- Ability 1 / Ability 2 can be changed in place.
- Picker contents come from the selected hero's learned ability set.
- No ability picker uses hardcoded class-specific HTML.
- No ability change requires opening the standalone Talent screen.
- npm test passes.

---

### WOWUI-058 — Talent Dataset Repair: 2 / 2 / 1

Status: complete (2026-09-25)

Depends on: WOWUI-056

#### Objective

Repair the current talent data so every specialization has the same small prototype structure.

#### Work

- Audit every class specialization JSON under data/heroes/classes/*/specs/.
- Give every specialization exactly:
  - two Tier 1 talents
  - two Tier 2 talents
  - one capstone
- Preserve canonical class/spec identity, icon metadata, and source metadata.
- Keep the talent model intentionally small; do not introduce larger Classic trees yet.
- Update talent normalization and validation so malformed 1/1/1 or other incomplete shapes fail acceptance.
- Update combat talent-hook enumeration so all five authored talent records are discoverable.
- Keep tier terminology local to talents; do not reuse item/building tier assumptions.
- Synchronize the matching docs/data mirrors where the repository requires authored documentation parity.

#### Acceptance Criteria

- Every specialization has an exact 2 / 2 / 1 talent shape.
- No specialization silently drops the second talent in either normal tier.
- Shared talent tooling can enumerate all five entries.
- Missing or duplicate talent identities fail automated validation.
- npm test passes.

---

### WOWUI-059 — Hero Talent Popout and Capstone Ultimate Contract

Status: complete (2026-09-25)

Depends on: WOWUI-057, WOWUI-058

#### Objective

Keep talent management inside hero management and make the selected capstone the hero's Ultimate.

#### Work

- Replace player-facing direct navigation to Talent Calculator with a hero-scoped Talents control.
- Clicking Talents opens one reusable popout/dialog over the Heroes workspace.
- The popout renders the exact 2 / 2 / 1 structure from WOWUI-058.
- Persist selected talent choices through the selected hero's authoritative talent build.
- Make the hero's selected capstone define the Ultimate shown in the personal combat loadout.
- Add or normalize the authored mapping required for each capstone to resolve to a real deterministic combat action.
- The Ultimate slot must not independently select an unrelated generic class ultimate once the capstone contract is active.
- Clicking the Ultimate slot may focus/open the Talents popout on the capstone rather than navigating to another page.
- Preserve keyboard close, Escape, focus restoration, and shared tooltip behavior.

#### Acceptance Criteria

- Talents open as a popout from hero management.
- No player-facing Talents action leaves the Roster screen.
- The popout shows two Tier 1, two Tier 2, and one capstone entry.
- The selected capstone and the hero's Ultimate are the same gameplay choice.
- Combat receives the resolved capstone Ultimate action.
- npm test passes.

---

### WOWUI-060 — Gear and Talent Navigation Cleanup

Status: complete (2026-09-25)

Depends on: WOWUI-059

#### Objective

Remove obsolete player navigation now that gear, abilities, and talents live in their owning contexts.

#### Work

- Remove the Gear tab/link from player-facing shared navigation.
- Remove the Talents top-level/direct player navigation path.
- Keep hero equipment management in the Heroes/Roster workflow.
- Keep talent management in the hero popout.
- Remove or demote standalone gear.html / talent-calculator.html launcher entries if they are no longer required outside developer inspection.
- Remove stale shared-navigation destination definitions and hidden-nav compatibility code once no production surface depends on them.
- Ensure Armory work in later tasks becomes the player-facing owned-gear browser rather than restoring Gear as a top-level tab.

#### Acceptance Criteria

- No player-facing Gear tab exists.
- No player-facing Talents tab navigates to a standalone page.
- Hero gear remains editable from hero management.
- Hero talents remain editable from the hero popout.
- Shared navigation contains no dead Gear/Talents player routes.
- npm test passes.

---

### WOWUI-061 — Storehouse, Bank, and Armory Ownership Model

Status: complete (2026-09-25)

Depends on: WOWUI-060

#### Objective

Split persistent item ownership into clear Base buildings instead of treating Storehouse as a generic Inventory redirect.

#### Work

- Storehouse owns reagent items only.
- Add a Bank core building for:
  - meta-progression items
  - currency/economy balances
  - persistent account/faction progression items
- Add an Armory core building for owned gear/equipment items.
- Reuse the existing item taxonomy under:
  - data/items/reagents/
  - data/items/economy/
  - data/items/equipment/
- Define the minimum authored runtime JSON needed to enumerate reagent and meta/currency holdings without parsing Markdown.
- Keep equipment ownership derived from the authoritative shared equipment/item state.
- Add Bank and Armory to data/base/buildings.json.
- Add Alliance and Horde hotspot positions for both new buildings.
- Give Bank and Armory normal five-level Base progression and Keep-gated upgrades unless a specific later mechanic overrides it.
- Add shared semantic building icons for Bank and Armory.

#### Acceptance Criteria

- Storehouse contains no gear/equipment list.
- Storehouse contains no meta/currency list.
- Bank contains meta-progression/currency/economy items.
- Armory contains owned gear/equipment.
- Both factions expose Storehouse, Bank, and Armory hotspots.
- New buildings use the same authored Base progression system.
- Runtime item data comes from authored JSON.
- npm test passes.

---

### WOWUI-062 — In-Sidecar Storehouse, Bank, and Armory Browsers

Status: complete (2026-09-25)

Depends on: WOWUI-061

#### Objective

Make the three storage buildings functional in place instead of using redirect links.

#### Work

- Remove Storehouse's direct Open Inventory redirect action.
- Clicking Storehouse opens its reagent browser inside the shared Base sidecar.
- Clicking Bank opens meta-progression/currency holdings inside the shared Base sidecar.
- Clicking Armory opens owned gear inside the shared Base sidecar.
- Reuse shared item icons, rarity presentation, quantities, and tooltips.
- Keep the three categories visually and logically separate.
- Do not create separate full-page redirect destinations for these building actions.
- Keep actual hero equip/unequip operations hero-scoped unless explicitly changed later.
- Ensure building content can be closed/reopened without mutating ownership state.

#### Acceptance Criteria

- Storehouse, Bank, and Armory are usable without leaving Base.
- None of the three primary building actions is an href redirect.
- Storehouse renders only reagents.
- Bank renders only meta/currency/economy holdings.
- Armory renders only equipment.
- Browsing these buildings is read-only unless a specific item action is authored.
- npm test passes.

---

### WOWUI-063 — Base Building Banner Upgrade Control

Status: complete (2026-09-25)

Depends on: WOWUI-062

#### Objective

Move upgrades out of the building menu list and into the selected building banner/header.

#### Work

- Remove Upgrade as a normal sidecar menu row for core buildings.
- Put one compact Upgrade control in the selected core building's sidecar banner/header.
- Keep upgrade state tooltip-driven.
- Preserve:
  - next-level costs
  - insufficient-resource blocking
  - Keep gating
  - maximum-level state
- Remove redundant "level required" / "current level" comparison text from upgrade presentation.
- Keep blocked Keep feedback concise, e.g. "Upgrade Keep first", without displaying a required/current-level sentence.
- Do not duplicate the building's level in multiple banner/menu text blocks.
- Keep successful upgrades refreshing map, banner, resources, and open building content in place.

#### Acceptance Criteria

- Core building menus no longer contain an Upgrade row.
- Core building banner/header owns the Upgrade control.
- Upgrade tooltips do not show "required level / current level" prose.
- Upgrade costs and blocking rules remain accurate.
- Max-level state remains visible without extra explanatory panels.
- npm test passes.

---

### WOWUI-064 — Automatic Quest Board Round Progression

Status: complete (2026-09-25)

Depends on: WOWUI-063

#### Objective

Remove manual Quest Board round advancement and make offer rotation a gameplay-state transition.

#### Work

- Remove the Advance Round button from the Quest Board.
- Remove its event handler and manual-reroll UI state.
- Keep deterministic round/seed-based offer generation.
- Advance to the next round automatically when the current offer set has no unresolved assignments remaining.
- Preserve retryable defeated encounters as unresolved so a defeat does not silently reroll the board.
- Generate the next deterministic offer set only after the round transition condition is satisfied.
- Keep Quest Journal history independent from the current offer set.

#### Acceptance Criteria

- Quest Board has no Advance Round control.
- Players cannot manually reroll offers.
- Reloading does not reroll the current unresolved round.
- Completing the current round advances to a new deterministic offer set automatically.
- Defeated retryable quests remain available in the same round.
- npm test passes.

---

### WOWUI-065 — Battle Health Bar Repair

Status: complete (2026-09-25)

Depends on: WOWUI-056

#### Objective

Make Battle health bars accurately reflect deterministic combat state at all times.

#### Work

- Audit normal and condensed/raid Battle card health rendering.
- Bind fill width directly to current HP / max HP snapshots.
- Ensure the bar updates after every damage/heal event and every rendered runtime step.
- Clamp at 0–100%.
- Set dead actors to zero health visually.
- Restore full health correctly on reset/replay.
- Verify aggregate raid HP remains consistent with individual actor HP.
- Remove CSS or DOM assumptions that prevent the fill element from visibly resizing.

#### Acceptance Criteria

- Health bars visibly decrease when damage occurs.
- Healing visibly increases the bar without exceeding 100%.
- Dead units show zero health.
- Reset restores correct full-health bars.
- 1-, 3-, 5-, 10-, and 20-hero layouts all show correct health state.
- Automated tests cover HP-to-width state calculations.
- npm test passes.

---

### WOWUI-066 — Battle Hero Action Strip

Status: complete (2026-09-25)

Depends on: WOWUI-057, WOWUI-059, WOWUI-065

#### Objective

Show each hero's actual combat loadout directly in Battle.

#### Work

- Render the hero's four combat actions:
  - Auto Attack
  - Ability 1
  - Ability 2
  - capstone Ultimate
- Use the authoritative hero loadout selected in Roster.
- Use authored ability icons and shared tooltips.
- Show meaningful live state for normal abilities:
  - ready
  - cooling down
  - resource-blocked where applicable
- Show Ultimate charge/readiness from deterministic combat state.
- Keep the action strip readable in 1/3/5-player layouts.
- Use a condensed action treatment in 10/20-player layouts without hiding the fact that each hero still owns the same four actions.
- Do not duplicate combat rules in presentation code.

#### Acceptance Criteria

- Battle shows Auto Attack, Ability 1, Ability 2, and Ultimate for every hero.
- The displayed abilities match that hero's Roster loadout.
- Ultimate display matches the selected capstone.
- Cooldown/readiness state updates during combat.
- Large-party layouts remain usable.
- npm test passes.

---

### WOWUI-067 — Auto Attack Swing Timer

Status: complete (2026-09-25)

Depends on: WOWUI-066

#### Objective

Expose the deterministic Auto Attack cadence as a real Battle swing timer.

#### Work

- Add an Auto Attack swing-timer bar to hero combat presentation.
- Drive the timer from the combat engine's real Auto Attack progress state rather than a CSS-only animation or wall-clock timer.
- Fill/reset the bar on the same tick progression that fires Auto Attack.
- Reflect Haste/talent modifications to Auto Attack timing.
- Pause the timer when Battle is paused.
- Reset it correctly on encounter reset.
- Preserve usable condensed swing-timer visibility in 10/20-player layouts.

#### Acceptance Criteria

- Swing progress visibly advances between Auto Attacks.
- The bar resets when the Auto Attack fires.
- Pausing Battle freezes swing progress.
- Reset returns the swing timer to the initial state.
- Haste changes alter swing progression consistently with combat output.
- All player heroes expose swing timing, including condensed large-party layouts.
- npm test passes.

---

### WOWUI-068 — Phase Cleanup and Regression Coverage

Status: complete (2026-09-25)

Depends on: WOWUI-064, WOWUI-067

#### Objective

Finish the phase by deleting superseded UI/runtime paths and locking the new contracts into CI.

#### Work

- Remove the old hero-level Party Loadouts panel and handlers.
- Remove stale direct Talent and Gear player links.
- Remove the Storehouse Inventory redirect.
- Remove the Quest Board Advance Round control and styles.
- Remove obsolete sidecar Upgrade-row CSS/handlers after banner migration.
- Remove stale "level required / current level" upgrade copy.
- Remove old ability-selection fallbacks that conflict with authoritative hero combat loadouts.
- Add acceptance coverage for:
  - roster-level saved parties
  - hero Auto Attack + Ability 1 + Ability 2 + Ultimate contract
  - gear-like ability picker behavior
  - exact 2 / 2 / 1 talent data for every specialization
  - capstone-to-Ultimate mapping
  - Storehouse / Bank / Armory item separation
  - in-sidecar building browsing
  - banner-owned upgrades
  - automatic Quest Board rounds
  - Battle health bars
  - Battle action strips
  - deterministic swing timers
- Update mockup/README.md and any affected system docs.
- Correct stale item documentation that still describes the pre-Trinket six-slot equipment model.
- Ensure authored JSON remains the runtime source.
- Run the complete integration and combat suite in CI.

#### Acceptance Criteria

- No superseded hero-party, Gear-tab, Talent-link, Storehouse-redirect, manual-round, or menu-row-upgrade path remains.
- All specialization talent shapes validate as 2 / 2 / 1.
- Storage categories are separated by building.
- Battle exposes correct HP, selected actions, Ultimate, and swing timing.
- Both factions retain a complete Base → Quest/Dungeon → Battle → result loop.
- npm test passes cleanly in CI.

---

## Phase 4 — Formations, Halls, and Embark Progression

This phase turns the current mockup from a collection of functional screens into the intended faction-scoped progression loop.

Core contracts for this phase:

- The player owns exactly one Alliance campaign and one Horde campaign.
- Alliance and Horde have independent:
  - Base/Keep level
  - building levels
  - resources and meta progression
  - roster
  - saved formations/loadouts
  - profession choices and building assignments
  - Quest Board/Embark progression
- Heroes can never cross faction boundaries.
- Keep level is the canonical faction **Base Level** from 1–5.
- Faction roster capacity is:
  - Base 1 → 10 heroes
  - Base 2 → 20 heroes
  - Base 3 → 30 heroes
  - Base 4 → 40 heroes
  - Base 5 → 50 heroes
- Every hero uses a 20-segment XP bar for the next level:
  - Quest victory → +1 XP
  - Incursion victory → +2 XP
  - Dungeon victory → +3 XP
  - Raid/Siege → no hero XP
- Reaching 20 / 20 XP makes a hero eligible to level, but does not level automatically.
- Level-up is completed through the Class Hall and may never raise a hero above the active faction Base Level.
- Five-player parties use a fixed **2 / 2 / 1** formation displayed rear-to-front:
  - rear-left
  - rear-right
  - middle-left
  - middle-right
  - front
- The single front slot is the primary aggro target through the highest authored deterministic RNG target weight; it is not an unconditional forced target.
- Raid formations contain two adjacent five-player formations.
- Siege formations contain four five-player formations.
- Party, Raid, and Siege formation editors use drag-and-drop blank slots rather than checkbox/checklist selection.
- Saved formation editors are collapsed by default and expand only when being edited.
- Raid/Siege groups may inherit a saved Party Loadout as their default and then override individual slots with roster heroes.
- Profession tracks are:
  - **Artisan** — Blacksmith, Alchemist, Enchanter, Tailor, Leatherworker, Engineer
  - **Gathering** — Mining, Skinning, Herbalism
  - **Survival** — Fishing, First Aid, Cooking
- A hero may learn exactly one profession from each track.
- Artisans Guild, Gathering Camp, Survival Lodge, and Class Hall each use three Darkest Dungeon-style hero assignment slots.
- One building assignment lasts one full campaign day.
- Campaign time alternates Day → Night → Day on each successful Embark; one full day is two phase advances.
- Quest/Incursion/Dungeon progression is centered on the Embark surface.
- Raid/Siege launch is a separate top-level player surface.

### WOWUI-069 — Faction-Scoped Campaign State

Status: complete (2026-09-25)

Depends on: WOWUI-068

#### Objective

Split persistent player state into one independent Alliance campaign and one independent Horde campaign before adding new progression systems.

#### Work

- Replace globally shared Base/roster progression state with faction-scoped campaign records.
- Persist one Alliance campaign and one Horde campaign.
- Give each faction its own:
  - Keep/Base level
  - building levels
  - resource balances
  - Bank/meta-progression holdings where mutable
  - roster
  - saved Party/Raid/Siege formation state
  - quest/embark state
  - profession selections
  - building assignments
  - campaign clock
- Keep authored static JSON shared where the data is not player progression.
- Add an explicit active-faction selector/state used by Base, Roster, Embark, Battle launch, and future Raid/Siege surfaces.
- Migrate legacy single-campaign mockup saves into one faction without duplicating heroes into both factions.
- Do not allow one faction's progression mutation to change the other faction's state.

#### Acceptance Criteria

- Alliance and Horde Base levels can differ.
- Alliance and Horde building/resource/meta state can differ.
- Switching faction changes the visible Base/Roster/progression state without rewriting the other faction.
- Legacy data migrates once without duplicating heroes across factions.
- Runtime data remains authored JSON + faction-scoped player state.
- npm test passes.

---

### WOWUI-070 — Faction Roster Isolation and Capacity

Status: complete

Depends on: WOWUI-069

#### Objective

Make roster membership and recruitment strictly faction-owned and scale roster capacity from Base Level.

#### Work

- Enforce faction-specific rosters:
  - Alliance roster may contain Alliance heroes only.
  - Horde roster may contain Horde heroes only.
- Use Keep level as canonical Base Level.
- Set faction roster caps:
  - Level 1 → 10
  - Level 2 → 20
  - Level 3 → 30
  - Level 4 → 40
  - Level 5 → 50
- Update Recruitment Hall validation and UI to use the active faction's cap.
- Prevent Party/Raid/Siege loadouts, building assignments, Quest Board automation, Embark, and Battle handoffs from referencing heroes from the other faction.
- Add migration/validation for stale cross-faction saved IDs.
- Surface current roster count/cap compactly in Roster and Recruitment Hall.

#### Acceptance Criteria

- No Alliance/Horde roster mixing is possible through any player flow.
- Roster caps are exactly 10 / 20 / 30 / 40 / 50 by Base Level.
- Recruitment refuses over-cap and wrong-faction additions.
- Saved loadouts and assignments reject wrong-faction hero IDs.
- npm test passes.

---

### WOWUI-071 — Authored Class Base Stats and Racial Presentation

Status: complete

Depends on: WOWUI-070

#### Objective

Give every hero a visible authored identity baseline before equipment/talent modifiers.

#### Work

- Author base Strength, Agility, Intellect, Stamina, and Spirit for every class at hero levels 1–5.
- Store the class-level stat table in runtime JSON rather than Markdown parsing or UI constants.
- Keep base stats separate from equipment/talent/temporary derived bonuses.
- Ensure combat actor construction consumes the same authored base stat source.
- Surface the hero's racial passive in the Roster detail.
- Surface base stats in Roster with clear distinction between:
  - base value
  - equipment/talent modifiers where available
  - final combat value
- Keep faction-exclusive class rules intact.

#### Acceptance Criteria

- Every class has all five primary/base stats authored at levels 1–5.
- Roster visibly shows the hero's racial passive.
- Roster visibly shows Strength, Agility, Intellect, Stamina, and Spirit.
- Combat and Roster do not maintain separate class-stat tables.
- npm test passes.

---

### WOWUI-072 — Canonical WoW Ability Icon Mapping

Status: complete

Depends on: WOWUI-068

#### Objective

Make every authored hero ability use the matching World of Warcraft ability icon instead of generic or approximate art.

#### Work

- Audit every authored class Auto Attack/normal ability/Ultimate.
- Add canonical icon slug/source metadata to ability JSON where missing or incorrect.
- Resolve icons through the shared icon layer rather than per-screen image URLs.
- Prefer the specific real WoW spell/ability icon for that named action.
- Keep generic fallback art only for genuinely unauthored/unknown actions.
- Add validation that every authored hero combat action has a non-empty canonical icon mapping.
- Ensure Roster, Talent UI, Class Hall, and Battle use the same resolved ability icon.

#### Acceptance Criteria

- Every authored hero combat ability has its matching WoW icon mapping.
- Roster and Battle show the same icon for the same ability ID.
- Known abilities do not silently render generic fallback art.
- Icon source metadata remains authored data.
- npm test passes.

---

### WOWUI-073 — Tabbed Hero Character Workspace

Status: complete

Depends on: WOWUI-071, WOWUI-072

#### Objective

Turn the selected Roster hero into a compact WoW character workspace instead of stacking every management surface together.

#### Work

- Add hero-detail tabs:
  - Abilities
  - Gear
  - Stats
  - Talents
- Keep selected hero identity/portrait/class/faction visible while switching tabs.
- Move the current personal Auto Attack / Ability 1 / Ability 2 / Ultimate controls into Abilities.
- Move full stat/racial presentation into Stats.
- Reserve Gear and Talents for the dedicated implementations below.
- Preserve hero selection when tabs change.
- Support direct navigation to a hero + requested tab so Class Hall can open the Talents view.
- Keep Party/Raid/Siege loadout management roster-level, outside hero tabs.

#### Acceptance Criteria

- Hero detail has exactly Abilities / Gear / Stats / Talents tabs.
- Abilities remain editable from the hero.
- Stats show authored base stats and racial identity.
- Formation/loadout editing does not return to hero detail.
- A hero/tab can be opened directly from Class Hall.
- npm test passes.

---

### WOWUI-074 — WoW Character Gear Tab

Status: complete

Depends on: WOWUI-073

#### Objective

Bring the successful paper-doll Gear mockup back into the Roster hero workflow.

#### Work

- Reuse the prior WoW-style character gear visual identity instead of the current compact-only equipment treatment.
- Render the seven committed slots around the selected hero:
  - Head
  - Chest
  - Pants
  - Feet
  - Gloves
  - Weapon
  - Trinket
- Show equipped item icons directly on the paper doll.
- Add an Armory-style owned-item browser/picker inside the Gear tab.
- Allow equip, replace, and unequip directly from Roster.
- Preserve class armor/weapon eligibility and current stat recalculation.
- Reuse shared rarity frames and item comparison tooltips.
- Do not restore a top-level Gear navigation tab.

#### Acceptance Criteria

- Gear can be fully managed from Roster.
- The Gear tab visually resembles the prior WoW paper-doll mockup.
- All seven slots are visible and functional.
- Invalid equipment cannot be equipped.
- Equipped changes immediately update Stats and Battle actor construction.
- npm test passes.

---

### WOWUI-075 — Classic Talent Tree Visual Restoration

Status: complete

Depends on: WOWUI-073

#### Objective

Restore the stronger old Talent mockup visual identity while keeping the new authoritative talent data contract.

#### Work

- Reuse the previous standalone Talent mockup's WoW tree presentation:
  - large talent icons
  - framed specialization panel
  - visible tier/branch relationships
  - connector/tree treatment
  - selected/available/locked states
- Render the current exact 2 / 2 / 1 specialization model without returning to the visually flat Roster talent treatment.
- Keep the specialization capstone visibly connected to the hero's Ultimate.
- Talent changes remain hero-scoped and write through authoritative roster state.
- The Roster Talents tab becomes the primary player talent surface.
- Class Hall hero interactions open this same Talents tab rather than a separate implementation.
- Keep standalone talent-calculator developer-only if still useful for inspection.

#### Acceptance Criteria

- Roster Talents uses the old tree-style visual identity.
- Every specialization still renders exactly 2 Tier 1 / 2 Tier 2 / 1 capstone.
- The selected capstone still determines Ultimate.
- Class Hall and Roster use one talent editor implementation.
- npm test passes.

---

### WOWUI-076 — Twenty-Point Hero XP and Base-Level Cap

Status: complete

Depends on: WOWUI-069, WOWUI-071

#### Objective

Introduce the Darkest Dungeon-style advancement cadence: heroes earn small XP increments, fill a 20-point bar, then train at Class Hall.

#### Work

- Add per-hero level-progress XP from 0–20.
- Render XP as a clear 20-segment bar.
- Award on successful content completion:
  - Quest: +1
  - Incursion: +2
  - Dungeon: +3
  - Raid: +0
  - Siege: +0
- Clamp XP at 20 while waiting for level-up training.
- Do not auto-level at 20.
- A hero may never level above the active faction Base Level/Keep level.
- Level 5 heroes are permanently level-capped.
- Reset the next-level XP bar appropriately after a successful Class Hall level-up.
- Persist XP independently per faction hero.
- Add reward events to the existing encounter-result pipeline rather than UI-only increments.

#### Acceptance Criteria

- Quest/Incursion/Dungeon rewards are exactly 1 / 2 / 3 XP.
- Raid and Siege grant no hero XP.
- 20 / 20 marks a hero ready to train but does not change level.
- No hero can exceed faction Base Level.
- XP survives reload and encounter-result navigation.
- npm test passes.

---

### WOWUI-077 — Class Hall and Talent Trainers

Status: complete

Depends on: WOWUI-075, WOWUI-076

#### Objective

Add a faction Base Class Hall that owns talent training and hero level-up interactions.

#### Work

- Add Class Hall to authored Base building data and both faction layouts.
- Present class trainers inside the Class Hall using shared class icons.
- Show only classes valid for the active faction while preserving shared-class trainer data.
- Give Class Hall three hero assignment slots through the shared assignment framework from WOWUI-079.
- Assigned heroes must match an available class trainer.
- Clicking an assigned hero opens that hero's Roster Talents tab.
- Handle hero level-up here:
  - hero must be 20 / 20 XP
  - next hero level must be <= faction Base Level
  - hero uses a Class Hall training slot for the authored one-day duration
  - successful completion applies the level increase and resets XP progress
- Keep talent respec/training interactions available from the assigned hero without creating another talent UI.
- Add normal Keep-gated five-level Class Hall building progression unless later authored mechanics override it.

#### Acceptance Criteria

- Class Hall exists for Alliance and Horde.
- Class trainers cover every faction-valid class.
- Class Hall exposes three assignable hero slots.
- Eligible heroes level only through Class Hall.
- Clicking an assigned hero opens the same tree-style Talent editor used by Roster.
- npm test passes.

---

### WOWUI-078 — Gathering and Survival Profession Tracks

Status: planned

Depends on: WOWUI-070

#### Objective

Expand professions into three independent hero profession tracks with Base ownership.

#### Work

- Keep **Artisan** professions in Artisans Guild:
  - Blacksmith
  - Alchemist
  - Enchanter
  - Tailor
  - Leatherworker
  - Engineer
- Add **Gathering Camp** with:
  - Mining
  - Skinning
  - Herbalism
- Add **Survival Lodge** with:
  - Fishing
  - First Aid
  - Cooking
- Allow each hero to learn exactly:
  - one Artisan profession
  - one Gathering profession
  - one Survival profession
- Store the three choices independently on the faction hero.
- Author profession metadata/progression in JSON.
- Add both new buildings to Alliance/Horde Base presentation and shared building icon data.
- Give Artisans Guild, Gathering Camp, and Survival Lodge three assignable hero slots through WOWUI-079.

#### Acceptance Criteria

- A hero may own one profession from each of the three tracks.
- A second profession in the same track replaces/changes only that track according to the authored training rule.
- Gathering Camp contains only Mining/Skinning/Herbalism.
- Survival Lodge contains only Fishing/First Aid/Cooking.
- Profession state cannot cross factions.
- npm test passes.

---

### WOWUI-079 — Shared Darkest Dungeon-Style Building Assignment Slots

Status: planned

Depends on: WOWUI-077, WOWUI-078

#### Objective

Create one reusable drag/drop hero-assignment interaction for training/profession buildings.

#### Work

- Build a shared three-slot assignment component.
- Use it for:
  - Artisans Guild
  - Gathering Camp
  - Survival Lodge
  - Class Hall
- Each slot starts visually empty and accepts a dragged active-faction roster hero.
- Support remove/replace before the assignment begins.
- Persist:
  - building ID
  - slot index
  - hero ID
  - selected trainer/profession/action
  - start phase
  - remaining campaign phases
- A hero may not occupy multiple building assignment slots at the same time.
- Assigned heroes become unavailable for Embark/formation assignment while training.
- One assignment lasts one full campaign day, completed by the clock rules in WOWUI-080.
- Reuse the same slot/drop visual language later for Quest Board automation.

#### Acceptance Criteria

- All four training/profession buildings expose exactly three slots.
- Drag/drop from the current faction roster fills empty slots.
- Heroes cannot be duplicated across concurrent building assignments.
- Assignment state survives reload.
- Completion is driven by campaign time, not wall-clock timers.
- npm test passes.

---

### WOWUI-080 — Faction Day/Night Campaign Clock

Status: planned

Depends on: WOWUI-069, WOWUI-079

#### Objective

Add the deterministic campaign clock that drives one-day training/assignment progress.

#### Work

- Add a faction-scoped campaign phase:
  - Day
  - Night
- Each confirmed successful Embark advances exactly one phase:
  - Day → Night
  - Night → Day
- Define one full campaign day as two phase advances.
- Advance only the active faction's assignment clock.
- Decrement/resolve Class Hall and profession-building assignments from phase advancement.
- Keep the phase deterministic and persisted; do not use real-world time.
- Show the active phase in Base and Embark with compact shared presentation.
- Ensure reload does not advance time.
- Keep Battle pause/speed controls unrelated to campaign time.

#### Acceptance Criteria

- One Embark toggles Day/Night exactly once.
- Two Embarks complete one one-day assignment.
- Alliance and Horde clocks advance independently.
- Reloading does not change phase or assignment duration.
- Assignment completion produces deterministic state changes.
- npm test passes.

---

### WOWUI-081 — Five-Hero Formation Data Contract

Status: planned

Depends on: WOWUI-070

#### Objective

Replace unordered five-player membership lists with authored positional formations.

#### Work

- Define one five-hero formation as rear-to-front **2 / 2 / 1**:
  - rear-left
  - rear-right
  - middle-left
  - middle-right
  - front
- Store slot IDs explicitly rather than relying on array position.
- Allow blank slots while editing; readiness requires all five slots filled.
- Add faction ownership to every saved Party Loadout.
- Add a default-party flag/reference usable by Raid and Siege loadouts.
- Migrate existing five-person saved lists into deterministic formation slots.
- Remove the old generic multi-size saved-party contract for 10/20-player content; Raid and Siege get dedicated loadout types.
- Add authored formation target-weight configuration for combat use.
- Front must have the highest target weight but must not be guaranteed to receive every attack.

#### Acceptance Criteria

- A ready Party Loadout always resolves to exactly five unique faction-valid heroes.
- Formation slots retain identity through save/reload.
- Blank editing slots are valid; incomplete formations cannot launch content.
- Front is explicitly identifiable to combat targeting.
- npm test passes.

---

### WOWUI-082 — Drag-and-Drop Party Loadout Editor

Status: planned

Depends on: WOWUI-081

#### Objective

Replace the current checklist-based Party Loadout manager with compact collapsed drag/drop formation editors.

#### Work

- Remove checkbox/checklist hero selection from Party Loadouts.
- Render all Party Loadouts collapsed by default.
- Use a single-open accordion/dropdown editing pattern.
- Expanded loadout shows five empty/filled formation slots in 2 / 2 / 1 geometry.
- Use the active faction Roster as the drag source.
- Support:
  - drag hero into blank slot
  - drag hero between slots
  - replace occupied slot
  - remove hero back to roster/empty state
- Show hero portrait/class/role compactly inside a filled slot.
- Keep faction-invalid, unavailable, or already-used heroes visibly non-droppable.
- Provide compact rename/default controls without returning to large stacked panels.
- Keep the formation spatially legible on mobile.

#### Acceptance Criteria

- Party Loadouts no longer use checklists.
- All loadouts start collapsed.
- A party is built entirely by dragging roster heroes into formation slots.
- The single front slot is visually obvious.
- Ready state is derived from exactly five unique valid heroes.
- npm test passes.

---

### WOWUI-083 — Raid Loadouts from Party Defaults and Hero Overrides

Status: planned

Depends on: WOWUI-082

#### Objective

Build ten-player Raid Loadouts as two adjacent five-player formations with inheritance from saved Party Loadouts.

#### Work

- Add a collapsed Raid Loadouts section directly below Party Loadouts in the Roster workspace.
- Each Raid Loadout contains two adjacent five-player formation groups.
- Allow a saved Party Loadout to be dragged onto either group as that group's default.
- Resolve each group from:
  - default Party Loadout formation
  - per-slot hero overrides
- Allow individual active-faction roster heroes to be dragged onto any slot to override the inherited hero in that position.
- Preserve overrides independently from the source Party Loadout.
- If the source Party Loadout changes, non-overridden slots update automatically.
- Provide explicit clear-override behavior to return a slot to its inherited default.
- Validate ten unique heroes across both groups.
- Reject cross-faction or duplicate resolved heroes.

#### Acceptance Criteria

- A Raid Loadout displays two adjacent 2 / 2 / 1 groups.
- Either group can inherit a saved Party Loadout.
- Individual slots can override inherited heroes.
- Source-party edits propagate only to non-overridden slots.
- Ready state requires ten unique valid heroes.
- npm test passes.

---

### WOWUI-084 — Siege Loadouts from Four Party Groups

Status: planned

Depends on: WOWUI-083

#### Objective

Build twenty-player Siege Loadouts from four five-player Party groups using the same inheritance/override model as Raids.

#### Work

- Add a collapsed Siege Loadouts section below Raid Loadouts.
- Each Siege Loadout contains four five-player formations.
- Present groups in a compact 2×2 formation-grid layout on desktop with usable responsive fallback.
- Allow each group to inherit a saved Party Loadout.
- Allow per-slot roster hero overrides.
- Preserve source Party references and overrides separately.
- Validate twenty unique active-faction heroes after inheritance + override resolution.
- Keep the resolved formation available to Battle without flattening away slot/group identity.

#### Acceptance Criteria

- Siege Loadout resolves exactly four five-player formations.
- All four groups support Party default + individual override behavior.
- Twenty-player duplicate/faction validation is enforced.
- Large loadouts remain collapsed until explicitly edited.
- npm test passes.

---

### WOWUI-085 — Formation-Aware Deterministic Aggro

Status: planned

Depends on: WOWUI-081, WOWUI-083, WOWUI-084

#### Objective

Make saved formation position matter in deterministic combat targeting.

#### Work

- Carry formation group + slot ID into combat actor definitions.
- Replace purely lowest-index hostile selection for applicable enemy single-target attacks with seeded weighted formation targeting.
- Use authored slot weights from the formation data contract.
- The single front slot in each five-player group receives the highest aggro/target weight.
- Other formation slots remain possible RNG targets.
- Keep all target rolls inside the combat simulation's seeded RNG stream.
- Preserve deterministic replay hashes.
- For Raid/Siege, preserve five-player group identity so each group's front position remains meaningful.
- Do not change explicit encounter mechanics that author a different target rule.

#### Acceptance Criteria

- Front heroes are the primary weighted aggro targets without being guaranteed targets.
- Replaying the same formation + seed produces the same targets.
- Moving heroes between formation slots can change deterministic targeting outcomes.
- Raid and Siege retain per-group front positions.
- Combat logs expose enough formation/target context to debug selection.
- npm test passes.

---

### WOWUI-086 — Tiered Content Progression Contract

Status: planned

Depends on: WOWUI-069, WOWUI-076

#### Objective

Define the intended manual-to-automated content ladder before building the new Embark screens.

#### Work

- Establish authored runtime catalogs/contracts for:
  - Quests
  - Incursions
  - Dungeons
  - Raids
  - Sieges
- Use faction Base Level as unlock tier:
  - Base 1 → manual Quest focus
  - Base 2 → Quest automation unlocks; manual Incursion focus
  - Base 3 → Incursion automation unlocks; manual Dungeon focus
  - Base 4 → Dungeon automation unlocks; Raid access
  - Base 5 → Siege access
- Keep Quests/Incursions/Dungeons available for lower-tier progression after later tiers unlock.
- Keep Raid/Siege hero XP at zero.
- Define party requirements per content type through authored data.
- Keep encounter/Battle handoff deterministic and faction-scoped.
- Do not auto-run Raid/Siege content in this phase unless explicitly authored later.

#### Acceptance Criteria

- Content availability follows Base Level 1–5 exactly.
- XP rewards match WOWUI-076.
- Unlock/automation rules come from authored runtime data.
- Both factions can progress independently through the same content contract.
- npm test passes.

---

### WOWUI-087 — Quest Board Auto-Assignment Slots

Status: planned

Depends on: WOWUI-079, WOWUI-080, WOWUI-086

#### Objective

When automation is unlocked, make Quest Board assignments behave like Darkest Dungeon building assignments rather than button-driven dispatch.

#### Work

- At Base Level 1, keep Quest play manual through Embark and allow only one active manual Quest expedition at a time.
- At Base Level 2+, expose auto-Quest assignment slots/cards on Quest Board.
- Reuse the shared blank-slot drag/drop interaction from building assignments.
- Drag active-faction heroes onto eligible automated Quest assignments.
- Persist hero/content assignment without immediately routing to Battle.
- Assigned heroes become unavailable to other concurrent content/training.
- Resolve automated Quest work from campaign phase/day advancement.
- Award the normal +1 Quest XP on successful automated completion.
- Preserve retry/failure state deterministically.
- At later Base Levels, extend the same assignment architecture to automated Incursions/Dungeons as unlocked by WOWUI-086 rather than inventing a separate checkbox workflow.

#### Acceptance Criteria

- Level-1 Questing remains manual and one-expedition-at-a-time.
- Level-2 Quest automation uses drag/drop hero assignments.
- Automated content consumes campaign-time advancement.
- Auto-assigned heroes cannot simultaneously train or embark elsewhere.
- No checklist-based auto-assignment UI is introduced.
- npm test passes.

---

### WOWUI-088 — Embark Top-Level Gameplay Surface

Status: planned

Depends on: WOWUI-080, WOWUI-082, WOWUI-086, WOWUI-087

#### Objective

Create Embark as the primary manual gameplay loop for Quest/Incursion/Dungeon content.

#### Work

- Add **Embark** as a top-level player navigation destination beside Base / Roster / Battle.
- Make Embark faction-aware.
- Provide a compact quick dropdown/list of currently available:
  - Quests
  - Incursions
  - Dungeons
- Emphasize the current Base-Level focus:
  - Level 1 → Quest
  - Level 2 → Incursion
  - Level 3 → Dungeon
- Keep lower-tier manual content available where authored even after automation unlocks.
- Quest/Incursion launches select the required hero(s) from the active faction.
- Dungeon launches use a ready five-player Party Loadout/formation.
- Confirming a manual Embark:
  - validates roster availability/faction
  - persists the encounter handoff
  - advances the faction Day/Night phase exactly once
  - advances one-day building/auto-content assignments
  - routes into Battle where the content has a combat encounter
- Returning from Battle restores the active faction/Embark context.

#### Acceptance Criteria

- Embark is a real top-level player screen.
- Available Quest/Incursion/Dungeon content is reachable through a quick compact selector.
- Base 1/2/3 focuses Quest/Incursion/Dungeon respectively.
- Every confirmed Embark advances the faction campaign phase once.
- Dungeon launch preserves 2 / 2 / 1 formation identity into Battle.
- npm test passes.

---

### WOWUI-089 — Raids and Sieges Top-Level Surface

Status: planned

Depends on: WOWUI-083, WOWUI-084, WOWUI-085, WOWUI-086

#### Objective

Give 10- and 20-player endgame content its own player destination instead of forcing it through the normal Embark picker.

#### Work

- Add a dedicated top-level **Raids & Sieges** player navigation destination.
- Keep it faction-aware and locked until relevant Base Level:
  - Raid → Base Level 4
  - Siege → Base Level 5
- Raid launch uses a ready Raid Loadout with two resolved five-player formations.
- Siege launch uses a ready Siege Loadout with four resolved five-player formations.
- Show compact formation preview before launch.
- Carry group/slot position into Battle.
- Use authored Raid/Siege encounter data and existing deterministic combat runtime.
- Raid/Siege completion does not grant hero XP.
- Persist result/history independently per faction.
- Keep Battle return navigation back to the correct Raid/Siege context.

#### Acceptance Criteria

- Raid and Siege have a unique top-level player surface.
- Raid cannot launch before Base 4.
- Siege cannot launch before Base 5.
- Launch consumes the correct saved formation type.
- Formation-aware aggro remains active in Battle.
- Raid/Siege grant no hero XP.
- npm test passes.

---

### WOWUI-090 — New Progression Phase Integration, Migration, and Regression Coverage

Status: planned

Depends on: WOWUI-072, WOWUI-074, WOWUI-075, WOWUI-077, WOWUI-078, WOWUI-085, WOWUI-088, WOWUI-089

#### Objective

Finish the phase by removing superseded loadout/progression paths and proving the new faction-scoped gameplay loop end-to-end.

#### Work

- Remove obsolete checklist Party Loadout UI/handlers.
- Remove old generic 3/5/10/20 saved-party editing paths that conflict with:
  - five-player Party formations
  - ten-player Raid formations
  - twenty-player Siege formations
- Migrate compatible existing saved five-player parties into 2 / 2 / 1 slots.
- Remove stale hero leveling paths outside Class Hall.
- Remove stale profession assumptions that only Artisans exist.
- Ensure no faction-global mutable progression remains where faction ownership is required.
- Update:
  - mockup/README.md
  - docs/heroes/
  - docs/base/
  - docs/combat/
  - profession docs
  - content/progression docs
  - authored JSON mirrors
- Add acceptance coverage for:
  - Alliance/Horde campaign isolation
  - 10/20/30/40/50 roster caps
  - racial + level-1–5 class base stats
  - canonical ability icons
  - Abilities/Gear/Stats/Talents hero tabs
  - seven-slot Roster paper doll
  - classic tree-style Talents
  - 20-point XP and Class Hall leveling
  - Artisan/Gathering/Survival profession limits
  - three-slot one-day building assignments
  - faction Day/Night progression
  - drag/drop 2 / 2 / 1 Party formations
  - Raid Party-default inheritance + per-slot overrides
  - four-group Siege formations
  - deterministic formation-weighted aggro
  - Quest Board automation assignments
  - Embark Quest/Incursion/Dungeon loop
  - Base-4 Raid and Base-5 Siege flow
  - no Raid/Siege hero XP
- Run the complete integration/combat suite in CI.

#### Acceptance Criteria

- No checklist loadout editor remains.
- No Alliance/Horde mutable progression leaks across faction state.
- Party/Raid/Siege use positional drag/drop formation contracts.
- Class Hall is the only hero level-up path.
- All three profession tracks and assignment buildings work.
- Embark advances deterministic faction Day/Night time.
- Quest/Incursion/Dungeon/Raid/Siege unlocks match Base Level.
- Battle receives correct formation and faction state.
- Both faction campaigns complete their full independent progression loops.
- npm test passes cleanly in CI.

