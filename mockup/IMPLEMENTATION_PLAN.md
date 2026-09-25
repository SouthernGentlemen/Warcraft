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
