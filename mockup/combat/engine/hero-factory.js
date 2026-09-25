import { BP, DEFAULT_AUTO_TICKS, mulBp } from "./constants.js";
import { compileTalentHooks, defaultTalentNames } from "./talent-hooks.js";

const LEVEL_BASELINES = {
  1: { major:12, minor:4, stamina:14, spirit:10, crit:0, haste:0, hit:0, mastery:0 },
  2: { major:20, minor:6, stamina:22, spirit:16, crit:1, haste:1, hit:1, mastery:0 },
  3: { major:30, minor:8, stamina:32, spirit:23, crit:2, haste:2, hit:2, mastery:1 },
  4: { major:42, minor:10, stamina:44, spirit:31, crit:4, haste:4, hit:3, mastery:2 },
  5: { major:56, minor:12, stamina:58, spirit:40, crit:6, haste:6, hit:4, mastery:4 }
};

function normalizeResource(identityResource) {
  const value = String(identityResource || "").toLowerCase();
  if (value.includes("energy")) return "energy";
  if (value.includes("rage")) return "rage";
  return "mana";
}

function copyAction(action) {
  return {
    id: action.id,
    name: action.name,
    kind: action.kind,
    school: action.school,
    target: action.target,
    power: Math.trunc(action.power || 0),
    coefficient_bp: Math.trunc(action.coefficient_bp || 0),
    cooldown_ticks: Math.trunc(action.cooldown_ticks || 0),
    resource: action.resource || "none",
    cost: Math.trunc(action.cost || 0),
    effect: action.effect || "none",
    icon_slug: action.icon_slug || "",
    canCrit: action.kind === "damage" || action.kind === "heal",
    canMiss: action.kind === "damage"
  };
}

function primaryKey(specData) {
  const value = String(specData.identity?.primary_stat || "").toLowerCase();
  if (value.includes("strength")) return "strength";
  if (value.includes("agility")) return "agility";
  return "intellect";
}

function buildStats(level, specData) {
  const row = LEVEL_BASELINES[level] || LEVEL_BASELINES[5];
  const primary = primaryKey(specData);
  const stats = {
    spirit: row.spirit,
    stamina: row.stamina,
    strength: row.minor,
    agility: row.minor,
    intellect: row.minor,
    crit: row.crit,
    haste: row.haste,
    spellPower: 0,
    healingPower: 0,
    hitRating: row.hit,
    mastery: row.mastery
  };

  stats[primary] = row.major;

  const role = String(specData.identity?.role || "").toLowerCase();
  if (role.includes("spell") || role.includes("shadow") || role.includes("elemental")) {
    stats.spellPower = level * 3;
  }
  if (role.includes("heal") || role.includes("support")) {
    stats.healingPower = level * 3;
  }

  return stats;
}

function buildDerived(stats, hooks) {
  const maxHealth = 500 + stats.stamina * 50;
  const physicalPower = Math.max(stats.strength, stats.agility) * 10;
  const spellPower = stats.intellect * 10 + stats.spellPower * 10;
  const healingPower = stats.intellect * 8 + stats.healingPower * 12;
  const baseMana = 500 + stats.intellect * 20;
  const maxMana = mulBp(baseMana, BP + hooks.maxManaBp);

  return {
    maxHealth,
    physicalPower,
    spellPower,
    healingPower,
    maxMana,
    manaRegenPerSecond: 10 + stats.spirit * 2,
    critBp: Math.min(5_000, 500 + stats.crit * 100),
    hitBp: Math.min(10_000, 9_000 + stats.hitRating * 200),
    hasteBp: stats.haste * 100,
    masteryBp: stats.mastery * 100
  };
}

function autoAction(specData) {
  const text = String(specData.identity?.auto_attack || "Auto Attack");
  const name = text.split(" — ")[0].trim() || "Auto Attack";
  const healing = /heal/i.test(text);
  const primary = primaryKey(specData);
  const school = healing ? "healing" : (primary === "intellect" ? "spell" : "physical");

  return {
    id: "auto",
    name,
    kind: healing ? "heal" : "damage",
    school,
    target: healing ? "lowest-ally" : "enemy",
    power: healing ? 45 : 55,
    coefficient_bp: healing ? 5_000 : 6_000,
    base_ticks: DEFAULT_AUTO_TICKS,
    resource: "none",
    cost: 0,
    effect: "none",
    icon_slug: specData.identity?.auto_attack_icon_slug || "",
    canCrit: true,
    canMiss: !healing
  };
}

function compatibleCooldown(action, resourceType) {
  return action.resource === "none" || action.resource === resourceType;
}

export function createHeroDefinition({
  id,
  name,
  classMeta,
  specData,
  abilityData,
  level = 5,
  selectedCooldownIds = null,
  selectedUltimateId = null,
  selectedTalentNames = null,
  team = 0
}) {
  const talents = selectedTalentNames || defaultTalentNames(specData, level);
  const talentHooks = compileTalentHooks(specData, talents);
  const stats = buildStats(level, specData);
  const derived = buildDerived(stats, talentHooks);
  const resourceType = normalizeResource(specData.identity?.resource);

  const cooldownPool = (abilityData.cooldowns || []).filter(action => compatibleCooldown(action, resourceType));
  const requestedCooldownIds = Array.isArray(selectedCooldownIds)
    ? [...new Set(selectedCooldownIds.map(String))]
    : [];
  if (requestedCooldownIds.length !== 2) throw new Error("Hero combat loadout requires exactly two unique cooldown abilities.");
  const cooldowns = requestedCooldownIds.map(actionId => cooldownPool.find(action => action.id === actionId));
  if (cooldowns.some(action => !action)) throw new Error("Hero combat loadout references an unknown or incompatible cooldown ability.");

  const resolvedCooldowns = cooldowns.map(copyAction);
  const ultimates = (abilityData.ultimates || []).map(copyAction);
  const ultimate = ultimates.find(action => action.id === String(selectedUltimateId || "")) || null;
  if (!ultimate) throw new Error("Hero combat loadout references an unknown ultimate ability.");

  const maxResource =
    resourceType === "mana" ? derived.maxMana :
    resourceType === "energy" ? 100 :
    100;

  const resourceRegenPerSecond =
    resourceType === "mana" ? derived.manaRegenPerSecond :
    resourceType === "energy" ? 10 :
    0;

  return {
    id,
    name,
    kind: "hero",
    team,
    level,
    classId: classMeta.id,
    className: classMeta.label,
    specId: classMeta.specs.find(s => s.label === specData.specialization)?.id || specData.specialization.toLowerCase(),
    specName: specData.specialization,
    stats,
    derived,
    resourceType,
    maxResource,
    resourceRegenPerSecond,
    auto: autoAction(specData),
    resolvedCooldowns,
    ultimate,
    combatLoadout: {
      autoAttackId: "auto",
      ability1Id: resolvedCooldowns[0]?.id || null,
      ability2Id: resolvedCooldowns[1]?.id || null,
      ultimateId: ultimate?.id || null
    },
    selectedTalents: talents,
    talentHooks
  };
}

export function createEnemyDefinition(partySize = 1) {
  const raid = partySize >= 3;
  const maxHealth = raid ? 22_000 : 6_500;
  const physicalPower = raid ? 350 : 180;

  const cooldowns = raid ? [{
    id: "cleave",
    name: "Dungeon Cleave",
    kind: "damage",
    school: "physical",
    target: "all-enemies",
    power: 110,
    coefficient_bp: 6_000,
    cooldown_ticks: 360,
    resource: "none",
    cost: 0,
    effect: "none",
    canCrit: true,
    canMiss: true
  }] : [];

  return {
    id: "enemy-0",
    name: raid ? "Dungeon Captain" : "Training Raider",
    kind: "enemy",
    team: 1,
    level: raid ? 5 : 3,
    classId: "enemy",
    className: "Enemy",
    specId: "enemy",
    specName: raid ? "Dungeon" : "Training",
    stats: {
      spirit:0, stamina:0, strength:0, agility:0, intellect:0,
      crit:0, haste:0, spellPower:0, healingPower:0, hitRating:0, mastery:0
    },
    derived: {
      maxHealth,
      physicalPower,
      spellPower: physicalPower,
      healingPower: 0,
      maxMana: 0,
      manaRegenPerSecond: 0,
      critBp: raid ? 800 : 500,
      hitBp: 10_000,
      hasteBp: 0,
      masteryBp: 0
    },
    resourceType: "none",
    maxResource: 0,
    resourceRegenPerSecond: 0,
    auto: {
      id:"auto",
      name: raid ? "Captain's Strike" : "Training Strike",
      kind:"damage",
      school:"physical",
      target:"enemy",
      power: raid ? 150 : 70,
      coefficient_bp: raid ? 7_000 : 6_000,
      base_ticks: raid ? 120 : 150,
      resource:"none",
      cost:0,
      effect:"none",
      canCrit:true,
      canMiss:true
    },
    cooldowns,
    ultimate: null,
    selectedTalents: [],
    talentHooks: {
      autoOutputBp:0,
      autoHasteBp:0,
      autoCritBp:0,
      maxManaBp:0,
      resourceCostReductionBp:0,
      implemented:[],
      unimplemented:[]
    }
  };
}
