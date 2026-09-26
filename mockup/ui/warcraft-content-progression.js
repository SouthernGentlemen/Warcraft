(function(global){
"use strict";
let catalog=null;
function clampLevel(value){return Math.max(1,Math.min(5,Math.trunc(Number(value)||1)));}
function configure(data){if(!data||data.kind!=="tiered_content_progression"||!Array.isArray(data.content))throw new Error("Invalid content progression catalog.");catalog=data;return api;}
function requireCatalog(){if(!catalog)throw new Error("Content progression catalog is not configured.");return catalog;}
function definition(id){return requireCatalog().content.find(entry=>entry.id===String(id))||null;}
function state(id,baseLevel){const def=definition(id);if(!def)return null;const level=clampLevel(baseLevel),automation=def.automation_base_level;return {id:def.id,baseLevel:level,available:level>=def.unlock_base_level,manual:Boolean(def.manual)&&level>=def.unlock_base_level,automated:automation!=null&&level>=automation,autoRun:Boolean(def.auto_run)&&automation!=null&&level>=automation,heroXp:Math.max(0,Math.trunc(def.hero_xp||0)),party:def.party};}
function available(baseLevel){return requireCatalog().content.map(entry=>state(entry.id,baseLevel)).filter(entry=>entry.available);}
function heroXp(id){const def=definition(id);return def?Math.max(0,Math.trunc(def.hero_xp||0)):0;}
const api={configure,definition,state,available,heroXp,getCatalog:()=>catalog};
global.WarcraftContentProgression=api;
})(window);
