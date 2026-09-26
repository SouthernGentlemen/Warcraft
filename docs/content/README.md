# Content Definitions

Runtime content progression is authored in `data/content/progression.json`. Availability is cumulative: Quest unlocks at Base 1, Incursion at Base 2, Dungeon at Base 3, Raid at Base 4, and Siege at Base 5. Quest automation unlocks at Base 2, Incursion automation at Base 3, and Dungeon automation at Base 4; Raid and Siege are never auto-run by the current contract.

Hero XP on victory is Quest +1, Incursion +2, Dungeon +3, Raid +0, Siege +0. Manual Quest/Incursion/Dungeon launch from Embark; Raid/Siege launch from the dedicated endgame surface. All launch, automation, and result state belongs to the active faction campaign.

See [Stats](./stats/README.md) for shared combat-stat definitions.
