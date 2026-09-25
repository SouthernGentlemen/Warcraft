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
- `base.html` — Realm-Grinder-inspired persistent base management mockup with resource bar, building map, profession buildings, filters, selection detail, and interactive upgrades

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

### Base landing shell

The Base landing screen now uses only the shared top navigation, persistent resource bar, and stronghold map. The old internal navigation rail, permanent building/Quest panels, bottom action bar, and profile footer have been removed. Building and Quest progression logic remains in `base.js` for the upcoming sidecar migration tasks.

### Map-first Base landing

The Base landing screen now keeps only Gold, Lumber, and Stone in its persistent HUD. The stronghold map consumes the remaining viewport, building labels are limited to name and level, no building is selected by default, and no detail area reserves layout space before a building interaction. Building-specific management remains intentionally deferred to the sidecar tasks.

### Base building sidecar

Base building details now use one reusable sidecar that is hidden on initial load and overlays the map only after a building is selected. Selecting another building replaces the sidecar identity in place; close, Escape, and empty-map dismissal clear selection, and explicit close restores focus to the originating building. Building management content remains intentionally deferred to WOWUI-025.

### Building management sidecar

Core and profession buildings now manage progression directly inside the shared Base sidecar. The sidecar reads current/next capabilities, prerequisites, and resource costs from `data/base/buildings.json`; blocked and maximum-level states are explicit, successful upgrades update the resource HUD and map level in place, and the legacy building-list renderer has been removed. Quest Board management remains reserved for WOWUI-026.

### Quest Board sidecar

Quest Board is now a first-class building on the Base map and uses the shared building sidecar for both progression and hero dispatch. The sidecar renders Tier 1–5 quest availability, party-size requirements, available heroes/saved loadouts/ad-hoc selection, active assignments, completion, and rewards directly from authoritative roster state. Dispatch/completion state survives sidecar close/reopen, and the legacy permanent Quest Board panel dependency is gone.

### Base attention signaling

The closed-sidecar Base map now exposes one deterministic attention state per building. Priority is Quest complete, Quest ready, profession action, upgrade ready, then blocked. Ready/completed states use compact semantic icon markers while blocked upgrades use a deliberately subdued treatment. Building accessible labels and tooltips explain the active state, and attention recalculates after resource, upgrade, roster, dispatch, and completion changes without adding a separate overview panel.
