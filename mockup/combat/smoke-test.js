import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FPS } from "./engine/constants.js";
import { CombatSimulation, hexHash } from "./engine/combat-sim.js";
import { createHeroDefinition } from "./engine/hero-factory.js";
import { resolveNpcPoolDefinitions } from "./engine/npc-factory.js";

const HERE=dirname(fileURLToPath(import.meta.url));
const ROOT=resolve(HERE,"../..");
const CLASS_ROOT=join(ROOT,"data","heroes","classes");
const NPC_ROOT=join(ROOT,"data","npcs");

async function readJson(path){return JSON.parse(await readFile(path,"utf8"));}
const [index,npcCatalog,npcPools]=await Promise.all([
  readJson(join(CLASS_ROOT,"index.json")),
  readJson(join(NPC_ROOT,"catalog.json")),
  readJson(join(NPC_ROOT,"dungeon-pools.json"))
]);

async function hero(classId,specId,id){
  const classMeta=index.classes.find(entry=>entry.id===classId);
  const specMeta=classMeta&&classMeta.specs.find(entry=>entry.id===specId);
  if(!classMeta||!specMeta)throw new Error("Missing class/spec "+classId+"/"+specId);
  const [specData,abilityData]=await Promise.all([
    readJson(join(CLASS_ROOT,classId,"specs",specId+".json")),
    readJson(join(CLASS_ROOT,classId,"abilities","README.json"))
  ]);
  return createHeroDefinition({id,name:classMeta.label+" "+specMeta.label,classMeta,specData,abilityData,level:5,team:0});
}

function runTwice(actors,seed,maxFrames){
  const first=new CombatSimulation({actors,seed}).run(maxFrames);
  const second=new CombatSimulation({actors,seed}).run(maxFrames);
  if(first.summary.finalHash!==second.summary.finalHash)throw new Error("Final state hash mismatch");
  if(first.summary.logHash!==second.summary.logHash)throw new Error("Combat log hash mismatch");
  return first;
}

const enemyPool=resolveNpcPoolDefinitions({catalog:npcCatalog,pools:npcPools,poolId:"dungeon-the-stockade",team:1});
const one=runTwice([await hero("warrior","arms","hero-0"),...enemyPool],0x470047,FPS*120);
const three=runTwice([
  await hero("warrior","protection","hero-0"),
  await hero("priest","holy","hero-1"),
  await hero("mage","fire","hero-2"),
  ...enemyPool
],0x470047,FPS*120);

console.log("shared-combat 1-person:",{ticks:one.summary.ticks,winnerTeam:one.summary.winnerTeam,stateHash:hexHash(one.summary.finalHash),logHash:hexHash(one.summary.logHash)});
console.log("shared-combat 3-person:",{ticks:three.summary.ticks,winnerTeam:three.summary.winnerTeam,stateHash:hexHash(three.summary.finalHash),logHash:hexHash(three.summary.logHash)});
console.log("determinism: MATCH");
