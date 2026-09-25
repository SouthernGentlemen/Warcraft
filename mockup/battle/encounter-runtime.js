import { CombatSimulation } from "../combat/engine/combat-sim.js";
import { createHeroDefinition } from "../combat/engine/hero-factory.js";
import { resolveNpcPoolDefinitions } from "../combat/engine/npc-factory.js";

export const SUPPORTED_PARTY_SIZES = Object.freeze([1,3,5,10,20]);
const CLASS_DATA_ROOT = "../../data/heroes/classes/";
const NPC_CATALOG_ROOT = "../../data/npcs/catalog.json";
const NPC_POOLS_ROOT = "../../data/npcs/dungeon-pools.json";
const CLASS_INDEX_ROOT = CLASS_DATA_ROOT + "index.json";

function integer(value,fallback=0){const next=Number(value);return Number.isFinite(next)?Math.trunc(next):fallback;}
async function fetchJson(path){
  const response=await fetch(path);
  if(!response.ok)throw new Error("Could not load "+path);
  return response.json();
}
function normalizeSpecId(value){return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-");}
function heroFaction(hero){return String(hero.faction||"").toLowerCase();}
function uniqueIds(ids){return [...new Set((ids||[]).map(String))];}

export function validatePartySize(size){
  const next=integer(size);
  if(!SUPPORTED_PARTY_SIZES.includes(next))throw new Error("Unsupported party size: "+size+". Expected 1, 3, 5, 10, or 20.");
  return next;
}

export function validateEncounterHandoff(encounter,roster){
  if(!encounter||typeof encounter!=="object")throw new Error("Battle encounter configuration is required.");
  const loadout=encounter.loadoutId&&roster.getState().loadouts.find(entry=>entry.id===encounter.loadoutId);
  const heroIds=uniqueIds(encounter.heroIds&&encounter.heroIds.length?encounter.heroIds:(loadout?loadout.heroIds:[]));
  const partySize=validatePartySize(encounter.partySize||(loadout&&loadout.size)||heroIds.length);
  if(heroIds.length!==partySize)throw new Error("Encounter requires exactly "+partySize+" unique heroes.");
  const heroes=heroIds.map(id=>roster.hero(id));
  if(heroes.some(hero=>!hero))throw new Error("Encounter references an unknown roster hero.");
  const assignment=encounter.questAssignmentId&&roster.getState().quests.find(quest=>quest.id===encounter.questAssignmentId&&quest.status==="active");
  const committed=new Set(assignment&&assignment.heroIds||[]);
  const unavailable=heroes.filter(hero=>hero.availability!=="available"&&!(assignment&&committed.has(hero.id)));
  if(unavailable.length)throw new Error("Every battle hero must be available.");
  if(!encounter.npcPoolId)throw new Error("Encounter requires an NPC pool.");
  return Object.assign({},encounter,{partySize,heroIds,seed:integer(encounter.seed,0x5eed)});
}

async function heroDefinition(hero,classIndex,team=0){
  const classMeta=classIndex.classes.find(entry=>entry.id===hero.classId);
  if(!classMeta)throw new Error("Unknown hero class: "+hero.classId);
  const wantedSpec=normalizeSpecId(hero.talentBuild&&hero.talentBuild.primarySpec||hero.spec);
  const specMeta=classMeta.specs.find(entry=>entry.id===wantedSpec||normalizeSpecId(entry.label)===wantedSpec)||classMeta.specs[0];
  if(!specMeta)throw new Error("No specialization data for "+hero.classId);

  const [specData,abilityData]=await Promise.all([
    fetchJson(CLASS_DATA_ROOT+specMeta.data_path.replace("./","")),
    fetchJson(CLASS_DATA_ROOT+(classMeta.abilities_path||("./"+classMeta.id+"/abilities/README.json")).replace("./",""))
  ]);

  return Object.assign(createHeroDefinition({
    id:hero.id,
    name:hero.name,
    classMeta,
    specData,
    abilityData,
    level:Math.max(1,integer(hero.level,1)),
    selectedCooldownIds:[hero.combatLoadout.ability1Id,hero.combatLoadout.ability2Id],
    selectedUltimateId:hero.combatLoadout.ultimateId,
    selectedTalentNames:Array.isArray(hero.talentBuild&&hero.talentBuild.picks)?hero.talentBuild.picks:null,
    team
  }),{
    race:hero.race,
    faction:hero.faction,
    availability:hero.availability
  });
}

export function expandNpcGroup(poolEnemies,count){
  if(!poolEnemies.length)return [];
  const total=Math.max(1,integer(count,poolEnemies.length));
  return Array.from({length:total},(_,index)=>{
    const template=poolEnemies[index%poolEnemies.length];
    const cycle=Math.floor(index/poolEnemies.length)+1;
    if(cycle===1)return Object.assign({},template,{sourceNpcId:template.id,encounterInstance:index+1});
    return Object.assign({},template,{
      id:template.id+"-instance-"+cycle,
      name:template.name+" #"+cycle,
      sourceNpcId:template.id,
      encounterInstance:index+1
    });
  });
}

export async function resolveEncounter({encounter,roster}){
  const config=validateEncounterHandoff(encounter,roster);
  const [classIndex,npcCatalog,npcPools]=await Promise.all([
    fetchJson(CLASS_INDEX_ROOT),
    fetchJson(NPC_CATALOG_ROOT),
    fetchJson(NPC_POOLS_ROOT)
  ]);
  const heroes=await Promise.all(config.heroIds.map(id=>heroDefinition(roster.hero(id),classIndex,0)));
  const poolEnemies=resolveNpcPoolDefinitions({catalog:npcCatalog,pools:npcPools,poolId:config.npcPoolId,team:1});
  const enemyCount=Math.max(1,integer(config.enemyCount,poolEnemies.length));
  const enemies=expandNpcGroup(poolEnemies,enemyCount);
  if(!enemies.length)throw new Error("NPC pool is empty: "+config.npcPoolId);
  return {
    config,
    heroes,
    enemies,
    actors:[...heroes,...enemies],
    sources:Object.freeze({players:"WarcraftRoster",enemies:"data/npcs/catalog.json"})
  };
}

export class BattleEncounterRuntime{
  constructor({actors,config,onComplete=null}){
    this.actors=actors;
    this.config=Object.assign({},config,{partySize:validatePartySize(config.partySize)});
    this.onComplete=typeof onComplete==="function"?onComplete:null;
    this.paused=false;
    this.completed=false;
    this.rewardHookFired=false;
    this.reset();
  }
  reset(){
    this.simulation=new CombatSimulation({actors:this.actors,seed:this.config.seed});
    this.paused=false;
    this.completed=false;
    this.rewardHookFired=false;
    return this.snapshot();
  }
  setPaused(paused){this.paused=Boolean(paused);return this.paused;}
  step(ticks=1){
    if(this.paused||this.completed)return {frames:[],events:[],snapshot:this.snapshot(),completed:this.completed};
    const frames=[];
    const count=Math.max(1,integer(ticks,1));
    for(let index=0;index<count&&!this.completed;index+=1){
      const frame=this.simulation.step();
      frames.push(frame);
      if(this.simulation.getState().roundOver){
        this.completed=true;
        this.fireCompletionHook();
      }
    }
    return {frames,events:frames.flatMap(frame=>frame.events),snapshot:this.snapshot(),completed:this.completed};
  }
  fireCompletionHook(){
    if(this.rewardHookFired)return;
    this.rewardHookFired=true;
    if(this.onComplete)this.onComplete(this.result());
  }
  snapshot(){
    const simulationState=this.simulation.getState();
    return {
      frame:simulationState.frame,
      paused:this.paused,
      completed:this.completed,
      winnerTeam:simulationState.winnerTeam,
      actors:this.actors.map((definition,index)=>({
        definition,
        state:simulationState.actors[index],
        index
      }))
    };
  }
  result(){
    const state=this.simulation.getState();
    return {
      encounter:this.config,
      winnerTeam:state.winnerTeam,
      completed:Boolean(state.roundOver),
      frame:state.frame,
      rewardHook:"pending"
    };
  }
}
