import { BP, DEFAULT_AUTO_TICKS, mulBp } from "./constants.js";
import { compileTalentHooks, defaultTalentNames } from "./talent-hooks.js";

const COMBAT_RATING_BASELINES = Object.freeze({
  1: Object.freeze({crit:0,haste:0,hit:0,mastery:0}),
  2: Object.freeze({crit:1,haste:1,hit:1,mastery:0}),
  3: Object.freeze({crit:2,haste:2,hit:2,mastery:1}),
  4: Object.freeze({crit:4,haste:4,hit:3,mastery:2}),
  5: Object.freeze({crit:6,haste:6,hit:4,mastery:4})
});
const PRIMARY_STAT_KEYS=Object.freeze(["strength","agility","intellect","stamina","spirit"]);

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
    icon_source: action.icon_source || "",
    icon_source_url: action.icon_source_url || "",
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

function buildBaseStats(level,classMeta){
  const resolvedLevel=Math.max(1,Math.min(5,Number(level)||1));
  const row=classMeta&&classMeta.base_stats&&classMeta.base_stats[String(resolvedLevel)];
  if(!row)throw new Error("Missing authored base stats for "+String(classMeta&&classMeta.id||"unknown")+" level "+resolvedLevel+".");
  const base={};
  for(const key of PRIMARY_STAT_KEYS){
    const value=Number(row[key]);
    if(!Number.isFinite(value))throw new Error("Invalid authored "+key+" for "+String(classMeta&&classMeta.id||"unknown")+" level "+resolvedLevel+".");
    base[key]=value;
  }
  return base;
}

function normalizeEquipmentStats(value){const source=value&&typeof value==="object"?value:{};const keys=["strength","agility","intellect","stamina","spirit","crit","haste","hitRating","mastery"];return Object.fromEntries(keys.map(key=>[key,Number(source[key])||0]));}

function buildStats(level,classMeta,specData,equipmentStats={}) {
  const baseStats=buildBaseStats(level,classMeta);
  const ratings=COMBAT_RATING_BASELINES[level] || COMBAT_RATING_BASELINES[5];
  const stats = {
    ...baseStats,
    crit: ratings.crit,
    haste: ratings.haste,
    spellPower: 0,
    healingPower: 0,
    hitRating: ratings.hit,
    mastery: ratings.mastery
  };

  const equipment=normalizeEquipmentStats(equipmentStats);
  Object.entries(equipment).forEach(([key,value])=>{if(Object.prototype.hasOwnProperty.call(stats,key))stats[key]+=value;});

  const role = String(specData.identity?.role || "").toLowerCase();
  if (role.includes("spell") || role.includes("shadow") || role.includes("elemental")) {
    stats.spellPower = level * 3;
  }
  if (role.includes("heal") || role.includes("support")) {
    stats.healingPower = level * 3;
  }

  return {baseStats,equipmentStats:equipment,stats};
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

function autoAction(specData,classMeta) {
  const text = String(specData.identity?.auto_attack || "Auto Attack");
  const specLabel=String(specData.specialization||"").toLowerCase();
  const specMeta=(classMeta.specs||[]).find(spec=>spec.id===specLabel||String(spec.label||"").toLowerCase()===specLabel);
  const iconSlug=String(specMeta?.auto_attack_icon_slug||specData.identity?.auto_attack_icon_slug||"");
  if(!iconSlug)throw new Error("Missing authored Auto Attack icon for "+classMeta.id+"/"+String(specMeta?.id||specData.specialization||"unknown")+".");
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
    icon_slug: iconSlug,
    icon_source: specMeta?.auto_attack_icon_source || "Wowhead CDN",
    icon_source_url: specMeta?.auto_attack_icon_source_url || ("https://wow.zamimg.com/images/wow/icons/large/"+iconSlug+".jpg"),
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
  equipmentStats = null,
  team = 0
}) {
  const talents = selectedTalentNames || defaultTalentNames(specData, level);
  const talentHooks = compileTalentHooks(specData, talents);
  const {baseStats,equipmentStats:resolvedEquipmentStats,stats} = buildStats(level, classMeta, specData, equipmentStats);
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
    baseStats,
    equipmentStats:resolvedEquipmentStats,
    stats,
    derived,
    resourceType,
    maxResource,
    resourceRegenPerSecond,
    auto: autoAction(specData,classMeta),
    cooldowns: resolvedCooldowns,
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
