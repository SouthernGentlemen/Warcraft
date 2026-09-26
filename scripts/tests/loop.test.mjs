// Page-level player loop: every page boots, and Embark / Quest Board / Raids & Sieges hand off
// to a Battle that runs to completion and records its result.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage, PAGES, createBrowser, readJson } from "./harness.mjs";

const PARTY = ["mage", "warrior", "priest", "druid", "hunter"];

async function boot(page, storage, search = "") {
  const browser = createBrowser({ page, storage, search });
  await browser.boot();
  return browser;
}

function modules(storage) {
  const browser = createBrowser({ storage }).loadShared("base");
  return { Campaign: browser.window.WarcraftCampaign, Roster: browser.window.WarcraftRoster };
}

function upgradeKeep(Campaign, level) {
  for (let next = Campaign.getBaseLevel() + 1; next <= level; next += 1) {
    Campaign.applyBaseUpgrade("keep", next, {});
  }
}

async function runBattle(storage, kind, timerLimit = 10_000) {
  const battle = await boot("battle", storage, "?encounter=" + kind);
  assert.deepEqual(battle.errors, []);
  await battle.runTimers(timerLimit);
  assert.deepEqual(battle.errors, []);
  assert.equal(battle.element("battleStatus").textContent, "Encounter complete");
  return battle.window.WarcraftRoster.getPendingEncounter();
}

function dispatchSoloQuest(storage, heroId) {
  const { Roster } = modules(storage);
  const offer = readJson("data/base/quest-offers.json").offers.find(o => o.party_size === 1);
  Roster.setQuestBoardOffers([offer.id]);
  const assignment = Roster.dispatchQuest(offer, [heroId]);
  Roster.setPendingEncounter({
    kind: "quest",
    encounterName: offer.title,
    questOfferId: offer.id,
    questAssignmentId: assignment.id,
    questRound: assignment.round,
    npcPoolId: "dungeon-the-stockade",
    partySize: 1,
    enemyCount: 1,
    heroIds: [heroId],
    faction: "alliance",
    seed: 42,
    source: "questboard"
  });
  return assignment;
}

function questStatus(storage, assignment) {
  return modules(storage)
    .Roster.getState()
    .quests.find(q => q.id === assignment.id).status;
}

for (const page of PAGES) {
  test(`${page}.html boots without errors or failed requests`, async () => {
    const browser = await boot(page, new MemoryStorage());
    assert.deepEqual(browser.errors, []);
    assert.deepEqual(
      browser.fetchLog.filter(entry => !entry.ok),
      []
    );
    const shownErrors = [...browser.window.document.elementsById]
      .filter(([id, el]) => /(error|toast)$/i.test(id) && String(el.textContent || "").trim())
      .map(([id, el]) => id + ": " + el.textContent);
    assert.deepEqual(shownErrors, [], "no init error is shown on the page");
  });
}

test("Battle runs the default encounter to completion", async () => {
  await runBattle(new MemoryStorage(), "quest");
});

test("Quest Board dispatch hands a quest to Battle and records the outcome", async () => {
  const storage = new MemoryStorage();
  const assignment = dispatchSoloQuest(storage, "mage");
  const encounter = await runBattle(storage, "quest");
  assert.equal(
    questStatus(storage, assignment),
    encounter.result.victory ? "completed" : "available"
  );
});

test("a stalemated battle ends as a defeat at the time limit", async () => {
  const storage = new MemoryStorage();
  const assignment = dispatchSoloQuest(storage, "priest"); // Holy priest vs one NPC never ends
  const encounter = await runBattle(storage, "quest", 5_000);
  assert.equal(encounter.result.victory, false);
  assert.equal(questStatus(storage, assignment), "available");
});

function embarkBar(storage) {
  const browser = createBrowser({ storage }).loadShared("base");
  const root = browser.window.document.createElement("section");
  const data = {
    progression: readJson("data/content/progression.json"),
    dungeons: readJson("data/dungeons/catalog.json"),
    questOffers: readJson("data/base/quest-offers.json")
  };
  return browser.window.WarcraftEmbarkBar.mount(root, data, { navigate: () => {} });
}

function fillParty(bar, heroIds) {
  heroIds.slice(0, bar.selected().partySize).forEach((heroId, index) => bar.place(heroId, index));
}

test("the Embark bar launches a Quest from a fresh save", async () => {
  const storage = new MemoryStorage();
  const bar = embarkBar(storage);
  const quest = bar.options().find(option => option.kind === "quest");
  assert.ok(quest, "a fresh save offers at least one quest");
  bar.select(quest.key);
  fillParty(bar, PARTY);
  assert.match(bar.embark().href, /battle\.html\?encounter=quest/);
  const encounter = await runBattle(storage, "quest");
  assert.equal(typeof encounter.result.victory, "boolean");
});

test("the Embark bar launches an Incursion at Base Level 2", async () => {
  const storage = new MemoryStorage();
  upgradeKeep(modules(storage).Campaign, 2);
  const bar = embarkBar(storage);
  bar.select("incursion:frontier-incursion");
  fillParty(bar, PARTY);
  bar.embark();
  assert.equal(
    modules(storage).Campaign.getClock().phaseAdvances,
    1,
    "Embark advances the clock once"
  );
  const encounter = await runBattle(storage, "incursion");
  assert.equal(typeof encounter.result.victory, "boolean");
});

test("the Embark bar launches a Dungeon with a saved party at Base Level 3", async () => {
  const storage = new MemoryStorage();
  const { Campaign, Roster } = modules(storage);
  upgradeKeep(Campaign, 3);
  Roster.updateLoadout(0, { heroIds: PARTY, ready: true });
  const bar = embarkBar(storage);
  bar.select("dungeon:the-stockade");
  bar.loadParty(Roster.getState().loadouts[0].id);
  assert.deepEqual(Array.from(bar.slots()), PARTY);
  bar.embark();
  const encounter = await runBattle(storage, "dungeon");
  assert.equal(encounter.formation.type, "party");
});

test("the Embark bar only accepts available heroes", () => {
  const bar = embarkBar(new MemoryStorage());
  assert.throws(() => bar.place("paladin", 0), /not available/);
});

test("Raids & Sieges launches a ten-hero Raid at Base Level 4", async () => {
  const storage = new MemoryStorage();
  const { Campaign, Roster } = modules(storage);
  upgradeKeep(Campaign, 4);
  for (const candidate of readJson("data/base/recruitment.json").factions.alliance) {
    Roster.recruitHero(Object.assign({}, candidate, { faction: "Alliance", level: 1 }));
  }
  const available = Roster.getState().heroes.filter(h => h.availability === "available");
  Roster.updateLoadout(0, { heroIds: available.slice(0, 5).map(h => h.id), ready: true });
  Roster.updateLoadout(1, { heroIds: available.slice(5, 10).map(h => h.id), ready: true });
  const parties = Roster.getState().loadouts;
  Roster.setRaidGroupParty(0, "group-a", parties[0].id);
  Roster.setRaidGroupParty(0, "group-b", parties[1].id);
  Roster.updateRaidLoadout(0, { ready: true });
  const endgame = await boot("endgame", storage);
  endgame.element("endgameEncounters").children[0].onclick();
  endgame.element("launchEndgame").onclick();
  assert.equal(endgame.element("endgameError").textContent, "");
  const encounter = await runBattle(storage, "raid");
  assert.equal(encounter.partySize, 10);
});

// Opens one Base building and records every element the page creates, so a test can check
// that the roster sidecar's rows are the only drag sources (no building lists heroes itself).
async function bootBuilding(storage, building) {
  const browser = createBrowser({ page: "base", storage, search: "?building=" + building });
  const make = browser.window.document.createElement;
  const created = [];
  browser.window.document.createElement = tag => {
    const element = make(tag);
    created.push(element);
    return element;
  };
  await browser.boot();
  assert.deepEqual(browser.errors, []);
  const dragSources = created.filter(element => element.draggable === true);
  assert.ok(dragSources.length > 0);
  assert.ok(
    dragSources.every(element => element.className.startsWith("roster-sidecar__hero")),
    building + " renders no hero list of its own"
  );
  return browser;
}

function drop(target, heroId) {
  target.dispatchEvent({
    type: "drop",
    preventDefault() {},
    dataTransfer: { getData: type => (type === "text/warcraft-hero-id" ? heroId : "") }
  });
}

const descendants = node => [node, ...(node.children || []).flatMap(descendants)];
const click = (node, label) =>
  descendants(node)
    .find(element => element.textContent === label)
    .dispatchEvent({ type: "click" });
const sidecarRow = (browser, heroId) =>
  browser.element("rosterSidecarList").children.find(row => row.dataset.heroId === heroId);
const embarkQuest = Campaign =>
  Campaign.confirmEmbark({ kind: "quest", contentId: "test", heroIds: ["mage"] });

test("the Class Hall trains and releases heroes dragged from the roster sidecar", async () => {
  const storage = new MemoryStorage();
  const { Campaign, Roster } = modules(storage);
  upgradeKeep(Campaign, 3);
  for (let i = 0; i < 7; i += 1) Roster.awardHeroXp(["priest"], "dungeon");
  const base = await bootBuilding(storage, "classhall");
  const { WarcraftAssignmentSlots: Slots, WarcraftCampaign: LiveCampaign } = base.window;
  const slots = () => base.element("classHallAssignmentBoard").children;
  assert.equal(slots().length, 3);

  drop(slots()[1], "hunter");
  assert.equal(Slots.assignmentAt("classhall", 1).heroId, "hunter");
  click(slots()[1], "Remove");
  assert.equal(Slots.assignmentAt("classhall", 1), null);

  drop(slots()[0], "priest");
  click(slots()[0], "Start Level Training");
  assert.equal(Slots.assignmentAt("classhall", 0).status, "training");
  assert.equal(sidecarRow(base, "priest").draggable, false, "training heroes cannot be dragged");
  embarkQuest(LiveCampaign);
  embarkQuest(LiveCampaign);
  assert.equal(base.window.WarcraftRoster.hero("priest").level, 3);
});

test("Quest Board automation takes heroes dragged from the roster sidecar", async () => {
  const locked = await bootBuilding(new MemoryStorage(), "questboard");
  assert.equal(locked.element("questAutomationSlots").children.length, 0, "locked at Base Level 1");

  const storage = new MemoryStorage();
  upgradeKeep(modules(storage).Campaign, 2);
  const base = await bootBuilding(storage, "questboard");
  const { WarcraftRoster: Roster, WarcraftCampaign: Campaign } = base.window;
  const slots = () => base.element("questAutomationSlots").children;
  assert.equal(slots().length, 3);

  drop(slots()[1], "druid");
  assert.equal(Roster.hero("druid").availability, "assigned");
  assert.equal(base.element("buildingStatus").textContent, "", "no message after a drop");
  slots()[1].dispatchEvent({ type: "click" });
  assert.equal(Roster.hero("druid").availability, "available", "clicking a filled slot recalls");

  const xp = Roster.getHeroProgress("hunter").xp;
  drop(slots()[0], "hunter");
  assert.equal(sidecarRow(base, "hunter").draggable, false, "questing heroes cannot be dragged");
  embarkQuest(Campaign);
  embarkQuest(Campaign);
  assert.equal(Roster.hero("hunter").availability, "available");
  assert.equal(Roster.getHeroProgress("hunter").xp, xp + 1, "an automated quest grants Quest XP");
});

const upgrade = base => base.element("buildingUpgrade").onclick();

function discoveryLimit(level) {
  const hall = readJson("data/base/buildings.json").buildings.find(b => b.id === "recruitment");
  return hall.progression.find(step => step.level === level).recruitment.discovery_limit;
}

test("every Base building opens a modal with its one function and an upgrade button", async () => {
  const buildings = readJson("data/base/buildings.json").buildings;
  const expected = {
    keep: ["keepUnlocks", readJson("data/content/progression.json").content.length],
    recruitment: ["recruitmentCandidates", discoveryLimit(1)],
    questboard: ["questAutomationSlots", 0],
    storehouse: ["storageGrid", readJson("data/items/reagents/holdings.json").items.length],
    bank: ["storageGrid", readJson("data/items/economy/holdings.json").holdings.length],
    armory: ["storageGrid", null],
    classhall: ["classHallAssignmentBoard", 3],
    artisans: ["professionAssignmentBoard", 3],
    "gathering-camp": ["professionAssignmentBoard", 3],
    "survival-lodge": ["professionAssignmentBoard", 3]
  };
  assert.deepEqual(buildings.map(b => b.id).sort(), Object.keys(expected).sort());
  for (const { id } of buildings) {
    const base = await bootBuilding(new MemoryStorage(), id);
    const [container, count] = expected[id];
    assert.equal(base.window.WowUIModal.isOpen(), true, id);
    assert.equal(
      base.element(container).children.length,
      count ?? base.window.WarcraftEquipment.owned().length,
      id
    );
    assert.equal(base.element("buildingUpgrade").textContent, "Upgrade", id);
    assert.equal(
      base.element("buildingUpgrade").getAttribute("aria-disabled"),
      id === "keep" ? "false" : "true",
      id + ": only the Keep can outgrow the Keep"
    );
  }
});

test("building modals recruit heroes and upgrade their building", async () => {
  const storage = new MemoryStorage();
  const hall = await bootBuilding(storage, "recruitment");
  const { WarcraftRoster: Roster, WarcraftCampaign: Campaign } = hall.window;
  const heroes = Roster.getState().heroes.length;
  click(hall.element("recruitmentCandidates"), "Recruit");
  assert.equal(Roster.getState().heroes.length, heroes + 1);
  upgrade(hall);
  assert.equal(Campaign.getBuildingLevel("recruitment"), 1, "the Keep gates other upgrades");

  const keep = await bootBuilding(storage, "keep");
  const locked = () =>
    keep.element("keepUnlocks").children.filter(chip => chip.className.includes("is-locked"));
  assert.equal(locked().length, 4, "Base Level 1 unlocks Quests only");
  for (let level = 2; level <= 5; level += 1) upgrade(keep);
  assert.equal(keep.window.WarcraftCampaign.getBaseLevel(), 5);
  assert.equal(locked().length, 0);
  assert.equal(keep.element("buildingUpgrade").textContent, "Max level");

  const upgraded = await bootBuilding(storage, "recruitment");
  upgrade(upgraded);
  assert.equal(upgraded.window.WarcraftCampaign.getBuildingLevel("recruitment"), 2);
  assert.equal(
    upgraded.element("recruitmentCandidates").children.length,
    discoveryLimit(2),
    "an upgrade reveals more candidates"
  );
});

test("profession buildings train heroes dragged into their modal", async () => {
  const storage = new MemoryStorage();
  const base = await bootBuilding(storage, "gathering-camp");
  const { WarcraftProfessions: Professions, WarcraftCampaign: Campaign } = base.window;
  const slots = () => base.element("professionAssignmentBoard").children;
  drop(slots()[0], "hunter");
  click(slots()[0], "Begin Training");
  embarkQuest(Campaign);
  embarkQuest(Campaign);
  const gathering = readJson("data/base/profession-buildings/index.json").tracks.find(
    track => track.id === "gathering"
  );
  assert.equal(Professions.getHeroProfessions("hunter").gathering, gathering.professions[0]);
});
