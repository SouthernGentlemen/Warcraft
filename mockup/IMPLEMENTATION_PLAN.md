# Warcraft Mockup Implementation Plan

The WOWUI implementation queue has been completed and cleared as of 2026-09-24.

Completed scope: WOWUI-001 through WOWUI-019.

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

New implementation work should be added here as a new scoped task rather than reopening completed WOWUI-001–019 items.

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

Status: planned

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

Status: planned

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

