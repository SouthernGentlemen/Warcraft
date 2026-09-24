const CLASS_DATA_ROOT = "../data/heroes/classes/";
const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;

const SLOT_ORDER = ["Head", "Chest", "Pants", "Feet", "Gloves", "Weapon"];
const LEFT_SLOTS = ["Head", "Chest", "Gloves"];
const RIGHT_SLOTS = ["Pants", "Feet", "Weapon"];
const ARMOR_FAMILIES = ["Cloth", "Leather", "Mail", "Plate"];

const ARMOR_ACCESS = {
  mage: ["Cloth"],
  priest: ["Cloth"],
  warlock: ["Cloth"],
  rogue: ["Cloth", "Leather"],
  druid: ["Cloth", "Leather"],
  hunter: ["Cloth", "Leather", "Mail"],
  shaman: ["Cloth", "Leather", "Mail"],
  paladin: ["Cloth", "Leather", "Mail", "Plate"],
  warrior: ["Cloth", "Leather", "Mail", "Plate"]
};

const PREFERRED_ARMOR = {
  mage: "Cloth",
  priest: "Cloth",
  warlock: "Cloth",
  rogue: "Leather",
  druid: "Leather",
  hunter: "Mail",
  shaman: "Mail",
  paladin: "Plate",
  warrior: "Plate"
};

const HERO_BLUEPRINTS = {
  mage: {name:"Elowen", race:"Human", faction:"Alliance", level:5, spec:"Fire", primary:"Intellect"},
  rogue: {name:"Valeera", race:"Undead", faction:"Horde", level:4, spec:"Combat", primary:"Agility"},
  warlock: {name:"Mordren", race:"Undead", faction:"Horde", level:3, spec:"Demonology", primary:"Intellect"},
  warrior: {name:"Brom", race:"Dwarf", faction:"Alliance", level:5, spec:"Arms", primary:"Strength"},
  priest: {name:"Sister Anwen", race:"Human", faction:"Alliance", level:2, spec:"Holy", primary:"Intellect"},
  druid: {name:"Thorn", race:"Troll", faction:"Horde", level:4, spec:"Feral", primary:"Agility"},
  hunter: {name:"Rifleman Keg", race:"Dwarf", faction:"Alliance", level:3, spec:"Marksmanship", primary:"Agility"},
  paladin: {name:"Arthoran", race:"Human", faction:"Alliance", level:5, spec:"Retribution", primary:"Strength"},
  shaman: {name:"Gorak", race:"Orc", faction:"Horde", level:1, spec:"Enhancement", primary:"Agility"}
};

const BASELINE = {
  1: {major:12, minor:4, stamina:14, spirit:10, crit:0, haste:0, hit:0, mastery:0},
  2: {major:20, minor:6, stamina:22, spirit:16, crit:1, haste:1, hit:1, mastery:0},
  3: {major:30, minor:8, stamina:32, spirit:23, crit:2, haste:2, hit:2, mastery:1},
  4: {major:42, minor:10, stamina:44, spirit:31, crit:4, haste:4, hit:3, mastery:2},
  5: {major:56, minor:12, stamina:58, spirit:40, crit:6, haste:6, hit:4, mastery:4}
};

const QUALITY_BY_TIER = {
  1: {label:"Common", key:"common"},
  2: {label:"Uncommon", key:"uncommon"},
  3: {label:"Rare", key:"rare"},
  4: {label:"Epic", key:"epic"},
  5: {label:"Epic", key:"epic"}
};

const TIER_PREFIX = {
  1: "Worn",
  2: "Fieldforged",
  3: "Veteran's",
  4: "Runed",
  5: "Ascendant"
};

const ARMOR_PATTERN = {
  1: ["Cloth", "Cloth", "Cloth", "Cloth", "Cloth"],
  2: ["Cloth", "Leather", "Mail", "Plate", "Cloth"],
  3: ["Leather", "Mail", "Plate", "Cloth", "Leather"],
  4: ["Mail", "Plate", "Cloth", "Leather", "Mail"],
  5: ["Plate", "Cloth", "Leather", "Mail", "Plate"]
};

const SLOT_NOUNS = {
  Head: {Cloth:"Cowl", Leather:"Mask", Mail:"Coif", Plate:"Helm"},
  Chest: {Cloth:"Robe", Leather:"Jerkin", Mail:"Hauberk", Plate:"Cuirass"},
  Pants: {Cloth:"Leggings", Leather:"Legguards", Mail:"Chausses", Plate:"Greaves"},
  Feet: {Cloth:"Slippers", Leather:"Boots", Mail:"Sabatons", Plate:"Warboots"},
  Gloves: {Cloth:"Gloves", Leather:"Grips", Mail:"Gauntlets", Plate:"Handguards"}
};

const WEAPON_TEMPLATES = [
  {family:"Staff", noun:"Spellstaff", focus:"Intellect"},
  {family:"Dagger", noun:"Quickblade", focus:"Agility"},
  {family:"Sword", noun:"Warblade", focus:"Strength"}
];

const state = {
  classIndex: null,
  heroes: [],
  items: [],
  selectedHeroId: null,
  filters: {tier:"all", slot:"all", query:"", equippable:true}
};

const $ = id => document.getElementById(id);

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(c) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

function armorFocus(family) {
  if (family === "Cloth") return "Intellect";
  if (family === "Leather" || family === "Mail") return "Agility";
  return "Strength";
}

function makeStats(tier, focus) {
  if (tier === 1) return [];
  if (tier === 2) return [{stat:focus, value:4}];
  if (tier === 3) return [{stat:focus, value:6}, {stat:"Stamina", value:5}];
  if (tier === 4) return [{stat:focus, value:9}, {stat:"Stamina", value:8}, {stat:"Crit", value:3}];
  return [{stat:focus, value:13}, {stat:"Stamina", value:12}, {stat:"Crit", value:5}, {stat:"Haste", value:4}];
}

function buildArmory() {
  const items = [];
  const armorSlots = SLOT_ORDER.slice(0, 5);

  for (let tier = 1; tier <= 5; tier += 1) {
    armorSlots.forEach(function(slot, index) {
      const family = ARMOR_PATTERN[tier][index];
      const quality = QUALITY_BY_TIER[tier];
      items.push({
        id:"t" + tier + "-" + slot.toLowerCase() + "-" + family.toLowerCase(),
        name:TIER_PREFIX[tier] + " " + SLOT_NOUNS[slot][family],
        tier:tier,
        quality:quality.label,
        qualityKey:quality.key,
        slot:slot,
        family:family,
        icon:Icons.resolveSlug("item-family", family, {slot:slot}),
        stats:makeStats(tier, armorFocus(family))
      });
    });

    WEAPON_TEMPLATES.forEach(function(weapon) {
      const quality = QUALITY_BY_TIER[tier];
      items.push({
        id:"t" + tier + "-weapon-" + weapon.family.toLowerCase(),
        name:TIER_PREFIX[tier] + " " + weapon.noun,
        tier:tier,
        quality:quality.label,
        qualityKey:quality.key,
        slot:"Weapon",
        family:weapon.family,
        icon:Icons.resolveSlug("item-family", weapon.family, {slot:"Weapon"}),
        statFocus:weapon.focus,
        stats:makeStats(tier, weapon.focus)
      });
    });
  }

  return items;
}

function defaultBlueprint(classMeta, index) {
  return {
    name:classMeta.label + " " + (index + 1),
    race:"Human",
    faction:classMeta.faction || "Alliance",
    level:Math.min(5, 1 + (index % 5)),
    spec:classMeta.specs && classMeta.specs[0] ? classMeta.specs[0].label : "Adventurer",
    primary:["mage","priest","warlock"].includes(classMeta.id) ? "Intellect" :
      ["rogue","hunter","druid","shaman"].includes(classMeta.id) ? "Agility" : "Strength"
  };
}

function canEquip(hero, item) {
  if (item.tier > hero.level) return {ok:false, reason:"Requires hero level " + item.tier};
  if (item.slot === "Weapon") return {ok:true, reason:""};
  const allowed = ARMOR_ACCESS[hero.classId] || ["Cloth"];
  if (!allowed.includes(item.family)) {
    return {ok:false, reason:hero.classLabel + " cannot equip " + item.family};
  }
  return {ok:true, reason:""};
}

function itemScoreForHero(hero, item) {
  const allowed = canEquip(hero, item);
  if (!allowed.ok) return -1;
  let score = item.tier * 100;
  if (item.slot !== "Weapon" && item.family === PREFERRED_ARMOR[hero.classId]) score += 25;
  if (item.slot === "Weapon" && item.statFocus === hero.primary) score += 30;
  if (item.stats.some(function(s) { return s.stat === hero.primary; })) score += 10;
  return score;
}

function buildHeroes(classIndex) {
  return classIndex.classes.map(function(classMeta, index) {
    const blueprint = HERO_BLUEPRINTS[classMeta.id] || defaultBlueprint(classMeta, index);
    const hero = {
      id:"hero-" + classMeta.id,
      classId:classMeta.id,
      classLabel:classMeta.label,
      name:blueprint.name,
      race:blueprint.race,
      faction:classMeta.faction || blueprint.faction,
      level:blueprint.level,
      spec:blueprint.spec,
      primary:blueprint.primary,
      portrait:Icons.resolveSlug("class", classMeta.id),
      equipment:{}
    };

    SLOT_ORDER.forEach(function(slot) {
      const candidates = state.items
        .filter(function(item) { return item.slot === slot; })
        .map(function(item) { return {item:item, score:itemScoreForHero(hero, item)}; })
        .filter(function(entry) { return entry.score >= 0; })
        .sort(function(a, b) { return b.score - a.score || a.item.name.localeCompare(b.item.name); });
      if (candidates[0]) hero.equipment[slot] = candidates[0].item.id;
    });

    return hero;
  });
}

function selectedHero() {
  return state.heroes.find(function(hero) { return hero.id === state.selectedHeroId; }) || state.heroes[0];
}

function getItem(itemId) {
  return state.items.find(function(item) { return item.id === itemId; });
}

function qualityClass(item) {
  return "wow-quality--" + item.qualityKey;
}

function qualityFrameClass(item) {
  return "wow-icon-frame--quality-" + item.qualityKey;
}

function itemTooltipModel(item, hero, options) {
  if (!item) return null;
  const eligibility = canEquip(hero, item);
  const config = options || {};
  return {
    variant:"item",
    title:item.name,
    type:item.quality + " " + item.slot,
    quality:item.qualityKey,
    badge:config.badge || "",
    icon:{slug:item.icon, quality:item.qualityKey},
    requirements:[
      {label:"Required level", value:String(item.tier)},
      {label:"Slot", value:item.slot}
    ],
    description:config.description || (eligibility.ok ? "Equipment for " + hero.classLabel + "." : "This item cannot currently be equipped."),
    stats:item.stats.length
      ? item.stats.map(function(line) { return {label:line.stat, value:"+" + line.value}; })
      : [{label:"Bonus stats", value:"None"}],
    meta:[
      {label:"Tier", value:"T" + item.tier},
      {label:"Family", value:item.family}
    ],
    locked:eligibility.ok ? [] : [eligibility.reason]
  };
}

function itemComparisonTooltip(item, hero) {
  const model = itemTooltipModel(item, hero, {badge:equippedBySelectedHero(item) ? "Equipped" : "Candidate"});
  if (!model || equippedBySelectedHero(item)) return model;
  const equipped = getItem(hero.equipment[item.slot]);
  if (equipped && equipped.id !== item.id) {
    model.comparison = itemTooltipModel(equipped, hero, {
      badge:"Equipped",
      description:"Currently equipped in this slot."
    });
  }
  return model;
}

function renderRoster() {
  const root = $("heroRoster");
  root.innerHTML = "";
  $("rosterCount").textContent = state.heroes.length + " heroes";

  state.heroes.forEach(function(hero) {
    const equipped = Object.keys(hero.equipment).filter(function(slot) { return hero.equipment[slot]; }).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hero-roster-card" + (hero.id === state.selectedHeroId ? " active" : "");
    button.innerHTML =
      '<span class="roster-avatar ' + (hero.faction === "Horde" ? "horde" : "alliance") + ' wow-icon-frame wow-icon-frame--class-' + hero.classId + '">' +
        '<img src="' + Icons.iconUrl(hero.portrait) + '" alt="">' +
        '<b>' + hero.level + '</b>' +
      '</span>' +
      '<span class="roster-copy">' +
        '<strong>' + escapeHtml(hero.name) + '</strong>' +
        '<small>' + escapeHtml(hero.race) + ' ' + escapeHtml(hero.classLabel) + '</small>' +
        '<em>' + escapeHtml(hero.spec) + ' · ' + equipped + '/6 gear</em>' +
      '</span>' +
      '<span class="roster-arrow">›</span>';
    Icons.bindFallback(button.querySelector("img"));
    button.addEventListener("click", function() {
      state.selectedHeroId = hero.id;
      render();
    });
    root.appendChild(button);
  });
}

function slotMarkup(hero, slot) {
  const item = getItem(hero.equipment[slot]);
  if (!item) {
    return '<span class="gear-slot-icon empty wow-icon-frame is-disabled">' +
        '<img src="' + Icons.resolve("equipment-slot", slot) + '" alt="">' +
      '</span>' +
      '<span class="gear-slot-copy"><small>' + escapeHtml(slot) + '</small><strong>Empty slot</strong><em>Choose an item from the armory</em></span>';
  }

  const stats = item.stats.length
    ? item.stats.map(function(s) { return "+" + s.value + " " + s.stat; }).join(" · ")
    : "No bonus stats";

  return '<span class="gear-slot-icon wow-icon-frame ' + qualityFrameClass(item) + '">' +
      '<img src="' + Icons.iconUrl(item.icon) + '" alt="">' +
      '<span class="wow-icon-tier">T' + item.tier + '</span>' +
    '</span>' +
    '<span class="gear-slot-copy">' +
      '<small>' + escapeHtml(slot) + ' · ' + escapeHtml(item.family) + '</small>' +
      '<strong class="' + qualityClass(item) + '">' + escapeHtml(item.name) + '</strong>' +
      '<em>' + escapeHtml(stats) + '</em>' +
    '</span>' +
    '<span class="gear-slot-remove">×</span>';
}

function renderSlots() {
  const hero = selectedHero();

  function fill(rootId, slots) {
    const root = $(rootId);
    root.innerHTML = "";
    slots.forEach(function(slot) {
      const item = getItem(hero.equipment[slot]);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gear-slot" + (item ? " filled" : " empty");
      button.innerHTML = slotMarkup(hero, slot);
      const img = button.querySelector("img");
      if (img) Icons.bindFallback(img);
      if (item) {
        Tooltips.attach(button, function() {
          return itemTooltipModel(item, hero, {badge:"Equipped", description:"Click to unequip this item."});
        });
        button.addEventListener("click", function() {
          hero.equipment[slot] = null;
          toast("Unequipped " + item.name);
          render();
        });
      }
      root.appendChild(button);
    });
  }

  fill("leftSlots", LEFT_SLOTS);
  fill("rightSlots", RIGHT_SLOTS);
}

function addStat(stats, stat, value) {
  stats[stat] = (stats[stat] || 0) + value;
}

function heroStats(hero) {
  const base = BASELINE[hero.level] || BASELINE[1];
  const stats = {
    Strength:base.minor,
    Agility:base.minor,
    Intellect:base.minor,
    Stamina:base.stamina,
    Spirit:base.spirit,
    Crit:base.crit,
    Haste:base.haste,
    "Hit Rating":base.hit,
    Mastery:base.mastery
  };
  stats[hero.primary] = base.major;

  Object.values(hero.equipment).forEach(function(itemId) {
    const item = getItem(itemId);
    if (!item) return;
    item.stats.forEach(function(line) { addStat(stats, line.stat, line.value); });
  });

  stats.Health = 500 + stats.Stamina * 50;
  stats.Power = hero.primary === "Intellect"
    ? stats.Intellect * 10
    : Math.max(stats.Strength, stats.Agility) * 10;

  return stats;
}

function renderStats() {
  const hero = selectedHero();
  const stats = heroStats(hero);
  const important = [
    {label:"Health", key:"Health"},
    {label:hero.primary, key:hero.primary},
    {label:"Power", key:"Power"},
    {label:"Stamina", key:"Stamina"},
    {label:"Spirit", key:"Spirit"},
    {label:"Crit", key:"Crit"},
    {label:"Haste", key:"Haste"},
    {label:"Hit", key:"Hit Rating"}
  ];

  $("heroStats").innerHTML = important.map(function(stat) {
    return '<div class="gear-stat">' +
      '<span>' + escapeHtml(stat.label) + '</span>' +
      '<strong>' + Number(stats[stat.key] || 0).toLocaleString() + '</strong>' +
    '</div>';
  }).join("");
}

function renderHeroHeader() {
  const hero = selectedHero();
  const faction = hero.faction === "Horde" ? "Horde" : "Alliance";
  const factionBadge = $("heroFactionBadge");
  factionBadge.className = "gear-faction-badge wow-faction-crest wow-faction-crest--" + faction.toLowerCase();
  factionBadge.innerHTML = '<img src="' + Icons.resolve("faction", faction) + '" alt="" aria-hidden="true">';
  Icons.bindFallback(factionBadge.querySelector("img"));
  $("heroRace").textContent = hero.race + " · " + faction;
  $("heroName").textContent = hero.name;
  $("heroClass").textContent = hero.classLabel;
  $("heroSpec").textContent = hero.spec;
  $("heroLevel").textContent = hero.level;
  $("heroLevelBadge").textContent = hero.level;
  $("armorAccess").textContent = (ARMOR_ACCESS[hero.classId] || ["Cloth"]).join(" / ");

  const portrait = $("heroPortrait");
  portrait.src = Icons.iconUrl(hero.portrait);
  portrait.alt = hero.classLabel + " icon";
  Icons.bindFallback(portrait);

  const equippedItems = SLOT_ORDER.map(function(slot) { return getItem(hero.equipment[slot]); }).filter(Boolean);
  $("equippedCount").textContent = equippedItems.length;
  const highest = equippedItems.length ? Math.max.apply(null, equippedItems.map(function(item) { return item.tier; })) : 0;
  $("loadoutTier").textContent = highest ? "Loadout reaches Tier " + highest : "No gear equipped";
}

function equippedBySelectedHero(item) {
  const hero = selectedHero();
  return hero.equipment[item.slot] === item.id;
}

function itemStatsText(item) {
  if (!item.stats.length) return "No bonus stats";
  return item.stats.map(function(line) {
    return "+" + line.value + " " + line.stat;
  }).join(" · ");
}

function renderArmory() {
  const hero = selectedHero();
  const query = state.filters.query.trim().toLowerCase();

  let items = state.items.filter(function(item) {
    if (state.filters.tier !== "all" && item.tier !== Number(state.filters.tier)) return false;
    if (state.filters.slot !== "all" && item.slot !== state.filters.slot) return false;
    if (query && !(item.name + " " + item.family + " " + item.slot).toLowerCase().includes(query)) return false;
    if (state.filters.equippable && !canEquip(hero, item).ok) return false;
    return true;
  });

  items.sort(function(a, b) {
    if (a.tier !== b.tier) return b.tier - a.tier;
    if (a.slot !== b.slot) return SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
    return a.name.localeCompare(b.name);
  });

  $("armoryCount").textContent = items.length + " / " + state.items.length + " items";
  const root = $("armoryList");
  root.innerHTML = "";

  if (!items.length) {
    root.innerHTML = '<div class="armory-empty"><strong>No equipment matches.</strong><span>Change the filters or disable Equippable only.</span></div>';
    return;
  }

  items.forEach(function(item) {
    const eligibility = canEquip(hero, item);
    const equipped = equippedBySelectedHero(item);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "armory-item " + qualityClass(item) + (eligibility.ok ? "" : " locked") + (equipped ? " equipped" : "");
    if (!eligibility.ok) card.setAttribute("aria-disabled", "true");
    card.innerHTML =
      '<span class="armory-item-icon wow-icon-frame ' + qualityFrameClass(item) + (eligibility.ok ? "" : " is-locked") + (equipped ? " is-selected" : "") + '">' +
        '<img src="' + Icons.iconUrl(item.icon) + '" alt="">' +
        '<span class="wow-icon-tier">T' + item.tier + '</span>' +
      '</span>' +
      '<span class="armory-item-copy">' +
        '<span class="armory-item-top"><strong>' + escapeHtml(item.name) + '</strong><em>' + escapeHtml(item.quality) + '</em></span>' +
        '<small>' + escapeHtml(item.slot) + ' · ' + escapeHtml(item.family) + '</small>' +
        '<span class="armory-stats">' + escapeHtml(itemStatsText(item)) + '</span>' +
        (!eligibility.ok ? '<span class="armory-lock-reason">' + escapeHtml(eligibility.reason) + '</span>' : '') +
      '</span>' +
      '<span class="armory-equip-action">' + (equipped ? "Equipped" : eligibility.ok ? "Equip" : "Locked") + '</span>';
    Icons.bindFallback(card.querySelector("img"));
    Tooltips.attach(card, function() { return itemComparisonTooltip(item, hero); });

    if (eligibility.ok) {
      card.addEventListener("click", function() {
        const previous = getItem(hero.equipment[item.slot]);
        hero.equipment[item.slot] = item.id;
        toast((previous ? "Replaced " + previous.name + " with " : "Equipped ") + item.name);
        render();
      });
    }

    root.appendChild(card);
  });
}

function render() {
  renderRoster();
  renderHeroHeader();
  renderSlots();
  renderStats();
  renderArmory();
}

function toast(message) {
  const el = $("gearToast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(function() { el.hidden = true; }, 1800);
}

function showError(message) {
  $("gearError").textContent = message;
  $("gearError").classList.add("show");
}

function syncFilters() {
  state.filters.tier = $("tierFilter").value;
  state.filters.slot = $("slotFilter").value;
  state.filters.query = $("gearSearch").value;
  state.filters.equippable = $("equippableOnly").checked;
  renderArmory();
}

function resetRoster() {
  state.heroes = buildHeroes(state.classIndex);
  state.selectedHeroId = state.heroes[0] ? state.heroes[0].id : null;
  render();
  toast("Roster loadouts reset");
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load " + path);
  return response.json();
}

async function init() {
  try {
    Tooltips.hydrate(document);
    state.items = buildArmory();
    state.classIndex = await loadJson(CLASS_DATA_ROOT + "index.json");
    state.heroes = buildHeroes(state.classIndex);
    state.selectedHeroId = state.heroes[0] ? state.heroes[0].id : null;

    ["tierFilter", "slotFilter", "gearSearch", "equippableOnly"].forEach(function(id) {
      $(id).addEventListener(id === "gearSearch" ? "input" : "change", syncFilters);
    });
    $("resetGear").addEventListener("click", resetRoster);

    render();
  } catch (error) {
    showError(error.message + ". Serve the repository over HTTP with npm run dev.");
  }
}

init();
