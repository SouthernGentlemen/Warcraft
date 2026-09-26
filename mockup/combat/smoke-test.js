import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { FPS } from "./engine/constants.js";
import { CombatSimulation, hexHash } from "./engine/combat-sim.js";
import { createHeroDefinition } from "./engine/hero-factory.js";
import { resolveNpcPoolDefinitions } from "./engine/npc-factory.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const CLASS_ROOT = join(ROOT, "data", "heroes", "classes");
const NPC_ROOT = join(ROOT, "data", "npcs");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
const [index, npcCatalog, npcPools] = await Promise.all([
  readJson(join(CLASS_ROOT, "index.json")),
  readJson(join(NPC_ROOT, "catalog.json")),
  readJson(join(NPC_ROOT, "dungeon-pools.json"))
]);

async function hero(classId, specId, id) {
  const classMeta = index.classes.find(entry => entry.id === classId);
  const specMeta = classMeta && classMeta.specs.find(entry => entry.id === specId);
  if (!classMeta || !specMeta) throw new Error("Missing class/spec " + classId + "/" + specId);
  const [specData, abilityData] = await Promise.all([
    readJson(join(CLASS_ROOT, classId, "specs", specId + ".json")),
    readJson(join(CLASS_ROOT, classId, "abilities.json"))
  ]);
  const resource = String(specData.identity?.resource || "").toLowerCase();
  const resourceType = resource.includes("energy")
    ? "energy"
    : resource.includes("rage")
      ? "rage"
      : "mana";
  const compatible = (abilityData.cooldowns || []).filter(
    action => action.resource === "none" || action.resource === resourceType
  );
  const selectedCooldownIds = [compatible[0]?.id, compatible[1]?.id];
  const selectedUltimateId = (abilityData.ultimates || [])[0]?.id;
  return createHeroDefinition({
    id,
    name: classMeta.label + " " + specMeta.label,
    classMeta,
    specData,
    abilityData,
    level: 5,
    selectedCooldownIds,
    selectedUltimateId,
    team: 0
  });
}

function runTwice(actors, seed, maxFrames) {
  const first = new CombatSimulation({ actors, seed }).run(maxFrames);
  const second = new CombatSimulation({ actors, seed }).run(maxFrames);
  if (first.summary.finalHash !== second.summary.finalHash)
    throw new Error("Final state hash mismatch");
  if (first.summary.logHash !== second.summary.logHash) throw new Error("Combat log hash mismatch");
  return first;
}

const enemyPool = resolveNpcPoolDefinitions({
  catalog: npcCatalog,
  pools: npcPools,
  poolId: "dungeon-the-stockade",
  team: 1
});

const swingHero = await hero("warrior", "arms", "swing-hero");
const durableSwingHero = {
  ...swingHero,
  derived: { ...swingHero.derived, maxHealth: 1_000_000 }
};
const hastedSwingHero = {
  ...durableSwingHero,
  id: "hasted-swing-hero",
  derived: { ...durableSwingHero.derived, hasteBp: durableSwingHero.derived.hasteBp + 2_500 },
  talentHooks: {
    ...durableSwingHero.talentHooks,
    autoHasteBp: durableSwingHero.talentHooks.autoHasteBp + 1_500
  }
};
const baseSwingSim = new CombatSimulation({
  actors: [durableSwingHero, enemyPool[0]],
  seed: 0x670067
});
const hastedSwingSim = new CombatSimulation({
  actors: [hastedSwingHero, enemyPool[0]],
  seed: 0x670067
});
if (baseSwingSim.actionState(0).auto.progressBp !== 0)
  throw new Error("Swing timer must start at zero");
baseSwingSim.step();
hastedSwingSim.step();
const baseSwing = baseSwingSim.actionState(0).auto;
const hastedSwing = hastedSwingSim.actionState(0).auto;
if (!(baseSwing.progressBp > 0 && hastedSwing.progressBp > baseSwing.progressBp))
  throw new Error("Haste must accelerate swing progress");
if (!(hastedSwing.remainingTicks < baseSwing.remainingTicks))
  throw new Error("Haste must reduce remaining swing ticks");

const resetSwingSim = new CombatSimulation({
  actors: [durableSwingHero, enemyPool[0]],
  seed: 0x670068
});
let swingFired = false;
for (let frame = 0; frame < FPS * 10 && !swingFired; frame += 1) {
  const report = resetSwingSim.step();
  swingFired = report.events.some(
    event => event.type === "action_start" && event.actor === 0 && event.source === "auto"
  );
}
if (!swingFired) throw new Error("Auto Attack did not fire from swing threshold");
const resetSwing = resetSwingSim.actionState(0).auto;
if (!(resetSwing.progress < resetSwing.threshold && resetSwing.progressBp < 10_000))
  throw new Error("Swing timer did not reset when Auto Attack fired");

const one = runTwice([await hero("warrior", "arms", "hero-0"), ...enemyPool], 0x470047, FPS * 120);
const three = runTwice(
  [
    await hero("warrior", "protection", "hero-0"),
    await hero("priest", "holy", "hero-1"),
    await hero("mage", "fire", "hero-2"),
    ...enemyPool
  ],
  0x470047,
  FPS * 120
);

console.log("shared-combat 1-person:", {
  ticks: one.summary.ticks,
  winnerTeam: one.summary.winnerTeam,
  stateHash: hexHash(one.summary.finalHash),
  logHash: hexHash(one.summary.logHash)
});
console.log("shared-combat 3-person:", {
  ticks: three.summary.ticks,
  winnerTeam: three.summary.winnerTeam,
  stateHash: hexHash(three.summary.finalHash),
  logHash: hexHash(three.summary.logHash)
});
console.log("determinism: MATCH");
