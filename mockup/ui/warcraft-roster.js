(function(global){
"use strict";
const STORAGE_KEY="warcraft.mockup.roster.v1";
const PARTY_SIZES=[3,5,10,20];
const DEFAULT_HEROES=[
{id:"mage",name:"Elowen",race:"Human",faction:"Alliance",classId:"mage",classLabel:"Mage",level:5,spec:"Fire",primary:"Intellect",availability:"available"},
{id:"rogue",name:"Valeera",race:"Undead",faction:"Horde",classId:"rogue",classLabel:"Rogue",level:4,spec:"Combat",primary:"Agility",availability:"available"},
{id:"warlock",name:"Mordren",race:"Undead",faction:"Horde",classId:"warlock",classLabel:"Warlock",level:3,spec:"Demonology",primary:"Intellect",availability:"on-quest"},
{id:"warrior",name:"Brom",race:"Dwarf",faction:"Alliance",classId:"warrior",classLabel:"Warrior",level:5,spec:"Arms",primary:"Strength",availability:"available"},
{id:"priest",name:"Sister Anwen",race:"Human",faction:"Alliance",classId:"priest",classLabel:"Priest",level:2,spec:"Holy",primary:"Intellect",availability:"available"},
{id:"druid",name:"Thorn",race:"Night Elf",faction:"Alliance",classId:"druid",classLabel:"Druid",level:4,spec:"Feral",primary:"Agility",availability:"available"},
{id:"hunter",name:"Rifleman Keg",race:"Dwarf",faction:"Alliance",classId:"hunter",classLabel:"Hunter",level:3,spec:"Marksmanship",primary:"Agility",availability:"available"},
{id:"paladin",name:"Arthoran",race:"Human",faction:"Alliance",classId:"paladin",classLabel:"Paladin",level:5,spec:"Retribution",primary:"Strength",availability:"on-quest"},
{id:"shaman",name:"Gorak",race:"Tauren",faction:"Horde",classId:"shaman",classLabel:"Shaman",level:1,spec:"Enhancement",primary:"Agility",availability:"available"}
];
function blankEquipment(){return {Head:null,Chest:null,Pants:null,Feet:null,Gloves:null,Weapon:null,Trinket:null};}
function defaults(){return {heroes:DEFAULT_HEROES.map(h=>Object.assign({},h,{equipment:blankEquipment(),talentBuild:{primarySpec:h.spec,picks:[]}})),loadouts:Array.from({length:5},(_,i)=>({id:"party-"+(i+1),name:"Party "+(i+1),size:3,heroIds:[],ready:false}))};}
function normalize(raw){const base=defaults(),saved=raw&&typeof raw==="object"?raw:{};const byId=new Map((saved.heroes||[]).map(h=>[h.id,h]));base.heroes=base.heroes.map(h=>{const s=byId.get(h.id)||{};return Object.assign({},h,s,{equipment:Object.assign(blankEquipment(),s.equipment||{}),talentBuild:Object.assign({},h.talentBuild,s.talentBuild||{})});});const ls=Array.isArray(saved.loadouts)?saved.loadouts:[];base.loadouts=base.loadouts.map((l,i)=>{const s=ls[i]||{};const size=PARTY_SIZES.includes(Number(s.size))?Number(s.size):3;return {id:l.id,name:String(s.name||l.name).slice(0,40),size,heroIds:[...new Set((s.heroIds||[]).filter(id=>base.heroes.some(h=>h.id===id)))].slice(0,size),ready:Boolean(s.ready)};});return base;}
function load(){try{return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"));}catch(_){return defaults();}}
let state=load();
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(_){} global.dispatchEvent(new CustomEvent("warcraft:roster-changed",{detail:getState()}));}
function getState(){return state;}
function hero(id){return state.heroes.find(h=>h.id===id)||null;}
function updateHero(id,patch){const h=hero(id);if(!h)return null;Object.assign(h,patch);save();return h;}
function setEquipment(id,equipment){const h=hero(id);if(!h)return;h.equipment=Object.assign(blankEquipment(),equipment||{});save();}
function setTalentBuild(id,build){const h=hero(id);if(!h)return;h.talentBuild=Object.assign({},h.talentBuild,build||{});if(build&&build.primarySpec)h.spec=build.primarySpec;save();}
function validateLoadout(loadout,checkAvailability){const ids=loadout.heroIds||[];const duplicate=new Set(ids).size!==ids.length;if(duplicate)return {valid:false,reason:"Duplicate heroes are not allowed."};if(ids.length!==loadout.size)return {valid:false,reason:"Requires exactly "+loadout.size+" heroes."};if(checkAvailability){const unavailable=ids.map(hero).filter(h=>!h||h.availability!=="available");if(unavailable.length)return {valid:false,reason:"Unavailable now: "+unavailable.map(h=>h?h.name:"Unknown hero").join(", ")};}return {valid:true,reason:"Ready"};}
function updateLoadout(index,patch){if(index<0||index>=5)return null;const current=state.loadouts[index];if(patch.size!=null&&!PARTY_SIZES.includes(Number(patch.size)))throw new Error("Party size must be 3, 5, 10, or 20.");const next=Object.assign({},current,patch);next.size=Number(next.size);next.heroIds=[...new Set(next.heroIds||[])].filter(id=>hero(id)).slice(0,next.size);if(next.ready&&!validateLoadout(next,false).valid)next.ready=false;state.loadouts[index]=next;save();return next;}
function reset(){state=defaults();save();}
global.WarcraftRoster=Object.freeze({PARTY_SIZES,getState,hero,updateHero,setEquipment,setTalentBuild,validateLoadout,updateLoadout,reset});
})(window);
