(function(global){
"use strict";
const Campaign=global.WarcraftCampaign;
const Roster=global.WarcraftRoster;
const Assignments=global.WarcraftAssignmentSlots;
if(!Campaign||!Roster||!Assignments)throw new Error("WarcraftCampaign, WarcraftRoster, and WarcraftAssignmentSlots must load before WarcraftProfessions.");
const TRACK_IDS=Object.freeze(["artisan","gathering","survival"]);
let catalog=null;
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function normalizeTrack(value){const id=String(value||"").toLowerCase();if(!TRACK_IDS.includes(id))throw new Error("Profession track must be artisan, gathering, or survival.");return id;}
function emptyHeroProfessions(){return {artisan:null,gathering:null,survival:null};}
function normalizeHeroProfessions(value){const source=value&&typeof value==="object"?value:{};return {artisan:source.artisan?String(source.artisan):null,gathering:source.gathering?String(source.gathering):null,survival:source.survival?String(source.survival):null};}
function validateCatalog(payload){
  if(!payload||!Array.isArray(payload.tracks)||!Array.isArray(payload.professions))throw new Error("Profession catalog requires tracks and professions.");
  const trackIds=payload.tracks.map(track=>String(track.id));if(JSON.stringify(trackIds)!==JSON.stringify(TRACK_IDS))throw new Error("Profession catalog must define artisan, gathering, survival tracks in order.");
  const professionIds=payload.professions.map(entry=>String(entry.id));if(new Set(professionIds).size!==professionIds.length)throw new Error("Profession IDs must be unique.");
  payload.tracks.forEach(track=>{if(Number(track.assignment_slots)!==3||track.training_rule!=="replace_same_track")throw new Error(track.id+" track requires three future assignment slots and replace_same_track training.");});
  payload.professions.forEach(entry=>{if(!TRACK_IDS.includes(entry.track)||!entry.owner_building||!entry.icon_key)throw new Error("Invalid profession metadata for "+entry.id);const track=payload.tracks.find(row=>row.id===entry.track);if(!track||track.building_id!==entry.owner_building||!track.professions.includes(entry.id))throw new Error("Profession track/building mismatch for "+entry.id);});
  return payload;
}
function completionHandlerForTrack(trackRow){
  return function(assignment,hero){
    const professionId=assignment.selectedProfessionId;
    const meta=profession(professionId);
    if(!meta||meta.track!==trackRow.id||meta.owner_building!==trackRow.building_id)throw new Error("Assigned profession does not belong to "+trackRow.building_label+".");
    const before=getHeroProfessions(hero.id),after=setHeroProfession(hero.id,trackRow.id,meta.id);
    return{type:"profession_training_complete",trackId:trackRow.id,professionId:meta.id,previousProfessionId:before[trackRow.id],selectedAction:assignment.selectedAction,selections:after};
  };
}
function configure(payload){
  catalog=validateCatalog(clone(payload));
  catalog.tracks.forEach(trackRow=>Assignments.registerCompletionHandler(trackRow.building_id,completionHandlerForTrack(trackRow)));
  return catalog;
}
function getState(){return Campaign.getProfessionState();}
function getGuildLevel(){return getState().guildLevel;}
function save(patch){const next=Campaign.setProfessionState(patch);if(!save.queued){save.queued=true;queueMicrotask(()=>{save.queued=false;if(typeof global.dispatchEvent==="function"&&typeof global.CustomEvent==="function")global.dispatchEvent(new CustomEvent("warcraft:professions-changed",{detail:getState()}));});}return next;}
function setGuildLevel(level){const next=Math.max(1,Math.min(5,Number(level)||1));if(next===getGuildLevel())return next;save({guildLevel:next});return next;}
function track(id){if(!catalog)return null;const key=normalizeTrack(id);return catalog.tracks.find(entry=>entry.id===key)||null;}
function professionsForTrack(id){const row=track(id);return row?row.professions.map(professionId=>catalog.professions.find(entry=>entry.id===professionId)).filter(Boolean).map(clone):[];}
function profession(id){if(!catalog)return null;return catalog.professions.find(entry=>entry.id===String(id))||null;}
function trackForBuilding(buildingId){if(!catalog)return null;return catalog.tracks.find(entry=>entry.building_id===String(buildingId))||null;}
function getTrackLevel(id){const row=track(id);if(!row)return 1;return Campaign.getBuildingLevel(row.building_id,1);}
function getActiveTrack(){const value=getState().activeTrack||"artisan";return TRACK_IDS.includes(value)?value:"artisan";}
function setActiveTrack(id){const next=normalizeTrack(id);if(next===getActiveTrack())return next;save({activeTrack:next});return next;}
function setActiveProfession(id){const next=id?String(id):null;if(next){const meta=profession(next);if(!meta)throw new Error("Unknown profession "+next+".");setActiveTrack(meta.track);}if(next===getState().activeProfession)return next;save({activeProfession:next});return next;}
function clearActiveProfession(){if(getState().activeProfession==null)return;save({activeProfession:null});}
function getHeroProfessions(heroId){Campaign.validateHeroIds([heroId]);return normalizeHeroProfessions(Campaign.getProfessionSelections()[String(heroId)]);}
function setHeroProfession(heroId,trackId,professionId){
  if(!catalog)throw new Error("Profession catalog is not configured.");
  const key=normalizeTrack(trackId),meta=profession(professionId);if(!meta)throw new Error("Unknown profession "+professionId+".");if(meta.track!==key)throw new Error(meta.label+" is not a "+key+" profession.");
  Campaign.validateHeroIds([heroId]);const current=getHeroProfessions(heroId),next=Object.assign({},current,{[key]:meta.id});Campaign.setProfessionSelection(String(heroId),next);
  if(typeof global.dispatchEvent==="function"&&typeof global.CustomEvent==="function")global.dispatchEvent(new CustomEvent("warcraft:professions-changed",{detail:{heroId:String(heroId),track:key,professionId:meta.id,selections:next}}));
  return next;
}
function clearHeroProfession(heroId,trackId){const key=normalizeTrack(trackId);Campaign.validateHeroIds([heroId]);const current=getHeroProfessions(heroId),next=Object.assign({},current,{[key]:null});Campaign.setProfessionSelection(String(heroId),next);return next;}
function startProfessionTraining(buildingId,indexValue){
  if(!catalog)throw new Error("Profession catalog is not configured.");
  const trackRow=trackForBuilding(buildingId);if(!trackRow)throw new Error("Unknown profession building "+buildingId+".");
  const assignment=Assignments.assignmentAt(trackRow.building_id,indexValue);if(!assignment)throw new Error("Assign a hero before starting profession training.");
  const hero=Roster.hero(assignment.heroId);if(!hero)throw new Error("Assigned profession hero is missing.");
  const meta=profession(assignment.selectedProfessionId);if(!meta||meta.track!==trackRow.id||meta.owner_building!==trackRow.building_id)throw new Error("Choose a valid "+trackRow.label+" profession before training.");
  Assignments.updateSelection(trackRow.building_id,indexValue,{selectedAction:"learn-profession",selectedProfessionId:meta.id,trackId:trackRow.id});
  return Assignments.start(trackRow.building_id,indexValue,{selectedAction:"learn-profession",selectedProfessionId:meta.id,trackId:trackRow.id});
}
function processAssignments(buildingId){const trackRow=trackForBuilding(buildingId);return trackRow?Assignments.processBuilding(trackRow.building_id):[];}
function reset(){save({guildLevel:1,activeTrack:"artisan",activeProfession:null});}
if(typeof global.addEventListener==="function")global.addEventListener("warcraft:campaign-changed",event=>{if(event&&event.detail&&event.detail.reason==="faction"&&typeof global.dispatchEvent==="function"&&typeof global.CustomEvent==="function")global.dispatchEvent(new CustomEvent("warcraft:professions-changed",{detail:getState()}));});
global.WarcraftProfessions=Object.freeze({TRACK_IDS,configure,getState,getGuildLevel,setGuildLevel,track,trackForBuilding,professionsForTrack,profession,getTrackLevel,getActiveTrack,setActiveTrack,setActiveProfession,clearActiveProfession,getHeroProfessions,setHeroProfession,clearHeroProfession,startProfessionTraining,processAssignments,emptyHeroProfessions,reset});
})(window);
