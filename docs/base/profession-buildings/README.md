# Profession Buildings

## Purpose

Profession buildings are faction Base facilities that own three independent hero profession tracks. Every hero may learn exactly one profession from each track, for a maximum of three profession choices per hero.

Learning a different profession in a track replaces only that track. It never clears either of the hero's other profession choices.

## Artisan — Artisans Guild

The Artisans Guild owns the Artisan track:

- [Blacksmith](./blacksmith/README.md)
- [Alchemist](./alchemist/README.md)
- [Enchanter](./enchanter/README.md)
- [Tailor](./tailor/README.md)
- [Leatherworker](./leatherworker/README.md)
- [Engineer](./engineer/README.md)

## Gathering — Gathering Camp

The Gathering Camp owns the Gathering track:

- [Mining](./mining/README.md)
- [Skinning](./skinning/README.md)
- [Herbalism](./herbalism/README.md)

## Survival — Survival Lodge

The Survival Lodge owns the Survival track:

- [Fishing](./fishing/README.md)
- [First Aid](./first-aid/README.md)
- [Cooking](./cooking/README.md)

## Shared Rules

All three buildings use normal five-level Keep-gated Base progression. A profession's effective level mirrors the level of the building that owns its track.

Hero profession selections are stored inside the active faction campaign and are keyed by hero ID as independent `artisan`, `gathering`, and `survival` values. Cross-faction hero references are rejected by the campaign state boundary.

Artisans Guild, Gathering Camp, and Survival Lodge each expose exactly three hero assignment slots through the shared building-assignment runtime. The active-faction roster supplies draggable heroes. Before training begins, a slot may be removed or replaced; a hero cannot occupy a second building slot elsewhere. Starting training persists the selected profession/action and current campaign phase, marks the hero unavailable, and completes after two campaign phase advances. Completion applies only the selected profession track and then frees the slot.

## Shared Direction

Profession buildings can later control:

- available recipes or gathering activities
- material processing
- output quality or capability
- training queues and automation
- assignment duration and completion effects

Material requirements and profession-specific recipes can be authored independently without changing the three-track ownership contract.
