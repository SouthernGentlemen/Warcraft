(function(global){
"use strict";
const Campaign=global.WarcraftCampaign;if(!Campaign)throw new Error("WarcraftCampaign must load before WarcraftProfessions.");
function getState(){return Campaign.getProfessionState();}
function getGuildLevel(){return getState().guildLevel;}
function save(patch){const next=Campaign.setProfessionState(patch);if(!save.queued){save.queued=true;queueMicrotask(()=>{save.queued=false;global.dispatchEvent(new CustomEvent("warcraft:professions-changed",{detail:getState()}));});}return next;}
function setGuildLevel(level){const next=Math.max(1,Math.min(5,Number(level)||1));if(next===getGuildLevel())return next;save({guildLevel:next});return next;}
function setActiveProfession(id){const next=id?String(id):null;if(next===getState().activeProfession)return next;save({activeProfession:next});return next;}
function clearActiveProfession(){if(getState().activeProfession==null)return;save({activeProfession:null});}
function reset(){save({guildLevel:1,activeProfession:null});}
if(typeof global.addEventListener==="function")global.addEventListener("warcraft:campaign-changed",event=>{if(event&&event.detail&&event.detail.reason==="faction")global.dispatchEvent(new CustomEvent("warcraft:professions-changed",{detail:getState()}));});
global.WarcraftProfessions=Object.freeze({getState,getGuildLevel,setGuildLevel,setActiveProfession,clearActiveProfession,reset});
})(window);
