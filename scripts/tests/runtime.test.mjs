// Shared state modules (mockup/ui/*.js) exercised through the public window APIs the pages use.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MemoryStorage,
  createBrowser,
  plain,
  readJson,
  reload,
  sharedModules
} from "./harness.mjs";

const SLOT_ORDER = ["rear-left", "rear-right", "middle-left", "middle-right", "front"];
const PARTY = ["mage", "warrior", "priest", "druid", "hunter"];
const offers = readJson("data/base/quest-offers.json").offers;
const soloOffers = offers.filter(offer => offer.party_size === 1 && offer.min_board_level === 1);

function fresh() {
  const storage = new MemoryStorage();
  const win = sharedModules({ storage });
  return {
    storage,
    win,
    Campaign: win.WarcraftCampaign,
    Roster: win.WarcraftRoster,
    ClassHall: win.WarcraftClassHall,
    Slots: win.WarcraftAssignmentSlots,
    Professions: win.WarcraftProfessions,
    Rules: win.WarcraftEquipmentRules,
    Equipment: win.WarcraftEquipment
  };
}

function upgradeKeep(Campaign, level) {
  for (let next = Campaign.getBaseLevel() + 1; next <= level; next += 1) {
    Campaign.applyBaseUpgrade("keep", next, {});
  }
}

test("a fresh save seeds both faction campaigns with faction-owned heroes", () => {
  const { Campaign, Roster } = fresh();
  assert.equal(Campaign.getActiveFaction(), "alliance");
  assert.equal(Campaign.getBaseLevel(), 1);
  assert.equal(Roster.getRosterCapacity(), 10);
  const alliance = plain(Campaign.getCampaign("alliance").heroes);
  const horde = plain(Campaign.getCampaign("horde").heroes);
  assert.ok(alliance.length > 0 && horde.length > 0);
  assert.ok(alliance.every(hero => hero.faction === "Alliance"));
  assert.ok(horde.every(hero => hero.faction === "Horde"));
  const allianceIds = new Set(alliance.map(hero => hero.id));
  assert.ok(
    horde.every(hero => !allianceIds.has(hero.id)),
    "heroes never cross factions"
  );
});

test("switching faction swaps the active roster and survives reload", () => {
  const { storage, Campaign, Roster } = fresh();
  Roster.setFaction("horde");
  assert.equal(Campaign.getActiveFaction(), "horde");
  assert.ok(plain(Roster.getState().heroes).every(hero => hero.faction === "Horde"));
  const again = reload(storage);
  assert.equal(again.WarcraftCampaign.getActiveFaction(), "horde");
  assert.deepEqual(
    plain(again.WarcraftRoster.getState().heroes.map(hero => hero.id)),
    plain(Roster.getState().heroes.map(hero => hero.id))
  );
});

test("upgrading the Keep raises the Base Level and roster capacity", () => {
  const { Campaign, Roster } = fresh();
  upgradeKeep(Campaign, 2);
  assert.equal(Campaign.getBaseLevel(), 2);
  assert.equal(Roster.getRosterCapacity(), 20);
});

test("party loadouts use the fixed 2 / 2 / 1 formation", () => {
  const { Roster } = fresh();
  Roster.updateLoadout(0, { heroIds: PARTY, ready: true });
  const loadout = Roster.getState().loadouts[0];
  assert.equal(Roster.validateLoadout(loadout, true).valid, true);
  assert.deepEqual(plain(Roster.partyHeroIds(loadout)), PARTY);
  const formation = plain(Roster.partyFormation(loadout));
  assert.deepEqual(
    formation.slots.map(slot => slot.id),
    SLOT_ORDER
  );
  assert.deepEqual(
    formation.slots.map(slot => slot.heroId),
    PARTY
  );
});

test("quest board rounds dispatch, resolve, and advance, and survive reload", () => {
  const { storage, Roster } = fresh();
  const [first, second] = soloOffers;
  Roster.setQuestBoardOffers([first.id]);
  const assignment = Roster.dispatchQuest(first, ["priest"]);
  assert.equal(Roster.hero("priest").availability, "on-quest");
  assert.throws(() => Roster.transitionQuestRound([second.id]), "active quest blocks the round");

  const xpBefore = Roster.hero("priest").levelProgressXp;
  Roster.resolveQuestEncounter(assignment.id, true);
  const quest = Roster.getState().quests.find(entry => entry.id === assignment.id);
  assert.equal(quest.status, "completed");
  assert.equal(Roster.hero("priest").levelProgressXp, xpBefore + 1, "quest victory grants +1 XP");
  assert.equal(Roster.getQuestRoundStatus().resolved, true);

  Roster.transitionQuestRound([second.id]);
  assert.equal(Roster.getQuestBoardState().round, 2);
  assert.deepEqual(plain(Roster.getQuestBoardState().offerIds), [second.id]);
  const again = reload(storage).WarcraftRoster;
  assert.equal(again.getQuestBoardState().round, 2);
  assert.ok(again.getState().quests.some(entry => entry.id === assignment.id));
});

test("a defeated quest stays retryable and blocks the round", () => {
  const { Roster } = fresh();
  const [first, second] = soloOffers;
  Roster.setQuestBoardOffers([first.id]);
  const assignment = Roster.dispatchQuest(first, ["priest"]);
  Roster.resolveQuestEncounter(assignment.id, false);
  const quest = Roster.getState().quests.find(entry => entry.id === assignment.id);
  assert.equal(quest.status, "available");
  assert.equal(quest.lastResult, "defeat");
  assert.throws(() => Roster.transitionQuestRound([second.id]));
});

test("hero XP caps at 20 and never levels a hero past the Base Level", () => {
  const { Campaign, Roster } = fresh();
  for (let i = 0; i < 10; i += 1) Roster.awardHeroXp(["priest"], "dungeon");
  const capped = plain(Roster.getHeroProgress("priest"));
  assert.equal(capped.xp, 20);
  assert.equal(capped.readyToTrain, true);
  assert.equal(capped.canTrain, false, "level 2 hero cannot train to 3 at Base Level 1");
  upgradeKeep(Campaign, 3);
  assert.equal(Roster.getHeroProgress("priest").canTrain, true);
});

test("Class Hall training levels a ready hero after one campaign day", () => {
  const { Campaign, Roster, ClassHall, Slots } = fresh();
  ClassHall.configure(readJson("data/base/class-hall.json"));
  upgradeKeep(Campaign, 3);
  for (let i = 0; i < 7; i += 1) Roster.awardHeroXp(["priest"], "dungeon");
  Slots.assign("classhall", 0, "priest");
  ClassHall.startLevelTraining(0);
  for (let phase = 0; phase < 2; phase += 1) {
    Campaign.confirmEmbark({
      kind: "quest",
      contentId: "test",
      heroIds: ["mage"],
      faction: "alliance"
    });
    ClassHall.processCompletions();
  }
  assert.equal(Roster.hero("priest").level, 3);
  assert.equal(Roster.getHeroProgress("priest").xp, 0);
});

test("confirming an Embark advances only the active faction's clock", () => {
  const { Campaign } = fresh();
  Campaign.confirmEmbark({
    kind: "quest",
    contentId: "test",
    heroIds: ["mage"],
    faction: "alliance"
  });
  assert.deepEqual(plain(Campaign.getClock("alliance")), {
    day: 1,
    phase: "night",
    phaseAdvances: 1
  });
  assert.equal(Campaign.getClock("horde").phaseAdvances, 0);
  assert.throws(() => Campaign.confirmEmbark({ kind: "quest", heroIds: [], faction: "horde" }));
});

test("a hero learns at most one profession per track", () => {
  const { Professions } = fresh();
  Professions.configure(readJson("data/base/profession-buildings/index.json"));
  Professions.setHeroProfession("mage", "artisan", "tailor");
  Professions.setHeroProfession("mage", "gathering", "herbalism");
  Professions.setHeroProfession("mage", "artisan", "enchanter");
  const learned = plain(Professions.getHeroProfessions("mage"));
  assert.equal(learned.artisan, "enchanter", "same-track choice replaces the old one");
  assert.equal(learned.gathering, "herbalism", "other tracks are untouched");
  assert.throws(() => Professions.setHeroProfession("mage", "artisan", "mining"));
});

test("equipment rules enforce armor proficiency and hero level", () => {
  const { Roster, Rules, Equipment } = fresh();
  const items = plain(Equipment.build());
  const plate = items.find(item => item.family === "Plate" && item.tier === 2);
  const highTier = items.find(item => item.slot === "Trinket" && item.tier === 5);
  assert.ok(plate && highTier);
  assert.equal(Rules.canEquip(Roster.hero("warrior"), plate).ok, true);
  assert.equal(Rules.canEquip(Roster.hero("mage"), plate).ok, false);
  assert.equal(
    Rules.canEquip(Roster.hero("priest"), highTier).ok,
    false,
    "level 2 priest, tier 5 item"
  );
});

test("recruitment stops at the Base Level roster capacity", () => {
  const { Roster } = fresh();
  const candidates = readJson("data/base/recruitment.json").factions.alliance;
  const room = Roster.getRosterCapacity() - Roster.getState().heroes.length;
  const recruit = candidate =>
    Roster.recruitHero(Object.assign({}, candidate, { faction: "Alliance", level: 1 }));
  candidates.slice(0, room).forEach(recruit);
  assert.equal(Roster.getState().heroes.length, Roster.getRosterCapacity());
  assert.throws(() => recruit(candidates[room]));
});

test("every equipment slot and item has a real icon", () => {
  const { win, Equipment } = fresh();
  const Icons = win.WowUIIcons;
  const fallback = Icons.resolveSlug("equipment-slot", "no-such-slot");
  for (const slot of win.WarcraftEquipmentRules.SLOTS) {
    assert.notEqual(Icons.resolveSlug("equipment-slot", slot), fallback, slot);
  }
  for (const item of plain(Equipment.build())) {
    const slug = item.icon || Icons.resolveSlug("item-family", item.family, { slot: item.slot });
    assert.notEqual(slug, fallback, item.id);
  }
});

test("the shared modal opens, closes, and reports blocking vs floating", () => {
  const browser = createBrowser().load("mockup/ui/wow-modal.js");
  const Modal = browser.window.WowUIModal;
  let rendered = null;
  let closed = 0;
  Modal.open({ title: "Class Hall", render: body => (rendered = body), onClose: () => closed++ });
  assert.equal(Modal.isOpen(), true);
  assert.ok(rendered, "render receives the modal body");
  Modal.close();
  assert.equal(Modal.isOpen(), false);
  assert.equal(closed, 1);
  Modal.open({ title: "Storehouse", modal: false });
  assert.equal(Modal.isOpen(), true);
  Modal.close();
  assert.equal(closed, 1, "onClose belongs to the open call that set it");
});

test("the roster sidecar lists the active faction and hands heroes to drop targets", () => {
  const browser = createBrowser().loadShared("base");
  const { WarcraftRosterSidecar: Sidecar, WarcraftRoster: Roster, document } = browser.window;
  const list = document.createElement("div");
  Sidecar.mount(list);
  const listed = () => list.children.map(row => row.dataset.heroId);
  assert.deepEqual(listed(), plain(Roster.getState().heroes.map(hero => hero.id)));
  const onQuest = list.children.find(row => row.dataset.heroId === "paladin");
  assert.equal(onQuest.draggable, false, "heroes away on a quest cannot be dragged");
  Roster.setFaction("horde");
  assert.deepEqual(listed(), plain(Roster.getState().heroes.map(hero => hero.id)));

  const target = document.createElement("div");
  let dropped = null;
  Sidecar.dropTarget(target, heroId => (dropped = heroId));
  target.dispatchEvent({
    type: "drop",
    preventDefault() {},
    dataTransfer: { getData: type => (type === "text/warcraft-hero-id" ? "rogue" : "") }
  });
  assert.equal(dropped, "rogue");
});

function dropHero(target, heroId) {
  target.dispatchEvent({
    type: "drop",
    preventDefault() {},
    dataTransfer: { getData: type => (type === "text/warcraft-hero-id" ? heroId : "") }
  });
}

const descendants = node => [node, ...(node.children || []).flatMap(descendants)];
const clickButton = (node, label) =>
  descendants(node)
    .find(el => el.tagName === "BUTTON" && el.textContent === label)
    .dispatchEvent({ type: "click" });

test("every assignment building's slots take heroes dropped from the roster sidecar", () => {
  const { win, Slots } = fresh();
  for (const building of ["artisans", "gathering-camp", "survival-lodge", "classhall"]) {
    const root = win.document.createElement("div");
    const render = () => Slots.mount(root, { buildingId: building, onChange: render });
    render();
    assert.equal(root.children.length, Slots.SLOT_COUNT, building);
    dropHero(root.children[1], "hunter");
    assert.equal(Slots.assignmentAt(building, 1).heroId, "hunter", building);
    clickButton(root.children[1], "Remove");
    assert.equal(Slots.assignmentAt(building, 1), null, building);
  }
});

test("a profession building trains a hero dropped into its slot", () => {
  const { win, Campaign, Slots, Professions } = fresh();
  Professions.configure(readJson("data/base/profession-buildings/index.json"));
  const root = win.document.createElement("div");
  const render = () =>
    Slots.mount(root, {
      buildingId: "gathering-camp",
      assignmentData: () => ({ selectedProfessionId: "mining", trackId: "gathering" }),
      start: index => Professions.startProfessionTraining("gathering-camp", index),
      onChange: render
    });
  render();
  dropHero(root.children[0], "hunter");
  clickButton(root.children[0], "Begin Assignment");
  dropHero(root.children[0], "druid");
  assert.equal(Slots.assignmentAt("gathering-camp", 0).heroId, "hunter", "training slots stay put");
  for (let phase = 0; phase < 2; phase += 1) {
    Campaign.confirmEmbark({ kind: "quest", contentId: "test", heroIds: ["mage"] });
  }
  assert.equal(Professions.getHeroProfessions("hunter").gathering, "mining");
  assert.equal(Slots.assignmentAt("gathering-camp", 0), null);
});
