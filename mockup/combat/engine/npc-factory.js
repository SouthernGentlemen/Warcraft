function copyNpcAction(action, isAuto = false) {
  return {
    id:String(action.id),
    name:String(action.name),
    kind:String(action.kind || "damage"),
    school:String(action.school || "physical"),
    target:String(action.target || "enemy"),
    power:Math.trunc(action.power || 0),
    coefficient_bp:Math.trunc(action.coefficient_bp || 0),
    cooldown_ticks:isAuto ? 0 : Math.trunc(action.cooldown_ticks || 0),
    base_ticks:isAuto ? Math.max(1,Math.trunc(action.base_ticks || 120)) : undefined,
    resource:String(action.resource || "none"),
    cost:Math.trunc(action.cost || 0),
    effect:String(action.effect || "none"),
    canCrit:Boolean(action.can_crit ?? action.canCrit ?? true),
    canMiss:Boolean(action.can_miss ?? action.canMiss ?? true)
  };
}

export function createNpcDefinition(record, team = 1) {
  if (!record || !record.id || !record.combat || !record.auto_attack) {
    throw new Error("Invalid NPC combat record.");
  }

  const combat=record.combat;
  const maxHealth=Math.max(1,Math.trunc(combat.max_health || 1));
  const physicalPower=Math.max(0,Math.trunc(combat.physical_power || 0));
  const spellPower=Math.max(0,Math.trunc(combat.spell_power || 0));
  const healingPower=Math.max(0,Math.trunc(combat.healing_power || 0));

  return {
    id:String(record.id),
    name:String(record.name),
    kind:"npc",
    family:String(record.family || "unknown"),
    npcType:String(record.type || "enemy"),
    team,
    level:Math.max(1,Math.trunc(record.level || 1)),
    tier:Math.max(1,Math.trunc(record.tier || 1)),
    classId:"npc",
    className:String(record.family || "NPC"),
    specId:String(record.type || "enemy"),
    specName:String(record.type || "Enemy"),
    stats:{
      spirit:0,stamina:0,strength:0,agility:0,intellect:0,
      crit:0,haste:0,spellPower:0,healingPower:0,hitRating:0,mastery:0
    },
    derived:{
      maxHealth,
      physicalPower,
      spellPower,
      healingPower,
      maxMana:0,
      manaRegenPerSecond:0,
      critBp:Math.max(0,Math.trunc(combat.crit_bp || 0)),
      hitBp:Math.max(0,Math.trunc(combat.hit_bp || 10_000)),
      hasteBp:Math.max(0,Math.trunc(combat.haste_bp || 0)),
      masteryBp:Math.max(0,Math.trunc(combat.mastery_bp || 0))
    },
    resourceType:"none",
    maxResource:0,
    resourceRegenPerSecond:0,
    auto:copyNpcAction(record.auto_attack,true),
    cooldowns:(record.abilities || []).map(action=>copyNpcAction(action,false)),
    ultimate:null,
    selectedTalents:[],
    talentHooks:{
      autoOutputBp:0,
      autoHasteBp:0,
      autoCritBp:0,
      maxManaBp:0,
      resourceCostReductionBp:0,
      implemented:[],
      unimplemented:[]
    },
    dungeonIds:[...(record.dungeon_ids || [])],
    poolIds:[...(record.pool_ids || [])]
  };
}

export function resolveNpcPoolDefinitions({catalog,pools,poolId,team=1}) {
  if (!catalog || !Array.isArray(catalog.npcs)) throw new Error("NPC catalog is required.");
  if (!pools || !Array.isArray(pools.pools)) throw new Error("NPC pools are required.");
  const pool=pools.pools.find(entry=>entry.id===poolId);
  if (!pool) throw new Error("Unknown NPC pool: "+poolId);
  const byId=new Map(catalog.npcs.map(record=>[record.id,record]));
  return (pool.npc_ids || []).map(id=>{
    const record=byId.get(id);
    if (!record) throw new Error("NPC pool "+poolId+" references unknown NPC "+id);
    return createNpcDefinition(record,team);
  });
}
