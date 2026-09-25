(function(global){
"use strict";
const Campaign=global.WarcraftCampaign;
const Roster=global.WarcraftRoster;
if(!Campaign||!Roster)throw new Error("WarcraftCampaign and WarcraftRoster must load before WarcraftClassHall.");
const BUILDING_ID="classhall";
let config=null;
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function slotCount(){return config?Number(config.assignment_slots)||3:3;}
function durationPhases(){return config&&config.training_duration?Math.max(1,Number(config.training_duration.campaign_phases)||2):2;}
function validateConfig(payload){
  if(!payload||payload.kind!=="class_hall"||payload.owner_building!==BUILDING_ID)throw new Error("Class Hall data must target classhall.");
  if(Number(payload.assignment_slots)!==3)throw new Error("Class Hall requires exactly three assignment slots.");
  if(!payload.training_duration||Number(payload.training_duration.days)!==1||Number(payload.training_duration.campaign_phases)!==2)throw new Error("Class Hall training must last one full campaign day / two phases.");
  if(!Array.isArray(payload.trainers)||!payload.trainers.length)throw new Error("Class Hall trainer catalog is empty.");
  const trainerIds=payload.trainers.map(entry=>String(entry.id)),classIds=payload.trainers.map(entry=>String(entry.class_id));
  if(new Set(trainerIds).size!==trainerIds.length||new Set(classIds).size!==classIds.length)throw new Error("Class Hall trainers must have unique IDs and classes.");
  payload.trainers.forEach(entry=>{if(!entry.class_id||!Array.isArray(entry.factions)||!entry.factions.length)throw new Error("Class Hall trainer is missing faction metadata.");});
  return payload;
}
function configure(payload){config=validateConfig(clone(payload));processCompletions();return getState();}
function trainers(faction){if(!config)return[];const target=String(faction||Campaign.getActiveFaction()).toLowerCase();return config.trainers.filter(entry=>entry.factions.includes(target)).map(clone);}
function trainerForClass(classId,faction){return trainers(faction).find(entry=>entry.class_id===String(classId))||null;}
function blankState(){return{buildingId:BUILDING_ID,slots:Array.from({length:slotCount()},()=>null)};}
function normalizeState(raw){
  const source=raw&&typeof raw==="object"?raw:{},slots=Array.isArray(source.slots)?source.slots:[];
  return{buildingId:BUILDING_ID,slots:Array.from({length:slotCount()},(_,index)=>{const value=slots[index];if(!value||!value.heroId)return null;return Object.assign({buildingId:BUILDING_ID,slotIndex:index,status:"assigned",selectedAction:"talents"},clone(value),{buildingId:BUILDING_ID,slotIndex:index,heroId:String(value.heroId)});})};
}
function getState(){const raw=Campaign.getBuildingAssignments()[BUILDING_ID];return normalizeState(raw||blankState());}
function persist(next){Campaign.setBuildingAssignment(BUILDING_ID,normalizeState(next));return getState();}
function slotIndex(value){const index=Number(value);if(!Number.isInteger(index)||index<0||index>=slotCount())throw new Error("Class Hall slot must be 0, 1, or 2.");return index;}
function assignmentForHero(heroId){return getState().slots.find(entry=>entry&&entry.heroId===String(heroId))||null;}
function assignHero(indexValue,heroId){
  if(!config)throw new Error("Class Hall is not configured.");
  const index=slotIndex(indexValue),hero=Roster.hero(String(heroId));if(!hero)throw new Error("Unknown hero "+heroId+".");
  const trainer=trainerForClass(hero.classId);if(!trainer)throw new Error(hero.classLabel+" has no trainer for the active faction.");
  if(hero.availability!=="available")throw new Error(hero.name+" is not available for Class Hall assignment.");
  const state=getState(),existing=assignmentForHero(hero.id);
  if(existing&&existing.slotIndex!==index)throw new Error(hero.name+" is already assigned to Class Hall slot "+(existing.slotIndex+1)+".");
  if(state.slots[index]&&state.slots[index].status==="training")throw new Error("Training has already begun in this slot.");
  state.slots[index]={buildingId:BUILDING_ID,slotIndex:index,heroId:hero.id,trainerId:trainer.id,trainerClassId:trainer.class_id,selectedAction:"talents",status:"assigned",startDay:null,startPhase:null,startPhaseAdvance:null,remainingCampaignPhases:null};
  return persist(state);
}
function removeHero(indexValue){
  const index=slotIndex(indexValue),state=getState(),current=state.slots[index];
  if(current&&current.status==="training")throw new Error("A hero cannot leave Class Hall while level training is in progress.");
  state.slots[index]=null;return persist(state);
}
function startLevelTraining(indexValue){
  if(!config)throw new Error("Class Hall is not configured.");
  const index=slotIndex(indexValue),state=getState(),assignment=state.slots[index];
  if(!assignment)throw new Error("Assign a hero before starting Class Hall training.");
  if(assignment.status==="training")throw new Error("Level training is already in progress.");
  const hero=Roster.hero(assignment.heroId);if(!hero)throw new Error("Assigned Class Hall hero is missing.");
  const trainer=trainerForClass(hero.classId);if(!trainer||trainer.id!==assignment.trainerId)throw new Error(hero.classLabel+" does not match an active-faction Class Hall trainer.");
  const progress=Roster.getHeroProgress(hero.id);if(!progress||!progress.canTrain){if(progress&&progress.baseBlocked)throw new Error("Base Level "+progress.baseLevel+" cannot train "+hero.name+" to level "+progress.nextLevel+".");throw new Error(hero.name+" must be 20 / 20 XP before Class Hall level training.");}
  const clock=Campaign.getClock();
  state.slots[index]=Object.assign({},assignment,{trainerId:trainer.id,trainerClassId:trainer.class_id,selectedAction:"level-up",status:"training",startDay:clock.day,startPhase:clock.phase,startPhaseAdvance:clock.phaseAdvances,remainingCampaignPhases:durationPhases()});
  persist(state);
  Roster.updateHero(hero.id,{availability:"training"});
  return getState().slots[index];
}
function remainingPhases(assignment){
  if(!assignment||assignment.status!=="training")return null;
  const start=Math.max(0,Number(assignment.startPhaseAdvance)||0),elapsed=Math.max(0,Campaign.getClock().phaseAdvances-start);
  return Math.max(0,durationPhases()-elapsed);
}
function processCompletions(){
  if(!config)return[];
  const state=getState(),events=[];let changed=false;
  state.slots.forEach((assignment,index)=>{
    if(!assignment||assignment.status!=="training")return;
    const remaining=remainingPhases(assignment);
    assignment.remainingCampaignPhases=remaining;
    if(remaining>0)return;
    const hero=Roster.hero(assignment.heroId);
    if(!hero){state.slots[index]=null;changed=true;return;}
    try{
      const before=hero.level,progress=Roster.completeHeroLevelTraining(hero.id,{source:"classhall"});
      Roster.updateHero(hero.id,{availability:"available"});
      state.slots[index]=null;changed=true;
      events.push({type:"class_hall_level_complete",heroId:hero.id,heroName:hero.name,fromLevel:before,toLevel:progress.level,slotIndex:index});
    }catch(error){
      assignment.status="blocked";assignment.error=error.message;changed=true;
      if(hero.availability==="training")Roster.updateHero(hero.id,{availability:"available"});
    }
  });
  if(changed)persist(state);
  return events;
}
function openTalentsHref(heroId){if(!Roster.hero(String(heroId)))throw new Error("Unknown hero "+heroId+".");return "./heroes.html?hero="+encodeURIComponent(String(heroId))+"&tab=talents";}
function assignmentView(indexValue){const index=slotIndex(indexValue),assignment=getState().slots[index];if(!assignment)return null;return Object.assign({},assignment,{remainingCampaignPhases:remainingPhases(assignment)});}
if(typeof global.addEventListener==="function")global.addEventListener("warcraft:campaign-changed",event=>{if(event&&event.detail&&event.detail.reason==="clock")processCompletions();});
global.WarcraftClassHall=Object.freeze({BUILDING_ID,configure,trainers,trainerForClass,getState,assignmentForHero,assignHero,removeHero,startLevelTraining,remainingPhases,processCompletions,openTalentsHref,assignmentView});
})(window);
