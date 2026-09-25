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


## WOWUI-021 — Base Landing Page Simplification

Status: planned

### Objective

Make Base the primary landing screen for the mockup and simplify it into a spatial stronghold dashboard. The base map should be the interface: persistent chrome communicates resources and high-level state, while building-specific detail stays out of view until the player explicitly selects a building.

The default Base view must feel calm and readable. It should answer three questions without opening anything:

- What resources do I have?
- What in my base needs attention?
- What should I interact with next?

### Work Items

1. Make Base the landing page.
   - Change the root mockup flow so `/mockup/` opens or redirects to `base.html`.
   - Keep a developer screen index available separately if useful, but do not present it as part of the player-facing game flow.
   - Base becomes the default entry point into the mockup.

2. Remove duplicate navigation from inside Base.
   - Remove the Base/Heroes/Combat/Crafting/Research/Events/Challenges left rail.
   - Keep the shared top-level WoW navigation as the only primary screen navigation.
   - Do not duplicate global destinations inside the Base layout.

3. Reduce the persistent resource bar.
   - Keep only important persistent resources visible at all times.
   - Prioritize Gold, Lumber, Stone, and at most one additional progression resource if needed.
   - Move secondary currencies, explanations, and detailed rates into tooltips or the relevant subsystem.
   - Keep the resource bar compact enough that the map remains visually dominant.

4. Make the stronghold map the primary interface.
   - The map should occupy the majority of the Base screen.
   - Core buildings and profession buildings remain directly clickable.
   - Remove permanent prose-heavy building cards from the default view.
   - Building labels should be compact: name, level, and at most one concise status cue.
   - Preserve the Warcraft-style framed/icon language already established by the shared UI system.

5. Replace the permanent right panel with a hidden sidecar.
   - No right-side panel is visible on initial page load.
   - Clicking a building opens a sidecar from the right edge.
   - The sidecar shows only the selected building's information and actions.
   - Clicking another building replaces the sidecar contents without stacking dialogs or panels.
   - The sidecar must have an explicit close control.
   - Escape closes the sidecar.
   - Closing the sidecar returns the map to the full-width calm landing state.
   - Clicking empty map space may close the sidecar if it does not conflict with map interaction.
   - The selected building must remain visually highlighted while its sidecar is open.
   - The sidecar must not reserve permanent layout width while hidden.

6. Move building management into the sidecar.
   - Core building sidecars show current level, current capability, next level, requirements, upgrade cost, and upgrade action.
   - Profession building sidecars show profession identity, current tier/level, relevant capabilities, and profession-specific actions or placeholders.
   - Keep upgrade errors and unmet requirements inside the selected building sidecar rather than adding global warning panels.
   - Do not keep a permanent building list beside the map.

7. Make Quest Board a map building interaction.
   - Quest Board stays represented as a building/location on the base map.
   - Remove the permanently visible Quest Board section from the Base layout.
   - Clicking Quest Board opens its sidecar.
   - Quest tier selection, hero dispatch, active quest state, and completion controls live inside that sidecar.
   - Quest status should be communicated on the map with a compact state badge when attention is required.

8. Remove unrelated Base actions from the landing screen.
   - Remove the large bottom action bar.
   - Remove generic actions such as Train Heroes and Start Mission from Base.
   - Hero progression belongs on Heroes.
   - Combat/content launch belongs on Battle or the appropriate content surface.
   - Base actions should originate from interacting with buildings.

9. Remove the persistent profile/status footer.
   - Remove the large bottom profile strip and secondary currency cluster.
   - If account/base identity is still needed, reduce it to a compact element in the shared header or resource bar.
   - Do not dedicate a full-width persistent footer to information that is not immediately actionable.

10. Add compact building attention states.
    - Buildings may show one small icon/badge/glow for actionable state.
    - Supported states should include at minimum:
      - upgrade available
      - blocked/requirements unmet
      - quest complete or quest attention
      - profession action available
    - Attention cues must use iconography plus accessible text/labels and must not rely on color alone.
    - Avoid multiple simultaneous badges on one building unless there is a strong gameplay reason.

11. Keep the default landing state intentionally sparse.
    - Initial load shows shared top navigation, compact resource state, and the full base map.
    - No building sidecar is open by default.
    - No building list, Quest Board panel, large action bar, profile footer, or duplicate navigation rail is visible.
    - The player should be able to visually scan the entire base without reading dense panels.

12. Preserve existing data and mechanics.
    - Continue using `data/base/buildings.json` as authored runtime data.
    - Preserve current five-level building progression and upgrade requirements.
    - Preserve Quest Board dispatch/completion mechanics and roster integration.
    - Preserve shared icon/tooltips and WoW UI primitives.
    - Do not reintroduce Markdown-to-JSON generation or runtime file mutation.

### Interaction Model

Default state:

`Shared Navigation + Compact Resources + Full Base Map`

Building selected:

`Shared Navigation + Compact Resources + Base Map + Right Sidecar`

Sidecar behavior:

- closed by default
- opens only after a building click
- one selected building at a time
- replaces content when another building is clicked
- closes via close button or Escape
- does not permanently shrink the map when closed
- selected building remains visibly active while open

### Acceptance Criteria

- `/mockup/` lands on Base rather than the mockup launcher.
- The Base screen has no internal left navigation rail.
- The Base screen has no permanent right-side detail panel.
- The Base screen has no permanent building list.
- The Base screen has no permanent Quest Board panel.
- The Base screen has no large bottom action bar.
- The Base screen has no full-width profile/status footer.
- The map is the dominant visual surface on initial load.
- No sidecar is visible on initial load.
- Clicking every visible building opens the correct building sidecar.
- Clicking Quest Board opens quest management in the sidecar.
- Clicking another building replaces the current sidecar content.
- Closing the sidecar restores the full landing layout.
- Building upgrade state, requirements, and costs remain functional.
- Quest dispatch and completion remain functional.
- Base icons render through the shared icon resolver.
- Actionable buildings expose compact, accessible attention states.
- Responsive layouts keep the map usable and the sidecar accessible on desktop, tablet, and mobile.
- `npm test` continues to pass.
