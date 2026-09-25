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
| WOWUI-010 | Simulation lab reskin **(Complete)** | WOWUI-001, WOWUI-002, WOWUI-003 |
| WOWUI-011 | Cross-screen consistency and accessibility pass **(Complete)** | WOWUI-004 through WOWUI-010 |
| WOWUI-012 | Canonical Classic race/class expansion | WOWUI-011 |
| WOWUI-013 | Simplify talents to two tiers plus one capstone | WOWUI-012 |
| WOWUI-014 | Slot picker gear flow and trinket support | WOWUI-011 |
| WOWUI-015 | Building levels 1–5 and tier mapping | WOWUI-011 |
| WOWUI-016 | Roster management and five saved party loadouts | WOWUI-012, WOWUI-014 |
| WOWUI-017 | Quest Board meta-progression | WOWUI-015, WOWUI-016 |
| WOWUI-018 | Unified hero management workspace | WOWUI-013, WOWUI-014, WOWUI-016 |
| WOWUI-019 | Gameplay-management integration acceptance | WOWUI-012 through WOWUI-018 |

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

**Status:** Complete — 2026-09-24

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

**Status:** Complete — 2026-09-24

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

**Status:** Complete — 2026-09-24

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

---

## Gameplay / Progression Management Wave

This wave starts after the cross-screen UI consistency pass. It intentionally changes prototype gameplay-management contracts that the earlier WOWUI tasks preserved.

### Product Rules For This Wave

- Use **WoW Classic / original-era race-class combinations** as the authority for playable race/class availability.
- Do not invent class talent names, talent identities, or talent icons. Talent content represented in the prototype must be traceable to the corresponding Classic class talent tree and use the icon for that actual talent.
- Talent trees are intentionally simplified for this prototype. Preserve Classic identity/content, not Classic's full prerequisite graph.
- Item tier, building tier, talent tier, and item quality are separate concepts.
- Persistent T1/T2/T3/T4/T5 badges should not clutter equipment or building chrome. Show tier detail in the shared tooltip/hover/focus surface unless a progression decision requires the tier to be visible.
- Roster, party loadouts, quests, gear, and talents must share one hero identity/state model rather than maintaining disconnected screen-local copies.

---

## WOWUI-012 — Canonical Classic Race/Class Expansion

### Objective

Add Night Elf and Tauren to hero creation and replace the current faction-wide permissive class rule with the canonical WoW Classic race/class matrix for **all eight playable races**.

### Work

- Replace the current `availability_rule` that gives every race all shared faction classes with one authoritative **per-race** class-availability model.
- The complete race/class matrix must be exactly:
  - **Human:** Mage, Paladin, Priest, Rogue, Warlock, Warrior
  - **Dwarf:** Hunter, Paladin, Priest, Rogue, Warrior
  - **Gnome:** Mage, Rogue, Warlock, Warrior
  - **Night Elf:** Druid, Hunter, Priest, Rogue, Warrior
  - **Orc:** Hunter, Rogue, Shaman, Warlock, Warrior
  - **Undead:** Mage, Priest, Rogue, Warlock, Warrior
  - **Tauren:** Druid, Hunter, Shaman, Warrior
  - **Troll:** Hunter, Mage, Priest, Rogue, Shaman, Warrior
- Add **Night Elf** to Alliance race data and **Tauren** to Horde race data.
- Update every existing race entry — Human, Dwarf, Gnome, Orc, Undead, and Troll — so its available classes come from the same canonical race-level source instead of faction-level inheritance.
- Keep unavailable classes visible in the race selector only when useful for comparison, but render them locked/desaturated and non-selectable.
- Add/update race icons, faction treatment, racial tooltip data, hero seed data, and roster presentation for Night Elf and Tauren using the existing shared icon/tooltip contracts.
- Add Night Elf and Tauren body-specific race icon mappings to the shared icon resolver.
- Keep race and class data JSON-backed; do not hard-code a second availability matrix in screen JS.
- Add validation that rejects any source-data or UI-created hero whose class is not allowed for that exact race.

### Acceptance Criteria

- Human, Dwarf, Gnome, Night Elf, Orc, Undead, Tauren, and Troll all expose exactly the class combinations listed above.
- The old faction-wide permissive availability rule is removed.
- Invalid Classic race/class combinations cannot be created through the UI or accepted by the validation layer.
- Race selector, roster, gear, talents, and battle surfaces can render all eight races without fallback text or broken icons.
- Race/class availability has one authoritative race-level data source.

---

## WOWUI-013 — Simplify Talents To Two Tiers Plus One Capstone

### Objective

Reduce every represented class talent tree to a compact prototype model while keeping talent identity and iconography faithful to the corresponding Classic talent tree.

### Work

- Replace the current multi-tier/prerequisite presentation with:
  - **Talent Tier 1**
  - **Talent Tier 2**
  - **one Capstone**
- Remove prerequisite connector lines/arrows entirely.
- Remove per-node dependency chains. Talent choice inside an unlocked tier should be flexible.
- Use tier-level gating only:
  - Tier 1 is the entry tier.
  - Tier 2 unlocks from the tree's configured spend/progression threshold.
  - The capstone unlocks from the tree's configured final threshold.
- Do not create fictional talent names, abilities, spell icons, or “close enough” icon mappings.
- For every displayed talent:
  - record the canonical Classic talent/tree identity in data,
  - use the icon belonging to that actual talent,
  - keep the talent under the correct class talent tree/spec.
- If a canonical talent/icon cannot be verified, omit it from this prototype until it can be sourced rather than inventing a replacement.
- Keep left-click learn and right-click unlearn behavior where it remains useful.
- Preserve point totals/reset behavior but update validation for the simplified two-tier + capstone model.
- Make clear in code/data that these **talent tiers** are unrelated to item/building T1–T5 progression.

### Acceptance Criteria

- Every class talent tree rendered by the prototype has exactly two normal tiers and one capstone tier.
- No talent connector lines remain.
- No talent requires a specific predecessor node.
- All represented talents use the icon for that actual Classic talent and belong to the correct class tree.
- No invented talent content remains.
- Tier and capstone unlock rules are data-driven and validated.
- Reset, learn, unlearn, point-total, keyboard, and tooltip behavior still work.

---

## WOWUI-014 — Slot Picker Gear Flow And Trinket Support

### Objective

Make equipment management slot-first and compact: clicking a paper-doll slot should immediately let the player choose among items that can legally fill that slot.

### Work

- Change every equipment slot into an interactive picker trigger.
- Clicking either an empty or occupied slot opens a small anchored menu/popover containing the currently available, eligible items for that slot.
- Picker entries should show icon + item name/quality state; move secondary metadata such as tier into the shared tooltip.
- Keep item comparison available from the picker.
- Selecting an entry equips/replaces the item immediately.
- Include an explicit Unequip action for occupied slots.
- Add **one Trinket slot** to the paper doll.
- Add `Trinket` as a supported equipment slot/item family in data and filtering.
- Add trinket items to the armory/catalog so the slot is functional, not decorative.
- Update equipment counts, stats aggregation, filtering, accessibility labels, reset behavior, and persistence from six slots to seven.
- Remove redundant persistent `T1`/`T2`/`T3` labels from gear icons/cards; show tier on hover/focus tooltip instead.
- Preserve class/armor/weapon eligibility checks for non-trinket gear.

### Acceptance Criteria

- Clicking any gear slot opens an eligible-item picker for that exact slot.
- The picker supports equip, replace, compare, and unequip without requiring the user to hunt through the full armory first.
- One functional Trinket slot exists.
- Trinket items can be filtered, selected, equipped, unequipped, persisted, and included in stats.
- Hero equipment summary correctly reports seven slots.
- No redundant always-visible equipment tier badge remains; tier remains available from tooltip/focus details.

---

## WOWUI-015 — Building Levels 1–5 And Tier Mapping

### Objective

Give every building one consistent five-level progression contract tied directly to world/meta progression tiers, and make that progression **fully operable in the Base mockup** rather than leaving it as a data-only contract.

### Work

- Every building supports levels **1, 2, 3, 4, 5**.
- Map building level to progression tier one-to-one:
  - Level 1 = Tier 1
  - Level 2 = Tier 2
  - Level 3 = Tier 3
  - Level 4 = Tier 4
  - Level 5 = Tier 5
- Replace current impossible mockup values such as building levels **6** and **10**; no Base mockup building may render outside 1–5.
- Store current level, maximum level, upgrade cost, upgrade requirements, and unlocked capabilities in building data.
- Make upgrade rows/actions data-driven instead of screen-specific.
- Implement the progression loop in `mockup/base.html` / `mockup/base.js`:
  - selecting a building shows its current level, next level, cost, and requirements,
  - an enabled Upgrade action spends the displayed resources,
  - a successful upgrade increments exactly one level,
  - map plaque, building list, selection detail, tooltip, and resource counters update immediately from the same state,
  - insufficient resources prevent the upgrade and show the unmet requirement,
  - Level 5 disables further upgrading and presents the building as max level.
- Ensure no building can skip levels or exceed level 5.
- Surface the current level prominently enough for upgrade decisions.
- Do not repeat persistent `T1`–`T5` badges where “Level 1–5” already communicates the same information; expose tier equivalence in the shared building tooltip.
- Define hooks so building level can unlock Quest Board mission tiers and future profession/base capabilities.
- Profession buildings must use the **matching profession icon**, not a generic building, crafting, spell, or approximate substitute:
  - Blacksmith / Blacksmithing → Blacksmithing profession icon
  - Alchemy Lab / Alchemy → Alchemy profession icon
  - Enchanter's Study / Enchanting → Enchanting profession icon
  - Tailor / Tailoring → Tailoring profession icon
  - Leatherworker / Leatherworking → Leatherworking profession icon
  - Engineer Workshop / Engineering → Engineering profession icon
- Use the same semantic profession-icon key on the map plot, Buildings list, selected-building detail, upgrade UI, and tooltips so one profession never shows different icon art across surfaces.
- Correct any shared icon-resolver mapping that does not resolve to the corresponding profession icon.

### Acceptance Criteria

- Every building begins within 1–5 and can progress sequentially to level 5.
- The Base mockup can visibly perform **1 → 2 → 3 → 4 → 5** upgrades, including resource deduction and immediate UI refresh.
- No Base mockup building renders level 0, level 6+, or any other state outside 1–5.
- Building level and progression tier always agree.
- Upgrade cost/requirements come from data.
- Invalid level jumps and level 6+ states are rejected.
- Level 5 cannot be upgraded again.
- Every profession building uses its corresponding profession icon consistently on every Base surface.
- Base UI and tooltips clearly communicate current level, next upgrade, cost/requirements, and tier equivalence without redundant badge clutter.

---

## WOWUI-016 — Roster Management And Five Saved Party Loadouts

### Objective

Turn the roster into the authoritative hero-management source and let players save reusable parties for group content.

### Work

- Flesh out roster management around one authoritative hero collection.
- Each roster entry should expose at minimum:
  - hero identity/name
  - faction
  - race
  - class
  - selected talent tree/build summary
  - equipment summary
  - quest/availability state
  - party-loadout membership
- Add filtering/sorting useful for party construction, including class and availability.
- Add a party-loadout manager inside the same roster system.
- Support exactly **five saved loadout slots**.
- Each saved loadout can be configured as one of these exact party sizes:
  - 3 heroes
  - 5 heroes
  - 10 heroes
  - 20 heroes
- Prevent duplicate use of the same hero within one loadout.
- Validate that a loadout marked ready contains exactly its selected party size.
- Allow a hero to appear in multiple saved templates, but resolve actual availability when a quest is launched.
- Give loadouts editable names and clear size/readiness indicators.
- Persist roster edits and the five saved loadouts through the same state layer used by hero gear/talents.

### Acceptance Criteria

- There are exactly five saveable party loadout slots.
- Each loadout supports only 3/5/10/20 member configurations.
- Ready-state validation enforces exact party size and no duplicate hero within the same loadout.
- Roster changes immediately appear in loadouts and hero-management surfaces.
- Loadouts do not maintain detached copies of hero gear/talent data.
- Unavailable/on-quest heroes are visibly distinguishable during party selection.

---

## WOWUI-017 — Quest Board Meta-Progression

### Objective

Add a Quest Board that converts base progression and roster depth into structured dispatch content.

### Work

- Add a **Quest Board** building/surface to Base management.
- Quest Board access and mission availability are governed by building/progression tier.
- Define five quest tiers with exact required dispatch sizes:
  - **Tier 1 → 1 hero**
  - **Tier 2 → 3 heroes**
  - **Tier 3 → 5 heroes**
  - **Tier 4 → 10 heroes**
  - **Tier 5 → 20 heroes**
- Tier 1 supports direct solo-hero selection.
- Tier 2–5 can launch from a compatible saved party loadout or from an ad-hoc roster selection that meets the exact required size.
- The Quest Board must show:
  - quest tier
  - required hero count
  - availability/lock reason
  - selected hero/party
  - dispatch action
  - active/completed state hooks
  - reward/meta-progression hooks
- Do not implement detached quest copies of heroes; dispatched heroes reference roster hero IDs and become unavailable through shared roster state.
- Quest completion/reward math can remain prototype-simple in this task, but its data contract must support future expansion without changing the 1/3/5/10/20 tier-size mapping.

### Acceptance Criteria

- Quest tiers require exactly 1, 3, 5, 10, and 20 heroes for T1–T5 respectively.
- Locked quest tiers clearly state the building/progression requirement.
- A quest cannot launch with the wrong party size or an unavailable hero.
- T2–T5 can consume a compatible saved loadout.
- Dispatch availability is reflected immediately in the roster/loadout manager.
- Quest state is data-driven and persists with the rest of prototype state.

---

## WOWUI-018 — Unified Hero Management Workspace

### Objective

Tie roster management, hero inspection, gear selection, talents, and party membership together so a player does not need to bounce between disconnected screens to manage one hero.

### Work

- Create one unified hero-management workspace driven by the authoritative roster.
- Use a compact roster list/rail to select a hero.
- For the selected hero, provide one easy interface for:
  - identity/race/class summary
  - availability/quest state
  - paper-doll equipment and slot pickers
  - one Trinket slot
  - current stats
  - simplified talent allocation
  - talent tree/spec selection
  - party-loadout membership
- Changes to gear or talents update the selected roster hero immediately.
- Changes to roster identity/status update gear/talent/loadout views immediately.
- Keep dedicated Gear and Talent screens only if they remain useful as expanded views; they must read/write the same hero state and not duplicate it.
- Provide clear navigation between roster-level decisions and selected-hero detail without full-page context loss.
- Keep keyboard navigation/focus and shared tooltip behavior intact.

### Acceptance Criteria

- Selecting a hero from the roster exposes that hero's gear, talents, stats, availability, and loadout membership in one workspace.
- Gear and talent changes have one authoritative state and appear everywhere immediately.
- The player can move among heroes without losing unsaved screen-local state because hero state is no longer screen-local.
- The interface supports all seven equipment slots, simplified talents, and all five party loadouts.
- Quest dispatch status is visible from hero management.

---

## WOWUI-019 — Gameplay-Management Integration Acceptance

### Objective

Prove the new race/class, talent, equipment, building, roster, loadout, and Quest Board contracts work together and cannot drift into contradictory state.

### Work

- Add validation/tests for:
  - exact Classic race/class availability for all eight races: Human, Dwarf, Gnome, Night Elf, Orc, Undead, Tauren, and Troll
  - rejection of invalid race/class combinations
  - two talent tiers + one capstone per represented tree
  - absence of prerequisite connectors/dependency edges
  - canonical talent identity/icon metadata being present for every displayed talent
  - seven equipment slots including exactly one Trinket
  - slot picker filtering by legal slot/equipment rules
  - no persistent equipment tier badges required for normal browsing
  - every building constrained to levels 1–5
  - interactive Base mockup progression from level 1 through level 5 with resource deduction and synchronized UI state
  - building level ↔ tier equivalence
  - canonical matching profession icons across every profession-building surface
  - exactly five saved party loadouts
  - party sizes restricted to 3/5/10/20
  - Quest Board dispatch sizes of 1/3/5/10/20 for T1–T5
  - roster availability changing when heroes are dispatched
  - shared hero gear/talent state across roster, Gear, Talents, loadouts, and Quest Board
- Add a headless happy-path scenario:
  - create/select a valid Night Elf or Tauren hero
  - assign simplified talents
  - equip gear through slot picker including a trinket
  - add hero to a saved party loadout
  - upgrade a building through the Base mockup progression controls and verify resource deduction/state refresh
  - upgrade the Quest Board/building progression
  - dispatch a correctly sized party
  - verify roster availability and persisted state
- Keep deterministic combat smoke tests green.

### Acceptance Criteria

- All new validation/tests pass.
- No screen can create contradictory hero copies.
- Invalid race/class, talent, equipment, building-level, loadout-size, or quest-party states are rejected.
- Existing deterministic simulation smoke tests remain green.
- `npm run dev` still rebuilds/serves the full mockup suite.

