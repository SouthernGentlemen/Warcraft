import { CombatSimulation } from "../combat/engine/combat-sim.js";
import { MAX_SIM_TICKS } from "../combat/engine/constants.js";
import { createHeroDefinition } from "../combat/engine/hero-factory.js";
import { resolveNpcPoolDefinitions } from "../combat/engine/npc-factory.js";
import "../ui/warcraft-equipment-rules.js";

const EquipmentRules = globalThis.WarcraftEquipmentRules;

export const SUPPORTED_PARTY_SIZES = Object.freeze([1, 3, 5, 10, 20]);
const CLASS_DATA_ROOT = "../../data/heroes/classes/";
const NPC_CATALOG_ROOT = "../../data/npcs/catalog.json";
const NPC_POOLS_ROOT = "../../data/npcs/dungeon-pools.json";
const FORMATION_ROOT = "../../data/combat/formations.json";
const CLASS_INDEX_ROOT = CLASS_DATA_ROOT + "index.json";
const PARTY_FORMATION_SLOT_IDS = Object.freeze([
  "rear-left",
  "rear-right",
  "middle-left",
  "middle-right",
  "front"
]);

function integer(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? Math.trunc(next) : fallback;
}
async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load " + path);
  return response.json();
}
function normalizeSpecId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}
function uniqueIds(ids) {
  return [...new Set((ids || []).map(String))];
}
function normalizeGroupedFormation(formation, heroIds, faction, partySize) {
  if (![10, 20].includes(partySize)) return null;
  const expectedGroups = partySize / 5,
    groups = formation && Array.isArray(formation.groups) ? formation.groups : [];
  if (groups.length !== expectedGroups)
    throw new Error(
      "Encounter formation requires exactly " + expectedGroups + " five-player groups."
    );
  const normalizedGroups = groups.map((group, index) => {
    const slots = PARTY_FORMATION_SLOT_IDS.map(id => {
      const record = Array.isArray(group.slots)
        ? group.slots.find(slot => slot && String(slot.id) === id)
        : null;
      return { id, heroId: record && record.heroId != null ? String(record.heroId) : null };
    });
    return { id: String(group.id || "group-" + (index + 1)), slots };
  });
  const slotted = normalizedGroups
      .flatMap(group => group.slots.map(slot => slot.heroId))
      .filter(Boolean),
    ids = uniqueIds(heroIds);
  if (
    slotted.length !== partySize ||
    new Set(slotted).size !== partySize ||
    ids.some(id => !slotted.includes(id))
  )
    throw new Error(
      "Grouped encounter formation must contain every unique battle hero exactly once."
    );
  return {
    type: partySize === 10 ? "raid" : "siege",
    faction: String(faction || ""),
    groups: normalizedGroups
  };
}
function normalizePartyFormation(formation, heroIds, faction) {
  const ids = uniqueIds(heroIds);
  if (ids.length !== 5) return null;
  const source = formation && Array.isArray(formation.slots) ? formation.slots : null;
  const slots = PARTY_FORMATION_SLOT_IDS.map((id, index) => {
    const record = source && source.find(slot => slot && String(slot.id) === id);
    const heroId = record && record.heroId != null ? String(record.heroId) : ids[index] || null;
    return { id, heroId };
  });
  const slotted = slots.map(slot => slot.heroId).filter(Boolean);
  if (
    slotted.length !== 5 ||
    new Set(slotted).size !== 5 ||
    JSON.stringify(slotted) !== JSON.stringify(ids)
  )
    throw new Error(
      "Five-hero encounter formation must match hero order and fill every authored slot."
    );
  return { type: "party", faction: String(faction || ""), slots };
}
function validateFormationConfig(payload) {
  const party = payload && payload.party,
    slots = party && Array.isArray(party.slots) ? party.slots : [];
  if (
    !party ||
    Number(party.size) !== 5 ||
    JSON.stringify(party.slot_order) !== JSON.stringify(PARTY_FORMATION_SLOT_IDS)
  )
    throw new Error("Formation config must author the five 2 / 2 / 1 party slots.");
  const byId = new Map(slots.map(slot => [String(slot.id), slot]));
  if (PARTY_FORMATION_SLOT_IDS.some(id => !byId.has(id)))
    throw new Error("Formation config is missing a party slot.");
  const weights = PARTY_FORMATION_SLOT_IDS.map(id =>
    Math.max(0, integer(byId.get(id).target_weight))
  );
  const frontWeight = weights[PARTY_FORMATION_SLOT_IDS.indexOf("front")];
  if (
    frontWeight <= 0 ||
    weights.some(weight => weight <= 0) ||
    weights.some(
      (weight, index) =>
        index !== PARTY_FORMATION_SLOT_IDS.indexOf("front") && weight >= frontWeight
    )
  )
    throw new Error("Front must have the unique highest positive target weight.");
  return payload;
}

export function validatePartySize(size) {
  const next = integer(size);
  if (!SUPPORTED_PARTY_SIZES.includes(next))
    throw new Error("Unsupported party size: " + size + ". Expected 1, 3, 5, 10, or 20.");
  return next;
}

export function validateEncounterHandoff(encounter, roster) {
  if (!encounter || typeof encounter !== "object")
    throw new Error("Battle encounter configuration is required.");
  const loadout =
    encounter.loadoutId &&
    roster.getState().loadouts.find(entry => entry.id === encounter.loadoutId);
  const loadoutIds = loadout
    ? typeof roster.partyHeroIds === "function"
      ? roster.partyHeroIds(loadout)
      : loadout.heroIds || []
    : [];
  const heroIds = uniqueIds(
    encounter.heroIds && encounter.heroIds.length ? encounter.heroIds : loadoutIds
  );
  const partySize = validatePartySize(encounter.partySize || (loadout ? 5 : heroIds.length));
  if (heroIds.length !== partySize)
    throw new Error("Encounter requires exactly " + partySize + " unique heroes.");
  const heroes = heroIds.map(id => roster.hero(id));
  if (heroes.some(hero => !hero)) throw new Error("Encounter references an unknown roster hero.");
  const assignment =
    encounter.questAssignmentId &&
    roster
      .getState()
      .quests.find(quest => quest.id === encounter.questAssignmentId && quest.status === "active");
  const committed = new Set((assignment && assignment.heroIds) || []);
  const unavailable = heroes.filter(
    hero => hero.availability !== "available" && !(assignment && committed.has(hero.id))
  );
  if (unavailable.length) throw new Error("Every battle hero must be available.");
  if (!encounter.npcPoolId) throw new Error("Encounter requires an NPC pool.");
  const sourceFormation =
    encounter.formation ||
    (loadout && typeof roster.partyFormation === "function"
      ? roster.partyFormation(loadout)
      : null);
  const formation =
    partySize === 5
      ? normalizePartyFormation(sourceFormation, heroIds, encounter.faction || roster.getFaction())
      : [10, 20].includes(partySize) && sourceFormation
        ? normalizeGroupedFormation(
            sourceFormation,
            heroIds,
            encounter.faction || roster.getFaction(),
            partySize
          )
        : null;
  return Object.assign({}, encounter, {
    partySize,
    heroIds,
    formation,
    seed: integer(encounter.seed, 0x5eed)
  });
}

async function heroDefinition(hero, classIndex, team = 0, formationMeta = null) {
  const classMeta = classIndex.classes.find(entry => entry.id === hero.classId);
  if (!classMeta) throw new Error("Unknown hero class: " + hero.classId);
  const wantedSpec = normalizeSpecId(
    (hero.talentBuild && hero.talentBuild.primarySpec) || hero.spec
  );
  const specMeta =
    classMeta.specs.find(
      entry => entry.id === wantedSpec || normalizeSpecId(entry.label) === wantedSpec
    ) || classMeta.specs[0];
  if (!specMeta) throw new Error("No specialization data for " + hero.classId);

  const [specData, abilityData] = await Promise.all([
    fetchJson(CLASS_DATA_ROOT + specMeta.data_path.replace("./", "")),
    fetchJson(
      CLASS_DATA_ROOT +
        (classMeta.abilities_path || "./" + classMeta.id + "/abilities.json").replace("./", "")
    )
  ]);

  const capstone = specData.talents?.capstones?.[0];
  if (!capstone?.ultimate_id)
    throw new Error("Specialization capstone is missing an Ultimate action mapping.");
  if (hero.talentBuild?.capstone && hero.talentBuild.capstone !== capstone.name)
    throw new Error("Hero capstone does not match the active specialization.");
  if (
    hero.talentBuild?.capstoneUltimateId &&
    hero.talentBuild.capstoneUltimateId !== capstone.ultimate_id
  )
    throw new Error("Hero capstone Ultimate mapping is stale.");
  if (hero.combatLoadout?.ultimateId !== capstone.ultimate_id)
    throw new Error("Hero Ultimate must match the active specialization capstone.");

  return Object.assign(
    createHeroDefinition({
      id: hero.id,
      name: hero.name,
      classMeta,
      specData,
      abilityData,
      level: Math.max(1, integer(hero.level, 1)),
      selectedCooldownIds: [hero.combatLoadout.ability1Id, hero.combatLoadout.ability2Id],
      selectedUltimateId: capstone.ultimate_id,
      selectedTalentNames: Array.isArray(hero.talentBuild && hero.talentBuild.picks)
        ? hero.talentBuild.picks
        : null,
      equipmentStats: EquipmentRules.modifiers(hero.equipment, hero),
      team
    }),
    {
      race: hero.race,
      faction: hero.faction,
      availability: hero.availability,
      formationGroup: (formationMeta && formationMeta.groupId) || null,
      formationSlot: (formationMeta && formationMeta.slotId) || null,
      formationTargetWeight: formationMeta ? Math.max(0, integer(formationMeta.targetWeight)) : 0
    }
  );
}

export function expandNpcGroup(poolEnemies, count) {
  if (!poolEnemies.length) return [];
  const total = Math.max(1, integer(count, poolEnemies.length));
  return Array.from({ length: total }, (_, index) => {
    const template = poolEnemies[index % poolEnemies.length];
    const cycle = Math.floor(index / poolEnemies.length) + 1;
    if (cycle === 1)
      return Object.assign({}, template, {
        sourceNpcId: template.id,
        encounterInstance: index + 1
      });
    return Object.assign({}, template, {
      id: template.id + "-instance-" + cycle,
      name: template.name + " #" + cycle,
      sourceNpcId: template.id,
      encounterInstance: index + 1
    });
  });
}

export async function resolveEncounter({ encounter, roster }) {
  const config = validateEncounterHandoff(encounter, roster);
  const [classIndex, npcCatalog, npcPools, formationConfig] = await Promise.all([
    fetchJson(CLASS_INDEX_ROOT),
    fetchJson(NPC_CATALOG_ROOT),
    fetchJson(NPC_POOLS_ROOT),
    fetchJson(FORMATION_ROOT)
  ]);
  const formations = validateFormationConfig(formationConfig),
    partySlots = new Map((formations.party.slots || []).map(slot => [String(slot.id), slot]));
  const heroFormation = new Map();
  if (config.formation && Array.isArray(config.formation.slots))
    for (const slot of config.formation.slots)
      if (slot && slot.heroId)
        heroFormation.set(String(slot.heroId), { groupId: "party", slotId: String(slot.id) });
  if (config.formation && Array.isArray(config.formation.groups))
    for (const group of config.formation.groups)
      for (const slot of group.slots || [])
        if (slot && slot.heroId)
          heroFormation.set(String(slot.heroId), {
            groupId: String(group.id),
            slotId: String(slot.id)
          });
  const heroes = await Promise.all(
    config.heroIds.map(id => {
      const meta = heroFormation.get(id) || null,
        slot = meta && partySlots.get(meta.slotId);
      return heroDefinition(
        roster.hero(id),
        classIndex,
        0,
        meta
          ? { groupId: meta.groupId, slotId: meta.slotId, targetWeight: slot && slot.target_weight }
          : null
      );
    })
  );
  const poolEnemies = resolveNpcPoolDefinitions({
    catalog: npcCatalog,
    pools: npcPools,
    poolId: config.npcPoolId,
    team: 1
  });
  const enemyCount = Math.max(1, integer(config.enemyCount, poolEnemies.length));
  const enemies = expandNpcGroup(poolEnemies, enemyCount);
  if (!enemies.length) throw new Error("NPC pool is empty: " + config.npcPoolId);
  return {
    config,
    heroes,
    enemies,
    actors: [...heroes, ...enemies],
    sources: Object.freeze({
      players: "WarcraftRoster",
      enemies: "data/npcs/catalog.json",
      formations: "data/combat/formations.json"
    })
  };
}

export class BattleEncounterRuntime {
  constructor({ actors, config, onComplete = null }) {
    this.actors = actors;
    this.config = Object.assign({}, config, { partySize: validatePartySize(config.partySize) });
    this.onComplete = typeof onComplete === "function" ? onComplete : null;
    this.paused = false;
    this.completed = false;
    this.rewardHookFired = false;
    this.reset();
  }
  reset() {
    this.simulation = new CombatSimulation({ actors: this.actors, seed: this.config.seed });
    this.paused = false;
    this.completed = false;
    this.rewardHookFired = false;
    return this.snapshot();
  }
  setPaused(paused) {
    this.paused = Boolean(paused);
    return this.paused;
  }
  step(ticks = 1) {
    if (this.paused || this.completed)
      return { frames: [], events: [], snapshot: this.snapshot(), completed: this.completed };
    const frames = [];
    const count = Math.max(1, integer(ticks, 1));
    for (let index = 0; index < count && !this.completed; index += 1) {
      const frame = this.simulation.step();
      frames.push(frame);
      const state = this.simulation.getState();
      // Stalemates (e.g. a lone healer vs one NPC) end as a defeat at the time limit.
      if (state.roundOver || state.frame >= MAX_SIM_TICKS) {
        this.completed = true;
        this.fireCompletionHook();
      }
    }
    return {
      frames,
      events: frames.flatMap(frame => frame.events),
      snapshot: this.snapshot(),
      completed: this.completed
    };
  }
  fireCompletionHook() {
    if (this.rewardHookFired) return;
    this.rewardHookFired = true;
    if (this.onComplete) this.onComplete(this.result());
  }
  snapshot() {
    const simulationState = this.simulation.getState();
    return {
      frame: simulationState.frame,
      paused: this.paused,
      completed: this.completed,
      winnerTeam: simulationState.winnerTeam,
      actors: this.actors.map((definition, index) => ({
        definition,
        state: simulationState.actors[index],
        actionState: this.simulation.actionState(index),
        index
      }))
    };
  }
  result() {
    const state = this.simulation.getState();
    return {
      encounter: this.config,
      winnerTeam: state.winnerTeam,
      completed: this.completed,
      timedOut: this.completed && !state.roundOver,
      frame: state.frame,
      rewardHook: "pending"
    };
  }
}
