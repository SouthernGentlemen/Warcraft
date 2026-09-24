# WoW UI Implementation Plan

## Goal

Bring every screen under `/mockup/` into one coherent World of Warcraft-inspired interface language while preserving the existing prototype mechanics, JSON-backed data flow, deterministic combat behavior, and current screen coverage.

The target is not a collection of separately themed mockups. The target is one reusable game UI system where a cropped section of any screen plausibly belongs to the same client.

## Non-Goals

- Do not rebalance combat, items, talents, classes, progression, or resources as part of this UI pass.
- Do not replace the deterministic simulation engine.
- Do not change the root `npm run dev` rebuild / teardown / browser-open workflow.
- Do not remove prototype functionality just to make a screen easier to style.
- Do not introduce a framework or build step solely for the mockup UI.
- Do not copy Blizzard source code or copyrighted UI art directly into the repository. Use original CSS framing and approved prototype icon sources such as the existing Wowhead icon CDN integration.

## Core UI Rules

1. Shared primitives first. Screen-specific CSS should control layout, not invent its own button, frame, tooltip, icon, tab, scrollbar, or form language.
2. Remove generic SaaS/dashboard styling: oversized rounded cards, pill toggles, large empty spacing, web CTA links, and default browser controls.
3. Remove emoji and Unicode stand-ins for game concepts. Game concepts should use proper icon assets.
4. Tooltips are a primary information surface. Permanent screen copy should be reduced where the information belongs on hover/focus.
5. Progression tier, item quality, faction, class, status, and interaction state are separate visual concepts and must not be conflated.
6. Preserve keyboard/focus usability and provide text cues where color alone would otherwise communicate state.
7. All screens must continue to work directly as static HTML under the current dev server.

## Execution Order

| ID | Task | Depends On |
| --- | --- | --- |
| WOWUI-001 | Shared WoW UI foundation **(Complete)** | — |
| WOWUI-002 | Shared icon and visual-token system **(Complete)** | WOWUI-001 |
| WOWUI-003 | Shared tooltip system **(Complete)** | WOWUI-001, WOWUI-002 |
| WOWUI-004 | Launcher and persistent navigation **(Complete)** | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-005 | Gear and equipment redesign **(Complete)** | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-006 | Race selector redesign | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-007 | Talent calculator refinement | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-008 | Battle HUD redesign | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-009 | Base management redesign | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-010 | Simulation lab reskin | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-011 | Cross-screen consistency and accessibility pass | WOWUI-004 through WOWUI-010 |

---

## WOWUI-001 — Shared WoW UI Foundation

**Status:** Complete — 2026-09-24

### Objective

Create the common visual foundation every mockup screen will use before individual screens are redesigned.

### Work

- Add a shared UI layer under `mockup/ui/`.
- Create a shared stylesheet for:
  - color and spacing tokens
  - textured/dark panel surfaces
  - outer frames
  - inset frames
  - title bars
  - separators
  - beveled buttons
  - icon buttons
  - tabs
  - form fields
  - selects
  - checkboxes
  - scroll areas / scrollbar treatment
  - health/resource/status bars
  - disabled, selected, hover, pressed, locked, and keyboard-focus states
- Define shared tokens for:
  - neutral UI surfaces
  - aged gold / highlight states
  - Alliance / Horde presentation
  - health / mana / rage / energy-style resource colors
  - rarity colors
  - class colors
  - error / warning / success states
- Establish one typography hierarchy:
  - fantasy/serif display treatment for frame titles and important names
  - compact readable UI text for controls and descriptions
  - monospace only for genuinely technical simulation data
- Reduce the default border radius across game UI controls and panels.
- Add a small shared component demo / reference section or documented class contract so later tasks do not re-invent primitives.
- Wire the shared stylesheet into every `/mockup/` screen without removing current screen-specific styles yet.
- Keep existing mechanics and JS behavior unchanged.

### Acceptance Criteria

- Every mockup page loads with no console-breaking errors.
- Every mockup page imports the shared UI foundation.
- A shared framed panel, inset panel, button, tab, form field, select, checkbox, icon-button shell, and status bar can be rendered without screen-specific CSS.
- Hover, pressed, selected, disabled, locked, and focus-visible states are visually defined.
- No deterministic simulation behavior changes.
- No game balance/data changes.
- Existing pages remain usable while later visual tasks are pending.

---

## WOWUI-002 — Shared Icon and Visual-Token System

**Status:** Complete — 2026-09-24

### Objective

Make icons, faction colors, class colors, quality colors, and icon states consistent across all screens.

### Work

- Move the duplicated Wowhead icon CDN root/fallback logic out of Talent, Gear, and Battle into a shared helper.
- Provide a shared semantic icon resolver for:
  - classes
  - specs
  - races/factions where applicable
  - equipment slots
  - item families
  - abilities/talents
  - professions/buildings
  - currencies/resources
  - battle controls/statuses
- Create one reusable icon-frame treatment with:
  - normal
  - hover
  - selected
  - locked/grayscale
  - disabled
  - rarity
  - class
  - rank/stack count
  - optional cooldown overlay hook
- Replace approximate rarity colors with canonical WoW-style quality colors.
- Separate item `tier` from item `quality` in presentation.
- Centralize class colors and remove local approximations such as the current Shaman value.
- Define proper Alliance/Horde crest/icon treatment instead of letter badges.
- Remove emoji/Unicode stand-ins as each screen is migrated; the shared system must expose the replacements required by later tasks.

### Acceptance Criteria

- Talent, Gear, and Battle no longer define their own Wowhead CDN root/fallback constants.
- One shared source owns class and rarity colors.
- Shared icon frames render at compact WoW-like sizes and support all required states.
- Missing icon assets fall back cleanly without layout breakage.
- Tier labels and quality colors can be rendered independently.

---

## WOWUI-003 — Shared Tooltip System

**Status:** Complete — 2026-09-24

### Objective

Create one WoW-style tooltip engine used by all interactive game concepts.

### Work

- Add a shared tooltip controller under `mockup/ui/`.
- Support mouse hover and keyboard focus.
- Support cursor anchoring plus viewport collision/clamping.
- Support compact variants for:
  - generic controls
  - classes/races
  - talents/abilities
  - items/equipment
  - units
  - resources/currencies
  - buildings/professions
- Support item comparison with a second side-by-side tooltip.
- Support structured tooltip rows:
  - title
  - type
  - requirements
  - primary description
  - stats
  - secondary metadata
  - red unmet/locked requirements
- Support embedded leading icons where useful.
- Make the tooltip visually dense; remove the current oversized Talent tooltip typography.
- Remove native `title=` tooltips for game concepts as screens migrate to the shared tooltip.

### Acceptance Criteria

- Tooltip content remains inside the viewport.
- Tooltip works with mouse and keyboard focus.
- Item comparison can display equipped and candidate items together.
- Locked requirements are visually distinct and readable.
- Tooltip markup/styles are not duplicated by screen-specific code.
- Talent can migrate off its current standalone tooltip implementation.

---

## WOWUI-004 — Launcher and Persistent Navigation

**Status:** Complete — 2026-09-24

### Objective

Replace the SaaS-style launcher and inconsistent top bars with a shared Warcraft-style navigation shell.

### Work

- Redesign `mockup/index.html` as a framed game menu rather than large rounded cards.
- Use icon-backed navigation entries for:
  - Heroes / Race Selector
  - Talents
  - Gear
  - Battle
  - Base
  - Simulation
- Reduce permanent explanatory copy and move secondary descriptions to tooltips.
- Replace web CTA language such as “Open selector →”.
- Create a compact persistent mockup navigation treatment reusable by all screens.
- Remove the current Base/Gear website-style suite navbar once all destinations have the shared navigation.
- Ensure current active screen is obvious.

### Acceptance Criteria

- No giant rounded launcher cards remain.
- Every destination has a game icon and tooltip.
- All screens expose the same top-level navigation pattern.
- Current screen state is visually obvious.
- Navigation continues to work as direct static HTML links.

---

## WOWUI-005 — Gear and Equipment Redesign

**Status:** Complete — 2026-09-24

### Objective

Turn the current loadout-manager presentation into a compact WoW-style paper doll + armory experience.

### Work

- Preserve the six-slot game rule.
- Replace 96px equipment rows with compact equipment icon slots positioned around the hero presentation.
- Keep item details out of permanent slot chrome; expose them through the shared item tooltip.
- Replace the shared armory list with a compact icon-grid/bag-style presentation.
- Add item tooltip data for:
  - item name
  - quality
  - tier
  - slot
  - armor family / weapon family
  - primary stats
  - secondary stats
  - requirements/restrictions
  - equipped state
- Add side-by-side comparison against the currently equipped item.
- Use exact shared rarity colors.
- Make filters use shared WoW form controls.
- Separate the hero portrait/character identity from the class icon.
- Preserve equip/unequip/filter/search behavior and all current class armor restrictions.

### Acceptance Criteria

- Six equipment slots remain functional.
- Armory is icon-first rather than 88px card-first.
- Every item has a shared WoW tooltip.
- Equipping an item updates the paper doll and stats exactly as before.
- Candidate items can compare against currently equipped items.
- Class/armor eligibility behavior is unchanged.

---

## WOWUI-006 — Race Selector Redesign

**Status:** Complete — 2026-09-24

### Objective

Make hero creation/readout feel like a Warcraft character selection surface.

### Work

- Replace generic rounded panels with shared frames/insets.
- Replace the CSS mannequin presentation with a more intentional character-viewer stage using available prototype art/icon assets and faction atmosphere.
- Replace race list rows with portrait/icon-oriented race controls.
- Replace faction pills with Alliance/Horde crest controls.
- Replace body segmented pills with compact WoW-style controls.
- Render classes as class-icon buttons using shared class colors.
- Keep unavailable classes visible in a locked/desaturated state where the data model supports it.
- Convert the racial talent area into an icon + shared ability tooltip.
- Reduce explanatory text that is redundant with hover/focus information.

### Acceptance Criteria

- Faction, race, body, racial, and available-class behavior remains functional.
- Race and class options are icon-driven.
- Racial ability information uses the shared tooltip.
- No generic pill/segmented-control visual language remains.

---

## WOWUI-007 — Talent Calculator Refinement

**Status:** Complete — 2026-09-24

### Objective

Finish the talent screen so it uses the same shared UI system while retaining the existing tree behavior.

### Work

- Migrate top controls to the shared button/select/range/control treatment.
- Migrate the standalone talent tooltip to the shared tooltip system.
- Tighten node density; reduce oversized 72px icon treatment where practical.
- Add node-shape/state language for active/passive/capstone/choice concepts as supported by the current data.
- Strengthen prerequisite connectors:
  - subdued embossed line when unavailable
  - illuminated line when active
  - clear dependency direction where useful
- Use shared icon frame states.
- Preserve current left-click/right-click learn/unlearn behavior.
- Preserve point totals, spec lock rules, tier requirements, and level gating.
- Remove remaining duplicate class/rarity/icon definitions.

### Acceptance Criteria

- Talent allocation rules are unchanged.
- Tooltips come entirely from the shared tooltip system.
- Nodes, connectors, locked states, and selected states are visually legible without reading helper copy.
- Class selection and reset controls match the rest of the mockup UI.

---

## WOWUI-008 — Battle HUD Redesign

**Status:** Complete — 2026-09-24

### Objective

Keep the current autobattle behavior but present units and combat feedback through WoW-like unit frames and ability language.

### Work

- Replace letter-based Alliance/Horde crests with shared faction art/icons.
- Rebuild each combatant presentation as a compact unit-frame style component with:
  - portrait
  - name
  - class
  - level
  - role
  - health
  - class resource
  - action/cast state
  - buff/debuff hooks
- Surface the relevant ability icon when a combat action fires.
- Add restrained combat feedback for:
  - damage
  - healing
  - crits
  - misses
  - deaths
  - ultimate/cooldown events
- Darken/rework the bright cyan CSS arena so the HUD reads as Warcraft rather than a mobile autobattler.
- Migrate pause/speed/reset controls to shared game controls.
- Use the global class-color source.
- Preserve battle timing, pause, reset, and 1x/2x/4x behavior.

### Acceptance Criteria

- Battle behavior is unchanged.
- Unit health/resources remain readable under active combat.
- Ability actions are associated with spell icons.
- No faction letter placeholder remains.
- No local class-color table remains.

---

## WOWUI-009 — Base Management Redesign

### Objective

Keep the current base-management mechanics while removing the mobile-strategy/admin-dashboard visual language.

### Work

- Replace every building emoji with proper WoW/profession/building icon assets.
- Replace Unicode resource symbols with proper resource/currency icons.
- Rebuild the left rail as compact icon buttons with shared tooltips.
- Rework the top resource bar using shared icon counters.
- Keep the management-map layout, but replace floating emoji plots with framed Warcraft-style building plaques/thumbnails.
- Rework the right Buildings panel using the shared frame/inset/tab system.
- Use iconized resource costs on upgrade rows.
- Rework bottom action buttons as shared WoW action controls.
- Remove the existing website-style suite nav in favor of the shared navigation from WOWUI-004.
- Preserve filtering, building selection, upgrade hooks, resource deduction, and profession building coverage.

### Acceptance Criteria

- No emoji/Unicode game-concept icon remains on the Base screen.
- Buildings, professions, resources, and actions have proper icons and tooltips.
- Upgrade and resource behavior is unchanged.
- The screen visually belongs to the same UI family as Gear/Talents.

---

## WOWUI-010 — Simulation Lab Reskin

### Objective

Keep the developer-facing functionality while making the shell consistent with the Warcraft UI system.

### Work

- Wrap controls/results in shared frames and insets.
- Convert hero selection rows into icon/class-aware controls.
- Make actor cards resemble inspect/unit frames while retaining all technical values.
- Keep hashes, tick counts, deterministic state, and debug values monospace.
- Restyle the combat log as a WoW-like combat/chat log:
  - dark translucent/inset log surface
  - compact rows
  - class-colored actor names
  - inline ability icons where data permits
  - damage/healing/system event differentiation
  - shared dropdown/filter controls
- Keep full JSON log download support.
- Preserve deterministic engine behavior exactly.

### Acceptance Criteria

- Same seed + same definitions produce the same hashes as before the UI work.
- Smoke tests remain green.
- Combat log remains fully inspectable.
- Developer information density is preserved while generic admin-dashboard styling is removed.

---

## WOWUI-011 — Cross-Screen Consistency and Accessibility Pass

### Objective

Finish the migration and remove legacy visual language that survived individual screen work.

### Work

- Audit all `mockup/*.html` and `mockup/simulation/` surfaces for:
  - generic rounded cards
  - default browser controls
  - duplicate color definitions
  - duplicate icon helpers
  - duplicate tooltip implementations
  - emoji/Unicode game-concept stand-ins
  - inconsistent spacing/type scales
  - inconsistent button states
  - missing keyboard focus
  - missing tooltip access from keyboard
- Verify responsive behavior at desktop/tablet/mobile widths.
- Verify hover/focus/selected/disabled/locked states on all shared primitives.
- Add textual quality/status cues wherever color alone would otherwise carry meaning.
- Verify every meaningful game icon has an accessible label or associated visible text.
- Run the simulation smoke test after the final CSS/JS cleanup.
- Update `mockup/README.md` with the shared UI architecture and any new files.

### Acceptance Criteria

- All screens use the shared frame/button/icon/tooltip/control language.
- No screen visibly reads as a separate web app.
- No emoji/Unicode game-concept placeholders remain.
- Keyboard focus is visible.
- Color is not the only indicator for locked/quality/error states.
- `npm run dev` still rebuilds and opens the mockup.
- `npm run simulation:test` passes.
