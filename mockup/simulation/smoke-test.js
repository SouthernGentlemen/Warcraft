import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FPS } from "./engine/constants.js";
import { CombatSimulation, hexHash } from "./engine/combat-sim.js";
import { createEnemyDefinition, createHeroDefinition } from "./engine/hero-factory.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const DATA_ROOT = join(ROOT, "data", "heroes", "classes");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const index = await readJson(join(DATA_ROOT, "index.json"));

async function hero(classId, specId, id) {
  const classMeta = index.classes.find(item => item.id === classId);
  if (!classMeta) throw new Error("Missing class " + classId);
  const specMeta = classMeta.specs.find(item => item.id === specId);
  if (!specMeta) throw new Error("Missing spec " + classId + "/" + specId);

  const specData = await readJson(join(DATA_ROOT, classId, "specs", specId + ".json"));
  const abilityData = await readJson(join(DATA_ROOT, classId, "abilities", "README.json"));

  return createHeroDefinition({
    id,
    name: classMeta.label + " " + specMeta.label,
    classMeta,
    specData,
    abilityData,
    level: 5,
    team: 0
  });
}

function runTwice(actors, seed, maxFrames) {
  const first = new CombatSimulation({ actors, seed }).run(maxFrames);
  const second = new CombatSimulation({ actors, seed }).run(maxFrames);

  if (first.summary.finalHash !== second.summary.finalHash) {
    throw new Error("Final state hash mismatch");
  }
  if (first.summary.logHash !== second.summary.logHash) {
    throw new Error("Combat log hash mismatch");
  }
  return first;
}

const oneActors = [
  await hero("warrior", "arms", "hero-0"),
  createEnemyDefinition(1)
];
const one = runTwice(oneActors, 0x5eed, FPS * 90);

const threeActors = [
  await hero("warrior", "protection", "hero-0"),
  await hero("priest", "holy", "hero-1"),
  await hero("mage", "fire", "hero-2"),
  createEnemyDefinition(3)
];
const three = runTwice(threeActors, 0x5eed, FPS * 90);

console.log("1-person:", {
  ticks: one.summary.ticks,
  winnerTeam: one.summary.winnerTeam,
  stateHash: hexHash(one.summary.finalHash),
  logHash: hexHash(one.summary.logHash)
});
console.log("3-person:", {
  ticks: three.summary.ticks,
  winnerTeam: three.summary.winnerTeam,
  stateHash: hexHash(three.summary.finalHash),
  logHash: hexHash(three.summary.logHash)
});
console.log("determinism: MATCH");
