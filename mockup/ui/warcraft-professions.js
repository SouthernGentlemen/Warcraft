(function(global){
"use strict";
const STORAGE_KEY="warcraft.mockup.professions.v1";
function defaults(){return {guildLevel:1,activeProfession:null};}
function normalize(raw){const next=Object.assign(defaults(),raw&&typeof raw==="object"?raw:{});next.guildLevel=Math.max(1,Math.min(5,Number(next.guildLevel)||1));next.activeProfession=next.activeProfession?String(next.activeProfession):null;return next;}
function load(){try{return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"));}catch(_){return defaults();}}
let state=load();
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){}if(!save.queued){save.queued=true;queueMicrotask(()=>{save.queued=false;global.dispatchEvent(new CustomEvent("warcraft:professions-changed",{detail:getState()}));});}}
function getState(){return state;}
function getGuildLevel(){return state.guildLevel;}
function setGuildLevel(level){const next=Math.max(1,Math.min(5,Number(level)||1));if(next<state.guildLevel)return state.guildLevel;if(next===state.guildLevel)return state.guildLevel;state.guildLevel=next;save();return state.guildLevel;}
function setActiveProfession(id){state.activeProfession=String(id);save();return state.activeProfession;}
function clearActiveProfession(){if(state.activeProfession==null)return;state.activeProfession=null;save();}
function reset(){state=defaults();save();}
global.WarcraftProfessions=Object.freeze({getState,getGuildLevel,setGuildLevel,setActiveProfession,clearActiveProfession,reset});
})(window);
