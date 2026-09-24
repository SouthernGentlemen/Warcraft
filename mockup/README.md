# Mockups

Static review screens backed by the root-level `/data/` JSON mirror.

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


## Screens

- `index.html` — mockup launcher
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

Every run performs a full local prototype reset:

1. tears down the previously recorded Warcraft dev server, if one is still running
2. deletes and rebuilds `/data/` directly from `/docs/`
3. regenerates the race and class prototype indexes
4. starts the static server
5. uses port 5173 when available, otherwise automatically selects the next available port

You do not need to find or kill ports manually. Running `npm run dev` again replaces the previous Warcraft dev instance.

Once the rebuilt server is listening, the selected `/mockup/` URL is opened automatically in your default browser. The active URL is also printed in the terminal, and the root URL redirects to `/mockup/`.

`HOST` and `PORT` can still be supplied when needed, but occupied ports are handled automatically. Set `NO_OPEN=1` only when you intentionally want to suppress automatic browser launch.

## Simulation Smoke Test

Run:

```bash
npm run simulation:test
```

The smoke test runs the 1-person and 3-person scenarios twice with the same seed and fails if either the final state hash or full combat-log hash differs.
