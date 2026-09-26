// Data integrity: authored JSON under data/ references ids and files that exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { exists, readJson } from "./harness.mjs";

const classIndex = readJson("data/heroes/classes/index.json");
const raceIndex = readJson("data/heroes/races/index.json");
const classById = new Map(classIndex.classes.map(cls => [cls.id, cls]));
const classLabels = new Set(classIndex.classes.map(cls => cls.label));
const npcIds = new Set(readJson("data/npcs/catalog.json").npcs.map(npc => npc.id));
const pools = readJson("data/npcs/dungeon-pools.json").pools;
const poolIds = new Set(pools.map(pool => pool.id));
const unique = (values, label) => assert.equal(new Set(values).size, values.length, label);

test("every class has three specializations and an ability kit on disk", () => {
  assert.equal(classIndex.classes.length, 9);
  for (const cls of classIndex.classes) {
    const abilitiesPath = "data/heroes/classes/" + cls.abilities_path.replace("./", "");
    assert.ok(exists(abilitiesPath), abilitiesPath);
    const abilities = readJson(abilitiesPath);
    assert.equal(abilities.class, cls.label, abilitiesPath);
    assert.equal(cls.specs.length, 3, cls.id);
    for (const spec of cls.specs) {
      const specPath = "data/heroes/classes/" + spec.data_path.replace("./", "");
      const data = readJson(specPath);
      assert.equal(data.class, cls.label, specPath);
      assert.equal(data.specialization, spec.label, specPath);
      assert.equal(data.talents.tier_1.length, 2, specPath);
      assert.equal(data.talents.tier_2.length, 2, specPath);
      assert.equal(data.talents.capstones.length, 1, specPath);
      const capstone = data.talents.capstones[0].name;
      assert.ok(
        abilities.ultimates.some(ultimate => ultimate.capstone === capstone),
        `${cls.id}/${spec.id} capstone ${capstone} has an ultimate`
      );
    }
    for (const level of ["1", "2", "3", "4", "5"])
      assert.ok(cls.base_stats[level], cls.id + " L" + level);
  }
});

test("races offer only valid classes and respect faction-exclusive classes", () => {
  const factions = raceIndex.factions;
  const exclusive = { alliance: "Paladin", horde: "Shaman" };
  for (const [factionId, faction] of Object.entries(factions)) {
    assert.equal(faction.exclusive_class, exclusive[factionId]);
    const otherExclusive = exclusive[factionId === "alliance" ? "horde" : "alliance"];
    for (const race of faction.races) {
      for (const label of race.available_classes)
        assert.ok(classLabels.has(label), race.id + " " + label);
      assert.ok(
        !race.available_classes.includes(otherExclusive),
        race.id + " offers " + otherExclusive
      );
      assert.ok(race.racial && race.racial.name, race.id + " racial");
    }
  }
});

test("recruitment candidates are valid race/class combinations for their faction", () => {
  const recruitment = readJson("data/base/recruitment.json");
  for (const [factionId, candidates] of Object.entries(recruitment.factions)) {
    const races = new Map(raceIndex.factions[factionId].races.map(race => [race.label, race]));
    unique(
      candidates.map(c => c.id),
      factionId + " candidate ids"
    );
    for (const candidate of candidates) {
      const race = races.get(candidate.race);
      assert.ok(race, `${candidate.id} race ${candidate.race} belongs to ${factionId}`);
      assert.ok(race.available_classes.includes(candidate.classLabel), candidate.id);
      assert.ok(classById.has(candidate.classId), candidate.id);
    }
  }
});

test("dungeon NPC pools reference existing NPCs", () => {
  for (const pool of pools) {
    assert.ok(pool.npc_ids.length > 0, pool.id);
    for (const id of pool.npc_ids) assert.ok(npcIds.has(id), `${pool.id} -> ${id}`);
  }
  const dungeons = readJson("data/dungeons/catalog.json").dungeons;
  unique(
    dungeons.map(d => d.id),
    "dungeon ids"
  );
  for (const dungeon of dungeons) assert.ok(poolIds.has(dungeon.npc_pool_id), dungeon.id);
});

test("raid and siege encounters reference existing NPC pools", () => {
  for (const encounter of readJson("data/content/endgame-encounters.json").encounters) {
    assert.ok(poolIds.has(encounter.npc_pool_id), `${encounter.id} -> ${encounter.npc_pool_id}`);
    assert.ok([10, 20].includes(encounter.party_size), encounter.id);
  }
});

test("quest offers are unique and fit the Embark bar's party sizes", () => {
  const pool = readJson("data/base/quest-offers.json");
  unique(
    pool.offers.map(offer => offer.id),
    "quest offer ids"
  );
  assert.ok(pool.offer_count > 0 && pool.offer_count < pool.offers.length);
  assert.deepEqual([...new Set(pool.offers.map(offer => offer.party_size))].sort(), [1, 3, 5]);
  for (const offer of pool.offers.filter(offer => offer.encounter)) {
    assert.equal(offer.encounter.enemy_count, offer.party_size, offer.id);
  }
});

test("content tiers unlock in order from Base Level 1 to 5", () => {
  const content = readJson("data/content/progression.json").content;
  assert.deepEqual(
    content.map(entry => [entry.id, entry.unlock_base_level]),
    [
      ["quest", 1],
      ["incursion", 2],
      ["dungeon", 3],
      ["raid", 4],
      ["siege", 5]
    ]
  );
});

test("class hall has a trainer for every class", () => {
  const trainers = readJson("data/base/class-hall.json").trainers;
  assert.deepEqual(trainers.map(t => t.class_id).sort(), [...classById.keys()].sort());
});

test("profession tracks, buildings, and progression agree", () => {
  const index = readJson("data/base/profession-buildings/index.json");
  const progression = new Set(
    readJson("data/base/profession-buildings/progression.json").professions.map(p => p.id)
  );
  const buildings = new Set(readJson("data/base/buildings.json").buildings.map(b => b.id));
  assert.deepEqual(
    index.tracks.map(track => track.id),
    ["artisan", "gathering", "survival"]
  );
  for (const track of index.tracks) {
    assert.ok(buildings.has(track.building_id), track.id);
    const members = index.professions.filter(p => p.track === track.id).map(p => p.id);
    assert.deepEqual(members, track.professions, track.id + " membership");
  }
  for (const profession of index.professions) {
    assert.ok(progression.has(profession.progression_id), profession.id);
  }
});

test("every Base building has a map position in both faction layouts", () => {
  const variants = readJson("data/base/presentation.json").variants;
  for (const building of readJson("data/base/buildings.json").buildings) {
    for (const faction of ["alliance", "horde"]) {
      assert.ok(variants[faction].positions[building.id], `${faction} ${building.id}`);
    }
  }
});

test("party formation is the fixed 2 / 2 / 1 layout", () => {
  const party = readJson("data/combat/formations.json").party;
  assert.deepEqual(party.slot_order, [
    "rear-left",
    "rear-right",
    "middle-left",
    "middle-right",
    "front"
  ]);
  assert.deepEqual(
    party.slots.map(slot => slot.id),
    party.slot_order
  );
});
