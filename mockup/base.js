const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Modal = window.WowUIModal;
const Roster = window.WarcraftRoster;
const Campaign = window.WarcraftCampaign;
const CampaignClock = window.WarcraftCampaignClock;
const Equipment = window.WarcraftEquipment;
const ClassHall = window.WarcraftClassHall;
const Assignments = window.WarcraftAssignmentSlots;
const BUILDING_DATA_ROOT = "../data/base/buildings.json";
const BASE_PRESENTATION_ROOT = "../data/base/presentation.json";
const RECRUITMENT_DATA_ROOT = "../data/base/recruitment.json";
const PROFESSION_DATA_ROOT = "../data/base/profession-buildings/index.json";
const QUEST_OFFER_POOL_ROOT = "../data/base/quest-offers.json";
const DUNGEON_CATALOG_ROOT = "../data/dungeons/catalog.json";
const REAGENT_HOLDINGS_ROOT = "../data/items/reagents/holdings.json";
const BANK_HOLDINGS_ROOT = "../data/items/economy/holdings.json";
const CLASS_HALL_DATA_ROOT = "../data/base/class-hall.json";
const CONTENT_PROGRESSION_ROOT = "../data/content/progression.json";
const Professions = window.WarcraftProfessions;
const ContentAssignments = window.WarcraftContentAssignments;
let buildings = [];
let basePresentation = null;
let recruitmentData = null;
let professionData = null;
let questOfferPool = null;
let reagentHoldings = null;
let bankHoldings = null;
let classHallData = null;
let contentProgression = null;
let armoryItems = [];
let modalBody = null;

function normalizeBuilding(raw) {
  const level = Number(raw.level);
  const max = Number(raw.max_level);
  if (!Number.isInteger(level) || level < 1 || level > 5 || max !== 5)
    throw new Error("Invalid building level contract for " + raw.id);
  return Object.assign({}, raw, { level: level, max: max });
}

function currentProgression(building) {
  return building.progression.find(entry => entry.level === building.level);
}

function nextProgression(building) {
  return building.progression.find(entry => entry.level === building.level + 1) || null;
}

function keepUpgradeGate(building, next) {
  const keep = buildings.find(entry => entry.id === "keep") || null;
  if (!next || building.id === "keep") return { blocked: false, reason: "" };
  const blocked = !keep || keep.level < next.level;
  return {
    blocked,
    reason: blocked ? "Upgrade Keep first." : ""
  };
}

function resourceShortages(next) {
  if (!next) return [];
  return Object.entries(next.cost)
    .filter(([key, value]) => (campaignResources()[key] || 0) < value)
    .map(([key, value]) => ({
      resource: key,
      required: value,
      current: campaignResources()[key] || 0
    }));
}

function upgradeState(building) {
  const next = nextProgression(building);
  if (!next)
    return {
      canUpgrade: false,
      reason: "Maximum level reached",
      next: null,
      keepGate: keepUpgradeGate(building, null),
      shortages: []
    };
  const keepGate = keepUpgradeGate(building, next);
  const shortages = resourceShortages(next);
  const reasons = [];
  if (keepGate.blocked) reasons.push(keepGate.reason);
  if (shortages.length)
    reasons.push(
      "Need " +
        shortages.map(entry => labelize(entry.resource) + " " + fmt(entry.required)).join(", ") +
        "."
    );
  return {
    canUpgrade: !keepGate.blocked && shortages.length === 0,
    reason: reasons.join(" "),
    next,
    keepGate,
    shortages
  };
}

const state = {
  selected: null,
  message: ""
};

function campaignResources() {
  return Campaign.getResources();
}
function applyCampaignProgression() {
  if (!buildings.length) return;
  const levels = Campaign.getBuildingLevels();
  buildings.forEach(building => {
    if (Object.prototype.hasOwnProperty.call(levels, building.id))
      building.level = Campaign.getBuildingLevel(building.id, building.level);
  });
  const artisans = buildings.find(entry => entry.id === "artisans");
  if (artisans) Professions.setGuildLevel(artisans.level);
}

const fmt = value => value.toLocaleString("en-US");
const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];

const buildingIconKeys = {
  keep: ["building", "keep"],
  recruitment: ["building", "recruitment-hall"],
  storehouse: ["building", "storehouse"],
  bank: ["building", "bank"],
  armory: ["building", "armory"],
  artisans: ["building", "artisans-guild"],
  "gathering-camp": ["building", "gathering-camp"],
  "survival-lodge": ["building", "survival-lodge"],
  classhall: ["building", "class-hall"],
  questboard: ["building", "quest-board"]
};

const attentionIcons = {
  "quest-complete": ["status", "victory"],
  "quest-ready": ["status", "combat"],
  "upgrade-ready": ["status", "victory"],
  blocked: ["status", "critical"]
};

function currentQuestOffers() {
  if (!questOfferPool) return [];
  const boardState = Roster.getQuestBoardState();
  const ids = new Set(boardState.offerIds || []);
  return questOfferPool.offers.filter(offer => ids.has(offer.id));
}

function currentRoundQuestForOffer(offerId) {
  const round = Roster.getQuestBoardState().round;
  return (
    Roster.getState().quests.find(
      quest => quest.round === round && quest.sourceOfferId === offerId
    ) || null
  );
}

function buildingAttentionState(building) {
  if (!building) return null;

  if (building.id === "questboard") {
    const round = Roster.getQuestBoardState().round;
    const quests = Roster.getState().quests.filter(quest => quest.round === round);
    if (quests.some(quest => quest.status === "completed")) {
      return {
        key: "quest-complete",
        label: "Quest complete",
        detail: "A quest from the current Quest Board round has been completed."
      };
    }

    const availableHeroes = Roster.getState().heroes.filter(
      hero => hero.availability === "available"
    ).length;
    const ready = currentQuestOffers().some(
      offer => !currentRoundQuestForOffer(offer.id) && availableHeroes >= offer.party_size
    );
    if (ready)
      return {
        key: "quest-ready",
        label: "Quest ready",
        detail: "A quest in the current round can launch from the Embark bar."
      };
    if (quests.some(quest => quest.status === "active")) return null;
  }

  const upgrade = upgradeState(building);
  if (upgrade.next && upgrade.canUpgrade) {
    return {
      key: "upgrade-ready",
      label: "Upgrade available",
      detail: "Keep gate and resource costs are satisfied for the next level."
    };
  }
  if (upgrade.next && !upgrade.canUpgrade) {
    return {
      key: "blocked",
      label: "Upgrade blocked",
      detail: upgrade.reason || "The next building level is currently blocked."
    };
  }
  return null;
}

function attentionIconMarkup(attention) {
  const icon = attentionIcons[attention.key] || ["status", "critical"];
  return (
    '<span class="base-plot-attention is-' +
    attention.key +
    '" data-attention-state="' +
    attention.key +
    '" aria-hidden="true">' +
    '<span class="wow-icon-frame wow-icon-frame--xs"><img src="' +
    Icons.resolve(icon[0], icon[1]) +
    '" alt=""></span>' +
    "</span>"
  );
}

function iconMarkup(category, key, size, extraClass) {
  return (
    '<span class="wow-icon-frame ' +
    (size ? "wow-icon-frame--" + size : "") +
    " " +
    (extraClass || "") +
    '">' +
    '<img src="' +
    Icons.resolve(category, key) +
    '" alt="">' +
    "</span>"
  );
}

function currentFactionId() {
  const faction =
    Roster && typeof Roster.getFaction === "function"
      ? Roster.getFaction()
      : Roster?.getState?.().faction;
  return faction === "horde" ? "horde" : "alliance";
}

function currentBaseVariant() {
  if (!basePresentation || !basePresentation.variants) return null;
  return (
    basePresentation.variants[currentFactionId()] ||
    basePresentation.variants[basePresentation.default_faction] ||
    null
  );
}

function buildingIconSpec(building) {
  const variant = currentBaseVariant();
  if (building && building.id === "keep" && variant && variant.keep_icon_key)
    return ["building", variant.keep_icon_key];
  return buildingIconKeys[building.id] || ["building", "keep"];
}

function labelize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(
    /[&<>"']/g,
    char =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]
  );
}

function equippedBy(itemId) {
  return Roster.getState().heroes.filter(hero =>
    Object.values(hero.equipment || {}).includes(itemId)
  );
}

function armoryItemTooltipModel(item) {
  const holders = equippedBy(item.id);
  const statLines = (item.stats || []).map(line => ({ label: line.stat, value: "+" + line.value }));
  return {
    variant: "item",
    title: item.name,
    type: item.slot,
    quality: item.qualityKey,
    icon: { slug: item.icon, quality: item.qualityKey },
    description: holders.length
      ? "Owned equipment currently equipped by " + holders.map(hero => hero.name).join(", ") + "."
      : "Owned equipment stored in the Armory.",
    requirements: [
      { label: "Tier", value: "T" + item.tier },
      {
        label:
          item.slot === "Weapon"
            ? "Weapon family"
            : item.slot === "Trinket"
              ? "Item family"
              : "Armor family",
        value: item.family
      }
    ],
    stats: statLines.length ? statLines : [{ label: "Bonus stats", value: "None" }],
    meta: [
      { label: "Quality", value: item.quality },
      { label: "Ownership", value: "Armory" },
      {
        label: "Equipped",
        value: holders.length ? holders.map(hero => hero.name).join(", ") : "No"
      }
    ]
  };
}

function reagentTooltipModel(item) {
  return {
    variant: "item",
    title: item.name,
    type: "Reagent · " + labelize(item.family),
    icon: { slug: item.icon_slug },
    description: "Profession reagent stored in the Storehouse.",
    requirements: [{ label: "Tier", value: "T" + item.tier }],
    stats: [{ label: "Quantity", value: fmt(Number(item.quantity) || 0) }],
    meta: [
      { label: "Category", value: "Reagent" },
      { label: "Professions", value: (item.professions || []).map(labelize).join(", ") || "None" }
    ]
  };
}

function bankTooltipModel(item) {
  return {
    variant: "resource",
    title: item.name,
    type: labelize(item.category),
    icon: item.icon,
    description: item.description,
    stats: [{ label: "Balance", value: fmt(Campaign.getBankHoldingQuantity(item.id)) }],
    meta: [
      { label: "Category", value: labelize(item.category) },
      { label: "Ownership", value: "Bank" }
    ]
  };
}

function storageBrowserRows(building) {
  if (building.id === "storehouse")
    return reagentHoldings ? reagentHoldings.items.map(item => ({ kind: "reagent", item })) : [];
  if (building.id === "bank")
    return bankHoldings ? bankHoldings.holdings.map(item => ({ kind: "bank", item })) : [];
  if (building.id === "armory") return armoryItems.map(item => ({ kind: "equipment", item }));
  return [];
}

// Storehouse, Bank, and Armory: holdings as an icon grid; names and details live in tooltips.
function storageItem(kind, item) {
  const node = document.createElement("button");
  node.type = "button";
  node.className = "building-modal__item";
  let icon;
  let count = null;
  let model;
  if (kind === "reagent") {
    icon =
      '<span class="wow-icon-frame wow-icon-frame--sm"><img src="' +
      Icons.iconUrl(item.icon_slug) +
      '" alt=""></span>';
    count = Number(item.quantity) || 0;
    model = () => reagentTooltipModel(item);
  } else if (kind === "bank") {
    const spec = item.icon || { category: "currency", key: "gold" };
    icon = iconMarkup(spec.category, spec.key, "sm");
    count = Campaign.getBankHoldingQuantity(item.id);
    model = () => bankTooltipModel(item);
  } else {
    icon =
      '<span class="wow-icon-frame wow-icon-frame--sm wow-icon-frame--quality-' +
      item.qualityKey +
      '"><img src="' +
      Icons.iconUrl(item.icon) +
      '" alt=""></span>';
    model = () => armoryItemTooltipModel(item);
  }
  node.setAttribute("aria-label", item.name + (count == null ? "" : ", " + fmt(count)));
  node.innerHTML =
    icon + (count == null ? "" : '<span class="building-modal__count">' + fmt(count) + "</span>");
  Tooltips.attach(node, model, { anchor: "target" });
  node.addEventListener("click", () => node.focus());
  return node;
}

function renderStorage(building) {
  $("#storageGrid").replaceChildren(
    ...storageBrowserRows(building).map(({ kind, item }) => storageItem(kind, item))
  );
}

function validateReagentHoldings(payload) {
  if (
    !payload ||
    payload.kind !== "reagent_holdings" ||
    payload.owner_building !== "storehouse" ||
    !Array.isArray(payload.items)
  )
    throw new Error("Storehouse holdings must be authored reagent JSON.");
  const ids = payload.items.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Storehouse reagent IDs must be unique.");
  payload.items.forEach(item => {
    if (item.category !== "reagent") throw new Error("Storehouse may contain reagent items only.");
    if (!Number.isInteger(Number(item.tier)) || Number(item.tier) < 1 || Number(item.tier) > 5)
      throw new Error("Storehouse reagent tier must be 1 through 5.");
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0)
      throw new Error("Storehouse reagent quantity must be non-negative.");
  });
  return payload;
}

function validateBankHoldings(payload) {
  if (
    !payload ||
    payload.kind !== "bank_holdings" ||
    payload.owner_building !== "bank" ||
    !Array.isArray(payload.holdings)
  )
    throw new Error("Bank holdings must be authored economy JSON.");
  const allowed = new Set(["currency", "meta_progression", "economy"]);
  const ids = payload.holdings.map(item => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Bank holding IDs must be unique.");
  payload.holdings.forEach(item => {
    if (!allowed.has(item.category))
      throw new Error("Bank may contain currency, meta-progression, or economy holdings only.");
    if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0)
      throw new Error("Bank holding quantity must be non-negative.");
  });
  return payload;
}

function armoryOwnedItems() {
  if (!Equipment || typeof Equipment.owned !== "function")
    throw new Error("Armory requires shared equipment ownership state.");
  return Equipment.owned();
}

function validateRecruitmentData(payload) {
  if (
    !payload ||
    !payload.factions ||
    !Array.isArray(payload.factions.alliance) ||
    !Array.isArray(payload.factions.horde)
  )
    throw new Error("Recruitment data requires Alliance and Horde candidate pools.");
  const ids = Object.values(payload.factions)
    .flat()
    .map(candidate => candidate.id);
  if (new Set(ids).size !== ids.length)
    throw new Error("Recruitment candidate IDs must be unique.");
  return payload;
}

function recruitmentConfig(building) {
  const progression = currentProgression(building);
  return progression && progression.recruitment ? progression.recruitment : { discovery_limit: 0 };
}

function currentFactionRoster() {
  const faction = currentFactionId();
  return Roster.getState().heroes.filter(
    hero => String(hero.faction || "").toLowerCase() === faction
  );
}

function discoveredRecruitmentCandidates(building) {
  const config = recruitmentConfig(building);
  const faction = currentFactionId();
  const pool =
    recruitmentData && recruitmentData.factions ? recruitmentData.factions[faction] || [] : [];
  return pool.slice(0, config.discovery_limit);
}

function recruitmentCandidateTooltip(candidate) {
  return {
    variant: "control",
    title: candidate.name,
    type: candidate.race + " " + candidate.classLabel,
    icon: { category: "race", key: candidate.race },
    description: "Recruitable " + candidate.spec + " " + candidate.classLabel + ".",
    stats: [
      { label: "Starting level", value: "1" },
      { label: "Primary stat", value: candidate.primary }
    ]
  };
}

function rosterStatus() {
  return "Roster " + currentFactionRoster().length + " / " + Roster.getRosterCapacity();
}

function recruitCandidate(candidate) {
  runBuildingAction(() => {
    const faction = currentFactionId() === "horde" ? "Horde" : "Alliance";
    Roster.recruitHero(Object.assign({}, candidate, { faction, level: 1 }));
    return candidate.name + " joined the roster.";
  });
}

function renderRecruitment(building) {
  const full = currentFactionRoster().length >= Roster.getRosterCapacity();
  $("#recruitmentCandidates").replaceChildren(
    ...discoveredRecruitmentCandidates(building).map(candidate => {
      const recruited = Boolean(Roster.hero(candidate.id));
      const row = document.createElement("div");
      row.className = "building-modal__row" + (recruited ? " is-recruited" : "");
      row.innerHTML =
        iconMarkup("race", candidate.race, "sm") +
        '<span class="building-modal__name">' +
        escapeHtml(candidate.name) +
        "</span>";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "wow-button";
      button.textContent = recruited ? "Recruited" : "Recruit";
      button.disabled = recruited || full;
      button.addEventListener("click", () => recruitCandidate(candidate));
      row.appendChild(button);
      Tooltips.attach(row, () => recruitmentCandidateTooltip(candidate), { anchor: "target" });
      return row;
    })
  );
}

function validateProfessionData(payload) {
  if (
    !payload ||
    !Array.isArray(payload.tracks) ||
    !Array.isArray(payload.professions) ||
    payload.professions.length !== 12
  )
    throw new Error("Profession index requires three tracks and twelve professions.");
  const trackIds = payload.tracks.map(entry => entry.id);
  if (JSON.stringify(trackIds) !== JSON.stringify(["artisan", "gathering", "survival"]))
    throw new Error("Profession tracks must be Artisan, Gathering, Survival.");
  const ids = payload.professions.map(entry => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error("Profession IDs must be unique.");
  payload.tracks.forEach(track => {
    if (Number(track.assignment_slots) !== 3 || track.training_rule !== "replace_same_track")
      throw new Error(
        "Profession track requires three assignment slots and replace_same_track training: " +
          track.id
      );
    const owned = payload.professions
      .filter(entry => entry.track === track.id && entry.owner_building === track.building_id)
      .map(entry => entry.id);
    if (JSON.stringify(owned) !== JSON.stringify(track.professions))
      throw new Error("Profession membership mismatch for " + track.id);
  });
  payload.professions.forEach(entry => {
    if (
      !entry.label ||
      !entry.icon_key ||
      !entry.progression_id ||
      !entry.track ||
      !entry.owner_building
    )
      throw new Error("Invalid profession metadata for " + entry.id);
  });
  Professions.configure(payload);
  return payload;
}

function professionTrackForBuilding(buildingId) {
  return professionData && professionData.tracks
    ? professionData.tracks.find(track => track.building_id === buildingId) || null
    : null;
}

function assignmentHeroMarkup(hero) {
  return (
    iconMarkup("class", hero.classId, "sm", "wow-icon-frame--class-" + hero.classId) +
    "<span><strong>" +
    escapeHtml(hero.name) +
    "</strong><small>" +
    escapeHtml(hero.classLabel + " · Lv " + hero.level) +
    "</small></span>"
  );
}

function professionAssignmentData(track, hero) {
  const choices = track.professions
    .map(id => professionData.professions.find(definition => definition.id === id))
    .filter(Boolean);
  const current = Professions.getHeroProfessions(hero.id)[track.id];
  const selected = choices.find(choice => choice.id === current) || choices[0];
  if (!selected) throw new Error("No profession is authored for " + track.label + ".");
  return {
    selectedAction: "learn-profession",
    selectedProfessionId: selected.id,
    trackId: track.id
  };
}

function renderProfessionBuilding(building) {
  const track = professionTrackForBuilding(building.id);
  const completions = Professions.processAssignments(building.id);
  if (completions.length)
    state.message = completions
      .map(
        event =>
          event.heroName +
          " learned " +
          (Professions.profession(event.professionId)?.label || event.professionId) +
          "."
      )
      .join(" ");
  const actionOptions = track.professions
    .map(id => professionData.professions.find(definition => definition.id === id))
    .filter(Boolean)
    .map(definition => ({ value: definition.id, label: definition.label }));
  Assignments.mount($("#professionAssignmentBoard"), {
    buildingId: building.id,
    label: building.name,
    heroMarkup: assignmentHeroMarkup,
    assignmentData: hero => professionAssignmentData(track, hero),
    actionOptions: () => actionOptions,
    selectionPatch: value => ({
      selectedAction: "learn-profession",
      selectedProfessionId: value,
      trackId: track.id
    }),
    describe: (hero, assignment) => {
      const current = Professions.getHeroProfessions(hero.id)[track.id],
        selected = Professions.profession(assignment.selectedProfessionId);
      return {
        label: selected ? "TRAIN " + selected.label.toUpperCase() : "CHOOSE PROFESSION",
        detail: current
          ? "Current " + track.label + ": " + (Professions.profession(current)?.label || current)
          : "No " + track.label + " profession learned"
      };
    },
    canStart: (hero, assignment) => ({
      enabled: Boolean(assignment.selectedProfessionId) && hero.availability === "available"
    }),
    startLabel: "Begin Training",
    start: index => Professions.startProfessionTraining(building.id, index),
    onChange: () => showMessage(""),
    onError: error => showMessage(error.message)
  });
}

function bindResolvedIcons(root) {
  (root || document).querySelectorAll(".wow-icon-frame img").forEach(Icons.bindFallback);
}

function costLabel(cost) {
  return Object.entries(cost)
    .map(([key, value]) => fmt(value) + " " + labelize(key))
    .join(" · ");
}

function buildingTooltipModel(building) {
  const icon = buildingIconSpec(building);
  const next = nextProgression(building);
  return {
    variant: "building",
    title: building.name,
    type: "Level " + building.level + " / " + building.max,
    icon: { category: icon[0], key: icon[1] },
    description: building.description,
    stats: [{ label: "Next upgrade", value: next ? costLabel(next.cost) : "Max level" }]
  };
}

function upgradeTooltipModel(building) {
  const upgrade = upgradeState(building);
  if (!upgrade.next)
    return { variant: "control", title: building.name, description: "Maximum level reached." };
  return {
    variant: "control",
    title: "Upgrade to level " + upgrade.next.level,
    stats: Object.entries(upgrade.next.cost).map(([key, value]) => ({
      label: labelize(key),
      value: fmt(value)
    })),
    locked: upgrade.canUpgrade ? [] : [upgrade.reason]
  };
}

function resourceTooltipModel(key) {
  const names = { gold: "Gold", lumber: "Lumber", stone: "Stone" };
  return {
    variant: "resource",
    title: names[key] || key,
    type: "Base resource",
    icon:
      key === "gold" ? { category: "currency", key: "gold" } : { category: "resource", key: key },
    description: "Persistent base resource used for building upgrades.",
    stats: { label: "Current", value: fmt(campaignResources()[key] || 0) }
  };
}

function syncResourceBar() {
  $("#goldValue").textContent = fmt(campaignResources().gold);
  $("#lumberValue").textContent = fmt(campaignResources().lumber);
  $("#stoneValue").textContent = fmt(campaignResources().stone);
  if (CampaignClock) CampaignClock.render($("#baseCampaignClock"));
  if (buildings.length) syncMapBuildings();
}

function syncBuildingAttention(plot, building) {
  const attention = buildingAttentionState(building);
  const existing = plot.querySelector(".base-plot-attention");

  if (!attention) {
    if (existing) existing.remove();
    delete plot.dataset.attentionState;
    return null;
  }

  plot.dataset.attentionState = attention.key;
  if (!existing || existing.dataset.attentionState !== attention.key) {
    if (existing) existing.remove();
    plot.insertAdjacentHTML("beforeend", attentionIconMarkup(attention));
    const marker = plot.querySelector(".base-plot-attention");
    if (marker) marker.dataset.attentionState = attention.key;
    bindResolvedIcons(plot);
  }
  return attention;
}

function validateBasePresentation(payload) {
  if (!payload || !payload.variants || !payload.variants.alliance || !payload.variants.horde)
    throw new Error("Base presentation requires Alliance and Horde variants");
  return payload;
}

function applyBasePresentation() {
  const map = $("#baseMap");
  const variant = currentBaseVariant();
  if (!map || !variant) return;

  const faction = currentFactionId();
  const mapClasses = Object.values(basePresentation.variants)
    .map(entry => entry.map_class)
    .filter(Boolean);
  map.classList.remove(...mapClasses);
  if (variant.map_class) map.classList.add(variant.map_class);
  map.dataset.faction = faction;
  document.body.dataset.faction = faction;
  map.setAttribute("aria-label", variant.label + " base map");

  const useMobilePositions =
    typeof window.matchMedia === "function" && window.matchMedia("(max-width: 700px)").matches;
  const positions = useMobilePositions ? variant.mobile_positions : variant.positions;
  Object.entries(positions || {}).forEach(([id, position]) => {
    const plot = document.querySelector('[data-building="' + id + '"]');
    if (!plot) return;
    plot.style.setProperty("--x", Number(position.x) + "%");
    plot.style.setProperty("--y", Number(position.y) + "%");
  });

  const keepImage = document.querySelector('[data-building="keep"] .plot-art img');
  if (keepImage && variant.keep_icon_key) {
    keepImage.dataset.wowIcon = "building";
    keepImage.dataset.wowKey = variant.keep_icon_key;
    keepImage.src = Icons.resolve("building", variant.keep_icon_key);
    Icons.bindFallback(keepImage);
  }

  syncMapBuildings();
}

function syncMapBuildings() {
  all(".base-plot[data-building]").forEach(plot => {
    const building = buildings.find(entry => entry.id === plot.dataset.building);
    if (!building) return;
    const selected = state.selected === building.id;
    const attention = syncBuildingAttention(plot, building);
    plot.classList.toggle("selected", selected);
    plot.setAttribute("aria-haspopup", "dialog");
    plot.setAttribute("aria-expanded", selected ? "true" : "false");
    plot.setAttribute(
      "aria-label",
      building.name +
        ", level " +
        building.level +
        (attention ? ", attention: " + attention.label : "")
    );
    const level = plot.querySelector(".plot-label b");
    if (level) level.textContent = building.level;
  });
}

function validateDungeonCatalog(payload) {
  if (!payload || !Array.isArray(payload.dungeons) || !payload.dungeons.length)
    throw new Error("Dungeon catalog is empty.");
  return payload;
}

// Quest Board automation: heroes dragged from the roster sidecar quest on their own for one
// campaign day. Manual quests launch from the Embark bar.
function questAutomationLevel() {
  return contentProgression.content.find(entry => entry.id === "quest").automation_base_level;
}

function questBoardStatus() {
  const unlockLevel = questAutomationLevel();
  return Campaign.getBaseLevel() < unlockLevel
    ? "Launch quests from the Embark bar. Auto quests unlock at Base Level " + unlockLevel + "."
    : "";
}

function questAutomationSlot(assignment, index, offers) {
  const hero = assignment ? Roster.hero(assignment.heroId) : null;
  const offer = hero
    ? questOfferPool.offers.find(entry => entry.id === assignment.contentId)
    : offers[index % offers.length];
  const title = offer ? offer.title : "Auto Quest " + (index + 1);
  const remaining = hero ? assignment.remainingCampaignPhases : 0;
  const slot = document.createElement("div");
  slot.className = "quest-automation__slot" + (hero ? " is-filled" : "");
  slot.dataset.slot = String(index);
  slot.innerHTML =
    '<span class="quest-automation__hero">' +
    (hero ? iconMarkup("race", hero.race, "sm", "wow-icon-frame--class-" + hero.classId) : "") +
    '</span><span class="quest-automation__copy"><strong>' +
    escapeHtml(title) +
    "</strong><small>" +
    escapeHtml(hero ? hero.name : "Drop a hero") +
    "</small></span>";
  Tooltips.attach(slot, () => ({
    title,
    type: "Auto Quest",
    description: hero
      ? hero.name +
        " returns in " +
        remaining +
        " campaign phase" +
        (remaining === 1 ? "" : "s") +
        ". Click to recall."
      : "Drag a hero here from the roster. Heroes return in one campaign day with Quest XP."
  }));
  if (hero)
    slot.addEventListener("click", () =>
      runBuildingAction(() => {
        ContentAssignments.remove("quest", index);
      })
    );
  else
    window.WarcraftRosterSidecar.dropTarget(slot, heroId =>
      runBuildingAction(() => {
        ContentAssignments.assign("quest", index, heroId, offer ? offer.id : "quest");
      })
    );
  return slot;
}

function renderQuestAutomation() {
  const root = $("#questAutomationSlots");
  if (Campaign.getBaseLevel() < questAutomationLevel()) {
    root.replaceChildren();
    return;
  }
  const offers = currentQuestOffers();
  root.replaceChildren(
    ...ContentAssignments.state("quest").slots.map((assignment, index) =>
      questAutomationSlot(assignment, index, offers)
    )
  );
}

function classHallSlotTooltip(hero) {
  const trainer = ClassHall.trainerForClass(hero.classId);
  return {
    variant: "control",
    title: trainer.label,
    type: "Class Trainer",
    classId: hero.classId,
    icon: { category: "class", key: hero.classId },
    description: "Trains " + hero.name + " to the next level."
  };
}

function classHallHeroStatus(hero) {
  const progress = Roster.getHeroProgress(hero.id);
  if (progress.levelCapped)
    return { label: "LEVEL CAP", detail: "Level 5 · no further level training", canTrain: false };
  if (progress.canTrain)
    return {
      label: "READY TO TRAIN",
      detail: "20 / 20 XP · level " + progress.level + " → " + progress.nextLevel,
      canTrain: true
    };
  if (progress.baseBlocked)
    return {
      label: "BASE LEVEL " + progress.nextLevel + " REQUIRED",
      detail: "20 / 20 XP · raise the Keep before training",
      canTrain: false
    };
  return {
    label: progress.xp + " / " + progress.maxXp + " XP",
    detail: "Needs 20 / 20 XP for the next level",
    canTrain: false
  };
}

function renderClassHall() {
  const completions = ClassHall.processCompletions();
  if (completions.length)
    state.message = completions
      .map(event => event.heroName + " reached level " + event.toLevel + ".")
      .join(" ");
  Assignments.mount($("#classHallAssignmentBoard"), {
    buildingId: "classhall",
    label: "Class Hall",
    heroMarkup: assignmentHeroMarkup,
    assignmentData: hero => {
      const trainer = ClassHall.trainerForClass(hero.classId);
      if (!trainer) throw new Error(hero.classLabel + " has no trainer for this faction.");
      return {
        selectedAction: "level-up",
        selectedTrainerId: trainer.id,
        trainerId: trainer.id,
        trainerClassId: trainer.class_id
      };
    },
    describe: hero => classHallHeroStatus(hero),
    canStart: hero => {
      const status = classHallHeroStatus(hero);
      return { enabled: status.canTrain && hero.availability === "available" };
    },
    startLabel: "Start Level Training",
    start: index => ClassHall.startLevelTraining(index),
    tooltip: classHallSlotTooltip,
    onChange: () => showMessage(""),
    onError: error => showMessage(error.message)
  });
}

// The Keep's function is the Base Level: which content it unlocks and how many heroes fit.
function renderKeep() {
  const baseLevel = Campaign.getBaseLevel();
  $("#keepUnlocks").replaceChildren(
    ...contentProgression.content.map(entry => {
      const locked = baseLevel < entry.unlock_base_level;
      const chip = document.createElement("span");
      chip.className = "building-modal__unlock" + (locked ? " is-locked" : "");
      chip.tabIndex = 0;
      chip.textContent = entry.label;
      Tooltips.attach(
        chip,
        () => ({
          title: entry.label,
          description: locked
            ? "Unlocks at Base Level " + entry.unlock_base_level + "."
            : "Unlocked at Base Level " + entry.unlock_base_level + "."
        }),
        { anchor: "target" }
      );
      return chip;
    })
  );
}

const PROFESSION_VIEW = {
  markup: '<div id="professionAssignmentBoard" class="assignment-board"></div>',
  render: renderProfessionBuilding
};
const STORAGE_VIEW = {
  markup: '<div id="storageGrid" class="building-modal__grid"></div>',
  render: renderStorage
};
// Each building's one function, rendered into the building modal above its upgrade button.
const BUILDING_VIEWS = {
  keep: {
    markup:
      '<div class="building-modal__unlocks"><span class="building-modal__label">Content</span>' +
      '<span id="keepUnlocks" class="building-modal__unlocks"></span></div>',
    render: renderKeep,
    status: rosterStatus
  },
  recruitment: {
    markup: '<div id="recruitmentCandidates" class="building-modal__rows"></div>',
    render: renderRecruitment,
    status: rosterStatus
  },
  questboard: {
    markup: '<div id="questAutomationSlots" class="quest-automation"></div>',
    render: renderQuestAutomation,
    status: questBoardStatus
  },
  classhall: {
    markup: '<div id="classHallAssignmentBoard" class="assignment-board"></div>',
    render: renderClassHall
  },
  storehouse: STORAGE_VIEW,
  bank: STORAGE_VIEW,
  armory: STORAGE_VIEW,
  artisans: PROFESSION_VIEW,
  "gathering-camp": PROFESSION_VIEW,
  "survival-lodge": PROFESSION_VIEW
};

function toast(message) {
  const node = $("#baseToast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (node.hidden = true), 1800);
}

function showMessage(message) {
  state.message = message;
  renderBuildingModal();
}

// Runs a building action and shows the message it returns, or its error.
function runBuildingAction(action) {
  try {
    showMessage(action() || "");
  } catch (error) {
    showMessage(error.message);
  }
}

function renderUpgradeButton(building) {
  const upgrade = upgradeState(building);
  const button = $("#buildingUpgrade");
  button.textContent = upgrade.next ? "Upgrade" : "Max level";
  button.classList.toggle("wow-button--primary", upgrade.canUpgrade);
  button.setAttribute("aria-disabled", upgrade.canUpgrade ? "false" : "true");
  button.onclick = () => upgradeBuilding(building.id);
  Tooltips.attach(button, () => upgradeTooltipModel(building), { anchor: "target" });
}

function renderBuildingModal() {
  const building = buildings.find(entry => entry.id === state.selected);
  if (!building || !modalBody) return;
  const view = BUILDING_VIEWS[building.id];
  const focusedId = modalBody.contains(document.activeElement) ? document.activeElement.id : "";
  modalBody.innerHTML =
    '<p id="buildingStatus" class="building-modal__status" role="status"></p>' +
    view.markup +
    '<footer class="building-modal__footer"><span>' +
    (building.id === "keep" ? "Base Level " : "Level ") +
    building.level +
    " / " +
    building.max +
    '</span><button id="buildingUpgrade" class="wow-button" type="button"></button></footer>';
  view.render(building);
  const status = $("#buildingStatus");
  status.textContent = state.message || (view.status ? view.status(building) : "");
  status.hidden = !status.textContent;
  renderUpgradeButton(building);
  bindResolvedIcons(modalBody);
  if (focusedId) $("#" + focusedId)?.focus();
}

// Building modals float (modal: false) so heroes can be dragged in from the roster sidecar
// and another plot on the map can be opened directly.
function openBuilding(id) {
  const building = buildings.find(entry => entry.id === id);
  if (!building) return;
  if (state.selected !== id) state.message = "";
  modalBody = Modal.open({
    title: building.name,
    modal: false,
    onClose: () => {
      if (state.selected !== id) return;
      state.selected = null;
      modalBody = null;
      syncMapBuildings();
    }
  });
  state.selected = id;
  renderBuildingModal();
  syncMapBuildings();
}

function upgradeBuilding(id) {
  const b = buildings.find(item => item.id === id);
  if (!b) return;
  const up = upgradeState(b);
  if (!up.next) {
    toast(b.name + " is already level " + b.max + ".");
    return;
  }
  if (!up.canUpgrade) {
    toast(up.reason);
    return;
  }

  if (up.next.level !== b.level + 1 || up.next.level > b.max)
    throw new Error("Invalid building level transition");
  Campaign.applyBaseUpgrade(b.id, up.next.level, up.next.cost);
  b.level = Campaign.getBuildingLevel(b.id, up.next.level);
  if (b.id === "artisans") Professions.setGuildLevel(b.level);
  state.message = "";
  syncResourceBar();
  renderBuildingModal();
  toast(b.name + " upgraded to level " + b.level + ".");
}

$("#baseMap").addEventListener("click", event => {
  const plot = event.target.closest("[data-building]");
  if (plot) openBuilding(plot.dataset.building);
  else Modal.close();
});

window.addEventListener("warcraft:roster-changed", () => {
  applyCampaignProgression();
  syncResourceBar();
  applyBasePresentation();
  renderBuildingModal();
});

window.addEventListener("warcraft:campaign-changed", event => {
  const reason = event && event.detail && event.detail.reason;
  if (["clock", "faction", "reset"].includes(reason)) syncResourceBar();
  renderBuildingModal();
});
window.addEventListener("warcraft:assignments-changed", renderBuildingModal);

window.addEventListener("resize", () => {
  if (basePresentation) applyBasePresentation();
});

async function initBase() {
  try {
    const responses = await Promise.all([
      fetch(BUILDING_DATA_ROOT),
      fetch(BASE_PRESENTATION_ROOT),
      fetch(RECRUITMENT_DATA_ROOT),
      fetch(PROFESSION_DATA_ROOT),
      fetch(QUEST_OFFER_POOL_ROOT),
      fetch(DUNGEON_CATALOG_ROOT),
      fetch(REAGENT_HOLDINGS_ROOT),
      fetch(BANK_HOLDINGS_ROOT),
      fetch(CLASS_HALL_DATA_ROOT),
      fetch(CONTENT_PROGRESSION_ROOT)
    ]);
    const roots = [
      BUILDING_DATA_ROOT,
      BASE_PRESENTATION_ROOT,
      RECRUITMENT_DATA_ROOT,
      PROFESSION_DATA_ROOT,
      QUEST_OFFER_POOL_ROOT,
      DUNGEON_CATALOG_ROOT,
      REAGENT_HOLDINGS_ROOT,
      BANK_HOLDINGS_ROOT,
      CLASS_HALL_DATA_ROOT,
      CONTENT_PROGRESSION_ROOT
    ];
    responses.forEach((response, index) => {
      if (!response.ok) throw new Error("Could not load " + roots[index]);
    });
    const payload = await responses[0].json();
    buildings = payload.buildings.map(normalizeBuilding);
    Campaign.ensureBase(buildings);
    applyCampaignProgression();
    basePresentation = validateBasePresentation(await responses[1].json());
    recruitmentData = validateRecruitmentData(await responses[2].json());
    professionData = validateProfessionData(await responses[3].json());
    questOfferPool = await responses[4].json();
    if (!questOfferPool || !Array.isArray(questOfferPool.offers) || !questOfferPool.offers.length)
      throw new Error("Quest offer pool is empty.");
    const dungeonCatalog = validateDungeonCatalog(await responses[5].json());
    reagentHoldings = validateReagentHoldings(await responses[6].json());
    bankHoldings = validateBankHoldings(await responses[7].json());
    classHallData = await responses[8].json();
    contentProgression = await responses[9].json();
    if (!ClassHall) throw new Error("Class Hall runtime is unavailable.");
    ClassHall.configure(classHallData);
    ContentAssignments.configure(contentProgression);
    Campaign.ensureBankHoldings(bankHoldings.holdings);
    armoryItems = armoryOwnedItems();
    if (!armoryItems.length) throw new Error("Armory equipment ownership is empty.");
    applyCampaignProgression();
    const questBoard = buildings.find(entry => entry.id === "questboard");
    if (questBoard) Roster.ensureQuestRound(questOfferPool, questBoard.level);
    window.WarcraftEmbarkBar.mount($("#embarkBar"), {
      progression: contentProgression,
      dungeons: dungeonCatalog,
      questOffers: questOfferPool
    });
    window.WarcraftRosterSidecar.mount($("#rosterSidecarList"), {
      onOpenHero: heroId => (location.href = "./heroes.html?hero=" + encodeURIComponent(heroId))
    });
    Icons.hydrate(document);
    Tooltips.hydrate(document);
    bindResolvedIcons(document);
    applyBasePresentation();
    all("[data-building]").forEach(plot => {
      const building = buildings.find(entry => entry.id === plot.dataset.building);
      if (building) Tooltips.attach(plot, () => buildingTooltipModel(building));
    });
    all("[data-resource]").forEach(element =>
      Tooltips.attach(element, () => resourceTooltipModel(element.dataset.resource, element), {
        anchor: "target"
      })
    );
    syncResourceBar();
    applyBasePresentation();
    openBuilding(new URLSearchParams(window.location.search).get("building"));
  } catch (error) {
    toast(error.message);
  }
}
initBase();
