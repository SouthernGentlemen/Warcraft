(function(global){
"use strict";

const STORAGE_KEY="warcraft.mockup.campaigns.v2";
const LEGACY_ROSTER_KEY="warcraft.mockup.roster.v1";
const LEGACY_PROFESSIONS_KEY="warcraft.mockup.professions.v1";
const FACTIONS=Object.freeze(["alliance","horde"]);
const DEFAULT_RESOURCES=Object.freeze({gold:25430,lumber:12680,stone:8440});

function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function factionId(value){const next=String(value||"").toLowerCase();return FACTIONS.includes(next)?next:"alliance";}
function clampLevel(value){return Math.max(1,Math.min(5,Number(value)||1));}
function defaultQuestBoard(){return {round:1,seed:"questboard-v1",offerIds:[]};}
function defaultClock(){return {day:1,phase:"day",phaseAdvances:0};}
function emptyCampaign(faction){
  return {
    faction,
    base:{
      level:1,
      buildingLevels:{},
      resources:Object.assign({},DEFAULT_RESOURCES),
      bankHoldings:{}
    },
    heroes:[],
    formations:{party:[],raid:[],siege:[]},
    questBoard:defaultQuestBoard(),
    quests:[],
    pendingEncounter:null,
    dungeonRuns:[],
    embark:{active:null,history:[]},
    profession:{guildLevel:1,activeProfession:null},
    professionSelections:{},
    buildingAssignments:{},
    clock:defaultClock()
  };
}
function defaults(){
  return {
    version:2,
    activeFaction:"alliance",
    campaigns:{alliance:emptyCampaign("alliance"),horde:emptyCampaign("horde")},
    migration:{completed:false,source:null,targetFaction:null}
  };
}
function readStorage(key){
  try{
    const value=global.localStorage&&global.localStorage.getItem(key);
    return value?JSON.parse(value):null;
  }catch(_){return null;}
}
function normalizeResources(raw){
  const next=Object.assign({},DEFAULT_RESOURCES,raw&&typeof raw==="object"?raw:{});
  Object.keys(DEFAULT_RESOURCES).forEach(key=>{next[key]=Math.max(0,Number(next[key])||0);});
  return next;
}
function normalizeCampaign(raw,faction){
  const source=raw&&typeof raw==="object"?raw:{};
  const baseSource=source.base&&typeof source.base==="object"?source.base:{};
  const formationSource=source.formations&&typeof source.formations==="object"?source.formations:{};
  const professionSource=source.profession&&typeof source.profession==="object"?source.profession:{};
  const clockSource=source.clock&&typeof source.clock==="object"?source.clock:{};
  const buildingLevels={};
  Object.entries(baseSource.buildingLevels||source.buildingLevels||{}).forEach(([id,level])=>{buildingLevels[String(id)]=clampLevel(level);});
  const keepLevel=clampLevel(buildingLevels.keep||baseSource.level||source.baseLevel||1);
  if(Object.prototype.hasOwnProperty.call(buildingLevels,"keep"))buildingLevels.keep=keepLevel;
  const bankHoldings={};
  Object.entries(baseSource.bankHoldings||source.bankHoldings||{}).forEach(([id,quantity])=>{bankHoldings[String(id)]=Math.max(0,Number(quantity)||0);});
  const board=source.questBoard&&typeof source.questBoard==="object"?source.questBoard:{};
  const embark=source.embark&&typeof source.embark==="object"?source.embark:{};
  const phase=clockSource.phase==="night"?"night":"day";
  return {
    faction,
    base:{
      level:keepLevel,
      buildingLevels,
      resources:normalizeResources(baseSource.resources||source.resources),
      bankHoldings
    },
    heroes:Array.isArray(source.heroes)?clone(source.heroes):[],
    formations:{
      party:Array.isArray(formationSource.party)?clone(formationSource.party):Array.isArray(source.loadouts)?clone(source.loadouts):[],
      raid:Array.isArray(formationSource.raid)?clone(formationSource.raid):[],
      siege:Array.isArray(formationSource.siege)?clone(formationSource.siege):[]
    },
    questBoard:{
      round:Math.max(1,Number(board.round)||1),
      seed:String(board.seed||"questboard-v1"),
      offerIds:[...new Set((Array.isArray(board.offerIds)?board.offerIds:[]).map(String))]
    },
    quests:Array.isArray(source.quests)?clone(source.quests):[],
    pendingEncounter:source.pendingEncounter&&typeof source.pendingEncounter==="object"?clone(source.pendingEncounter):null,
    dungeonRuns:Array.isArray(source.dungeonRuns)?clone(source.dungeonRuns).slice(-50):[],
    embark:{
      active:embark.active&&typeof embark.active==="object"?clone(embark.active):null,
      history:Array.isArray(embark.history)?clone(embark.history):[]
    },
    profession:{
      guildLevel:clampLevel(professionSource.guildLevel),
      activeProfession:professionSource.activeProfession?String(professionSource.activeProfession):null
    },
    professionSelections:source.professionSelections&&typeof source.professionSelections==="object"?clone(source.professionSelections):{},
    buildingAssignments:source.buildingAssignments&&typeof source.buildingAssignments==="object"?clone(source.buildingAssignments):{},
    clock:{
      day:Math.max(1,Number(clockSource.day)||1),
      phase,
      phaseAdvances:Math.max(0,Number(clockSource.phaseAdvances)||0)
    }
  };
}
function normalizeState(raw){
  const base=defaults();
  const source=raw&&typeof raw==="object"?raw:{};
  base.activeFaction=factionId(source.activeFaction);
  base.campaigns.alliance=normalizeCampaign(source.campaigns&&source.campaigns.alliance,"alliance");
  base.campaigns.horde=normalizeCampaign(source.campaigns&&source.campaigns.horde,"horde");
  const migration=source.migration&&typeof source.migration==="object"?source.migration:{};
  base.migration={
    completed:Boolean(migration.completed),
    source:migration.source?String(migration.source):null,
    targetFaction:migration.targetFaction?factionId(migration.targetFaction):null
  };
  return base;
}
function migrateLegacy(){
  const legacyRoster=readStorage(LEGACY_ROSTER_KEY);
  const legacyProfessions=readStorage(LEGACY_PROFESSIONS_KEY);
  if(!legacyRoster&&!legacyProfessions)return defaults();
  const next=defaults();
  const target=factionId(legacyRoster&&legacyRoster.faction);
  next.activeFaction=target;
  const campaign=next.campaigns[target];
  if(legacyRoster&&typeof legacyRoster==="object"){
    campaign.heroes=Array.isArray(legacyRoster.heroes)?clone(legacyRoster.heroes):[];
    campaign.formations.party=Array.isArray(legacyRoster.loadouts)?clone(legacyRoster.loadouts):[];
    campaign.questBoard=legacyRoster.questBoard&&typeof legacyRoster.questBoard==="object"?clone(legacyRoster.questBoard):defaultQuestBoard();
    campaign.quests=Array.isArray(legacyRoster.quests)?clone(legacyRoster.quests):[];
    campaign.pendingEncounter=legacyRoster.pendingEncounter&&typeof legacyRoster.pendingEncounter==="object"?clone(legacyRoster.pendingEncounter):null;
    campaign.dungeonRuns=Array.isArray(legacyRoster.dungeonRuns)?clone(legacyRoster.dungeonRuns):[];
  }
  if(legacyProfessions&&typeof legacyProfessions==="object"){
    campaign.profession.guildLevel=clampLevel(legacyProfessions.guildLevel);
    campaign.profession.activeProfession=legacyProfessions.activeProfession?String(legacyProfessions.activeProfession):null;
  }
  next.migration={completed:true,source:legacyRoster?LEGACY_ROSTER_KEY:LEGACY_PROFESSIONS_KEY,targetFaction:target};
  return normalizeState(next);
}
function load(){
  const current=readStorage(STORAGE_KEY);
  return current?normalizeState(current):migrateLegacy();
}
let state=load();

function persist(){
  try{global.localStorage&&global.localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}
}
function detail(reason){
  return {reason:String(reason||"campaign"),activeFaction:state.activeFaction,campaign:getActiveCampaign()};
}
function emit(reason){
  if(typeof global.dispatchEvent!=="function"||typeof global.CustomEvent!=="function")return;
  global.dispatchEvent(new global.CustomEvent("warcraft:campaign-changed",{detail:detail(reason)}));
}
function commit(reason){
  state=normalizeState(state);
  persist();
  emit(reason||"campaign");
  return getActiveCampaign();
}
function getState(){return state;}
function getMigration(){return state.migration;}
function getActiveFaction(){return state.activeFaction;}
function getCampaign(faction){return state.campaigns[factionId(faction)];}
function getActiveCampaign(){return getCampaign(state.activeFaction);}
function setActiveFaction(faction){
  const next=factionId(faction);
  if(next===state.activeFaction)return next;
  state.activeFaction=next;
  persist();
  emit("faction");
  return next;
}
function ensureBase(buildings){
  let changed=false;
  for(const faction of FACTIONS){
    const campaign=getCampaign(faction);
    (buildings||[]).forEach(building=>{
      if(!building||!building.id)return;
      if(!Object.prototype.hasOwnProperty.call(campaign.base.buildingLevels,building.id)){
        campaign.base.buildingLevels[building.id]=clampLevel(building.level);
        changed=true;
      }
    });
    if(Object.prototype.hasOwnProperty.call(campaign.base.buildingLevels,"keep")){
      const keep=clampLevel(campaign.base.buildingLevels.keep);
      if(campaign.base.level!==keep){campaign.base.level=keep;changed=true;}
    }
  }
  if(changed){persist();emit("base-init");}
  return getActiveCampaign().base;
}
function getBaseLevel(faction){return getCampaign(faction||state.activeFaction).base.level;}
function getBuildingLevels(faction){return getCampaign(faction||state.activeFaction).base.buildingLevels;}
function getBuildingLevel(id,fallback,faction){
  const levels=getBuildingLevels(faction);
  return Object.prototype.hasOwnProperty.call(levels,id)?clampLevel(levels[id]):clampLevel(fallback);
}
function getResources(faction){return getCampaign(faction||state.activeFaction).base.resources;}
function applyBaseUpgrade(buildingId,nextLevel,cost){
  const campaign=getActiveCampaign();
  const id=String(buildingId);
  const current=getBuildingLevel(id,1);
  const next=clampLevel(nextLevel);
  if(next!==current+1)throw new Error("Invalid building level transition.");
  const prices=cost&&typeof cost==="object"?cost:{};
  for(const [key,value] of Object.entries(prices)){
    if((campaign.base.resources[key]||0)<Number(value||0))throw new Error("Insufficient "+key+".");
  }
  for(const [key,value] of Object.entries(prices))campaign.base.resources[key]=(campaign.base.resources[key]||0)-Number(value||0);
  campaign.base.buildingLevels[id]=next;
  if(id==="keep")campaign.base.level=next;
  commit("base");
  return next;
}
function ensureBankHoldings(holdings){
  let changed=false;
  for(const faction of FACTIONS){
    const bank=getCampaign(faction).base.bankHoldings;
    (holdings||[]).forEach(item=>{
      if(!item||!item.id)return;
      if(!Object.prototype.hasOwnProperty.call(bank,item.id)){bank[item.id]=Math.max(0,Number(item.quantity)||0);changed=true;}
    });
  }
  if(changed){persist();emit("bank-init");}
  return getActiveCampaign().base.bankHoldings;
}
function getBankHoldings(faction){return getCampaign(faction||state.activeFaction).base.bankHoldings;}
function getBankHoldingQuantity(id,faction){return Math.max(0,Number(getBankHoldings(faction)[id])||0);}
function setBankHoldingQuantity(id,quantity){
  getActiveCampaign().base.bankHoldings[String(id)]=Math.max(0,Number(quantity)||0);
  commit("bank");
  return getBankHoldingQuantity(id);
}
function getProfessionState(faction){return getCampaign(faction||state.activeFaction).profession;}
function setProfessionState(patch){
  const current=getActiveCampaign().profession;
  const next=patch&&typeof patch==="object"?patch:{};
  if(next.guildLevel!=null)current.guildLevel=clampLevel(next.guildLevel);
  if(Object.prototype.hasOwnProperty.call(next,"activeProfession"))current.activeProfession=next.activeProfession?String(next.activeProfession):null;
  commit("profession");
  return current;
}
function getFormations(kind,faction){
  const key=["party","raid","siege"].includes(kind)?kind:"party";
  return getCampaign(faction||state.activeFaction).formations[key];
}
function getProfessionSelections(faction){return getCampaign(faction||state.activeFaction).professionSelections;}
function getBuildingAssignments(faction){return getCampaign(faction||state.activeFaction).buildingAssignments;}
function getClock(faction){return getCampaign(faction||state.activeFaction).clock;}
function advanceClock(){
  const clock=getActiveCampaign().clock;
  clock.phase=clock.phase==="day"?"night":"day";
  clock.phaseAdvances+=1;
  if(clock.phase==="day")clock.day+=1;
  commit("clock");
  return clock;
}
function reset(){
  state=defaults();
  persist();
  emit("reset");
  return state;
}

persist();

global.WarcraftCampaign=Object.freeze({
  STORAGE_KEY,FACTIONS,DEFAULT_RESOURCES,
  getState,getMigration,getActiveFaction,setActiveFaction,getCampaign,getActiveCampaign,commit,
  ensureBase,getBaseLevel,getBuildingLevels,getBuildingLevel,getResources,applyBaseUpgrade,
  ensureBankHoldings,getBankHoldings,getBankHoldingQuantity,setBankHoldingQuantity,
  getProfessionState,setProfessionState,getFormations,getProfessionSelections,getBuildingAssignments,getClock,advanceClock,reset
});
})(window);
