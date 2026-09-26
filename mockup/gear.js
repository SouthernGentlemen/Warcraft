const CLASS_DATA_ROOT = "../data/heroes/classes/";
const RACE_DATA_ROOT = "../data/heroes/races/";
const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;

const SLOT_ORDER = ["Head", "Chest", "Pants", "Feet", "Gloves", "Weapon", "Trinket"];
const Roster = window.WarcraftRoster;
const LEFT_SLOTS = ["Head", "Chest", "Gloves"];
const RIGHT_SLOTS = ["Pants", "Feet", "Weapon", "Trinket"];
const PRIMARY_ITEM_STATS = ["Strength", "Agility", "Intellect", "Stamina"];

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

const BASELINE = {
  1: { major: 12, minor: 4, stamina: 14, spirit: 10, crit: 0, haste: 0, hit: 0, mastery: 0 },
  2: { major: 20, minor: 6, stamina: 22, spirit: 16, crit: 1, haste: 1, hit: 1, mastery: 0 },
  3: { major: 30, minor: 8, stamina: 32, spirit: 23, crit: 2, haste: 2, hit: 2, mastery: 1 },
  4: { major: 42, minor: 10, stamina: 44, spirit: 31, crit: 4, haste: 4, hit: 3, mastery: 2 },
  5: { major: 56, minor: 12, stamina: 58, spirit: 40, crit: 6, haste: 6, hit: 4, mastery: 4 }
};

const $ = id => document.getElementById(id);
const state = {
  classIndex: null,
  raceIndex: null,
  heroes: [],
  items: [],
  selectedHeroId: null,
  filters: { tier: "all", slot: "all", query: "", equippable: true }
};

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(
    /[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function canEquip(hero, item) {
  if (item.tier > hero.level) return { ok: false, reason: "Requires hero level " + item.tier };
  if (item.slot === "Weapon" || item.slot === "Trinket") return { ok: true, reason: "" };
  const allowed = ARMOR_ACCESS[hero.classId] || ["Cloth"];
  if (!allowed.includes(item.family)) {
    return { ok: false, reason: hero.classLabel + " cannot equip " + item.family };
  }
  return { ok: true, reason: "" };
}

function raceMetaByLabel(label) {
  for (const faction of Object.values(state.raceIndex.factions)) {
    const race = faction.races.find(function (entry) {
      return entry.label === label;
    });
    if (race) return { race: race, faction: faction };
  }
  return null;
}

function validateHeroRaceClass(hero) {
  const meta = raceMetaByLabel(hero.race);
  if (!meta) throw new Error("Unknown race " + hero.race);
  if (!meta.race.available_classes.includes(hero.classLabel)) {
    throw new Error(
      hero.race + " cannot be " + hero.classLabel + " under the Classic race/class rules."
    );
  }
  return meta;
}

function buildHeroes(classIndex) {
  const rosterHeroes = Roster.getState().heroes;
  return rosterHeroes.map(function (source) {
    const classMeta = classIndex.classes.find(function (entry) {
      return entry.id === source.classId;
    });
    const hero = Object.assign({}, source, {
      classLabel: source.classLabel || classMeta.label,
      portrait: Icons.resolveSlug("race", source.race),
      classIcon: Icons.resolveSlug("class", source.classId),
      equipment: Object.assign({}, source.equipment)
    });
    validateHeroRaceClass(hero);
    return hero;
  });
}

function selectedHero() {
  return (
    state.heroes.find(function (hero) {
      return hero.id === state.selectedHeroId;
    }) || state.heroes[0]
  );
}

function getItem(itemId) {
  return state.items.find(function (item) {
    return item.id === itemId;
  });
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
  const primaryStats = item.stats.filter(function (line) {
    return PRIMARY_ITEM_STATS.includes(line.stat);
  });
  const secondaryStats = item.stats.filter(function (line) {
    return !PRIMARY_ITEM_STATS.includes(line.stat);
  });
  const stats = [];

  primaryStats.forEach(function (line) {
    stats.push({ label: "Primary · " + line.stat, value: "+" + line.value });
  });
  secondaryStats.forEach(function (line) {
    stats.push({ label: "Secondary · " + line.stat, value: "+" + line.value });
  });
  if (!stats.length) stats.push({ label: "Bonus stats", value: "None" });

  return {
    variant: "item",
    title: item.name,
    type: item.slot,
    quality: item.qualityKey,
    badge: config.badge || "",
    icon: { slug: item.icon, quality: item.qualityKey },
    requirements: [
      { label: "Required level", value: String(item.tier) },
      { label: "Slot", value: item.slot },
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
    description:
      config.description ||
      (eligibility.ok
        ? "Usable by " + hero.classLabel + "."
        : "This item cannot currently be equipped."),
    stats: stats,
    meta: [
      { label: "Quality", value: item.quality },
      { label: "Tier", value: "T" + item.tier },
      { label: "Equipped", value: equippedBySelectedHero(item) ? "Yes" : "No" },
      {
        label: "Availability",
        value: equippedBySelectedHero(item)
          ? "Equipped"
          : eligibility.ok
            ? "Equippable"
            : "Unavailable"
      }
    ],
    locked: eligibility.ok ? [] : [eligibility.reason]
  };
}

function itemComparisonTooltip(item, hero) {
  const model = itemTooltipModel(item, hero, {
    badge: equippedBySelectedHero(item) ? "Equipped" : "Candidate"
  });
  if (!model || equippedBySelectedHero(item)) return model;
  const equipped = getItem(hero.equipment[item.slot]);
  if (equipped && equipped.id !== item.id) {
    model.comparison = itemTooltipModel(equipped, hero, {
      badge: "Equipped",
      description: "Currently equipped in this slot."
    });
  }
  return model;
}

function loadoutMembership(heroId) {
  return Roster.getState()
    .loadouts.map((l, i) => (l.heroIds.includes(heroId) ? i + 1 : null))
    .filter(Boolean);
}
function filteredRoster() {
  let heroes = state.heroes.slice();
  const cf = $("rosterClassFilter").value,
    af = $("rosterAvailabilityFilter").value,
    sort = $("rosterSort").value;
  if (cf !== "all") heroes = heroes.filter(h => h.classId === cf);
  if (af !== "all") heroes = heroes.filter(h => h.availability === af);
  heroes.sort((a, b) =>
    sort === "level"
      ? b.level - a.level
      : sort === "class"
        ? a.classLabel.localeCompare(b.classLabel)
        : a.name.localeCompare(b.name)
  );
  return heroes;
}
function renderRoster() {
  const root = $("heroRoster");
  root.innerHTML = "";
  const heroes = filteredRoster();
  $("rosterCount").textContent = heroes.length + " / " + state.heroes.length + " heroes";
  heroes.forEach(function (hero) {
    const equipped = Object.values(hero.equipment).filter(Boolean).length,
      members = loadoutMembership(hero.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "hero-roster-card" +
      (hero.id === state.selectedHeroId ? " active" : "") +
      (hero.availability !== "available" ? " is-unavailable" : "");
    button.innerHTML =
      '<span class="roster-avatar wow-icon-frame"><img src="' +
      Icons.iconUrl(hero.portrait) +
      '" alt=""><span class="roster-class-badge wow-icon-frame wow-icon-frame--class-' +
      hero.classId +
      '" aria-hidden="true"><img src="' +
      Icons.iconUrl(hero.classIcon) +
      '" alt=""></span><b>' +
      hero.level +
      '</b></span><span class="roster-copy"><strong>' +
      escapeHtml(hero.name) +
      "</strong><small>" +
      escapeHtml(hero.race) +
      " · " +
      escapeHtml(hero.faction) +
      '</small><em class="wow-class--' +
      hero.classId +
      '">' +
      escapeHtml(hero.classLabel) +
      " · " +
      escapeHtml(hero.spec) +
      " · " +
      equipped +
      '/7</em><small class="roster-state">' +
      (hero.availability === "available" ? "Available" : "On quest") +
      (members.length ? " · Parties " + members.join(", ") : " · No saved party") +
      '</small></span><span class="roster-arrow" aria-hidden="true"></span>';
    button.querySelectorAll("img").forEach(Icons.bindFallback);
    button.addEventListener("click", function () {
      state.selectedHeroId = hero.id;
      closeSlotPicker();
      render();
    });
    root.appendChild(button);
  });
}
function renderPartyLoadouts() {
  const root = $("partyLoadouts");
  root.innerHTML = "";
  Roster.getState().loadouts.forEach(function (loadout, index) {
    const validation = Roster.validateLoadout(loadout, false),
      live = Roster.validateLoadout(loadout, true),
      card = document.createElement("article");
    card.className = "party-loadout" + (loadout.ready ? " is-ready" : "");
    card.innerHTML =
      '<div class="party-loadout-head"><input class="wow-input party-name" value="' +
      escapeHtml(loadout.name) +
      '" aria-label="Party ' +
      (index + 1) +
      ' name"><select class="wow-select party-size" aria-label="Party size">' +
      Roster.PARTY_SIZES.map(
        size =>
          '<option value="' +
          size +
          '"' +
          (size === loadout.size ? " selected" : "") +
          ">" +
          size +
          " heroes</option>"
      ).join("") +
      "</select><strong>Slot " +
      (index + 1) +
      '</strong></div><div class="party-members"></div><div class="party-status">' +
      (loadout.ready ? (live.valid ? "READY" : "SAVED · " + live.reason) : validation.reason) +
      '</div><button class="wow-button party-ready" type="button">' +
      (loadout.ready ? "Mark Editing" : "Mark Ready") +
      "</button>";
    const members = card.querySelector(".party-members");
    state.heroes.forEach(function (hero) {
      const selected = loadout.heroIds.includes(hero.id),
        btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "party-member" +
        (selected ? " is-selected" : "") +
        (hero.availability !== "available" ? " is-unavailable" : "");
      btn.disabled = !selected && loadout.heroIds.length >= loadout.size;
      btn.setAttribute("aria-pressed", selected ? "true" : "false");
      btn.innerHTML =
        '<span class="wow-icon-frame wow-icon-frame--xs wow-icon-frame--class-' +
        hero.classId +
        '"><img src="' +
        Icons.resolve("class", hero.classId) +
        '" alt=""></span><span>' +
        escapeHtml(hero.name) +
        "<small>" +
        escapeHtml(hero.classLabel) +
        " · " +
        (hero.availability === "available" ? "Available" : "On quest") +
        "</small></span>";
      Icons.bindFallback(btn.querySelector("img"));
      btn.addEventListener("click", function () {
        let ids = loadout.heroIds.slice();
        ids = selected ? ids.filter(id => id !== hero.id) : ids.concat(hero.id);
        Roster.updateLoadout(index, { heroIds: ids, ready: false });
        render();
      });
      members.appendChild(btn);
    });
    card.querySelector(".party-name").addEventListener("change", e => {
      Roster.updateLoadout(index, { name: e.target.value });
      render();
    });
    card.querySelector(".party-size").addEventListener("change", e => {
      Roster.updateLoadout(index, { size: Number(e.target.value), ready: false });
      render();
    });
    card.querySelector(".party-ready").addEventListener("click", () => {
      if (loadout.ready) {
        Roster.updateLoadout(index, { ready: false });
        render();
        return;
      }
      const check = Roster.validateLoadout(loadout, false);
      if (!check.valid) {
        toast(check.reason);
        return;
      }
      Roster.updateLoadout(index, { ready: true });
      render();
    });
    root.appendChild(card);
  });
}

function slotMarkup(hero, slot) {
  const item = getItem(hero.equipment[slot]);
  if (!item) {
    return (
      '<span class="gear-slot-label">' +
      escapeHtml(slot) +
      "</span>" +
      '<span class="gear-slot-icon empty wow-icon-frame is-disabled">' +
      '<img src="' +
      Icons.resolve("equipment-slot", slot) +
      '" alt="">' +
      "</span>"
    );
  }

  return (
    '<span class="gear-slot-label">' +
    escapeHtml(slot) +
    "</span>" +
    '<span class="gear-slot-icon wow-icon-frame ' +
    qualityFrameClass(item) +
    '">' +
    '<img src="' +
    Icons.iconUrl(item.icon) +
    '" alt="">' +
    "</span>"
  );
}

function persistGear() {
  state.heroes.forEach(function (hero) {
    Roster.setEquipment(hero.id, hero.equipment);
  });
}

function closeSlotPicker() {
  const picker = $("gearSlotPicker");
  if (picker) picker.remove();
}

function openSlotPicker(anchor, slot) {
  closeSlotPicker();
  const hero = selectedHero();
  const current = getItem(hero.equipment[slot]);
  const candidates = state.items
    .filter(function (item) {
      return item.slot === slot && canEquip(hero, item).ok;
    })
    .sort(function (a, b) {
      return b.tier - a.tier || a.name.localeCompare(b.name);
    });
  const picker = document.createElement("div");
  picker.id = "gearSlotPicker";
  picker.className = "gear-slot-picker wow-frame";
  picker.setAttribute("role", "dialog");
  picker.setAttribute("aria-label", slot + " item picker");
  picker.innerHTML =
    '<div class="gear-slot-picker__head"><strong>' +
    escapeHtml(slot) +
    '</strong><span>Choose equipment</span></div><div class="gear-slot-picker__list wow-scroll"></div>';
  const list = picker.querySelector(".gear-slot-picker__list");
  candidates.forEach(function (item) {
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className =
      "gear-picker-item " +
      qualityClass(item) +
      (current && current.id === item.id ? " is-equipped" : "");
    entry.setAttribute(
      "aria-label",
      (current && current.id === item.id ? "Equipped: " : "Equip ") + item.name + " in " + slot
    );
    entry.innerHTML =
      '<span class="wow-icon-frame wow-icon-frame--sm ' +
      qualityFrameClass(item) +
      '"><img src="' +
      Icons.iconUrl(item.icon) +
      '" alt=""></span><span><strong>' +
      escapeHtml(item.name) +
      "</strong><small>" +
      escapeHtml(item.quality) +
      "</small></span>" +
      (current && current.id === item.id ? "<em>Equipped</em>" : "");
    Icons.bindFallback(entry.querySelector("img"));
    Tooltips.attach(entry, function () {
      return itemComparisonTooltip(item, hero);
    });
    entry.addEventListener("click", function () {
      const previous = current;
      hero.equipment[slot] = item.id;
      persistGear();
      closeSlotPicker();
      toast((previous ? "Replaced " + previous.name + " with " : "Equipped ") + item.name);
      render();
    });
    list.appendChild(entry);
  });
  if (current) {
    const unequip = document.createElement("button");
    unequip.type = "button";
    unequip.className = "gear-picker-unequip";
    unequip.textContent = "Unequip " + current.name;
    unequip.addEventListener("click", function () {
      hero.equipment[slot] = null;
      persistGear();
      closeSlotPicker();
      toast("Unequipped " + current.name);
      render();
    });
    list.appendChild(unequip);
  }
  document.body.appendChild(picker);
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 16);
  picker.style.width = width + "px";
  picker.style.left = Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8)) + "px";
  picker.style.top =
    Math.max(8, Math.min(rect.top, window.innerHeight - Math.min(420, picker.scrollHeight) - 8)) +
    "px";
  const first = picker.querySelector("button");
  if (first) first.focus();
}

function renderSlots() {
  const hero = selectedHero();
  function fill(rootId, slots) {
    const root = $(rootId);
    root.innerHTML = "";
    slots.forEach(function (slot) {
      const item = getItem(hero.equipment[slot]);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gear-slot" + (item ? " filled" : " empty");
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute(
        "aria-label",
        item ? slot + ": " + item.name + ". Open item picker." : slot + ": empty. Open item picker."
      );
      button.innerHTML = slotMarkup(hero, slot);
      const img = button.querySelector("img");
      if (img) Icons.bindFallback(img);
      if (item)
        Tooltips.attach(button, function () {
          return itemTooltipModel(item, hero, {
            badge: "Equipped",
            description: "Open this slot to compare, replace, or unequip."
          });
        });
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        openSlotPicker(button, slot);
      });
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
    Strength: base.minor,
    Agility: base.minor,
    Intellect: base.minor,
    Stamina: base.stamina,
    Spirit: base.spirit,
    Crit: base.crit,
    Haste: base.haste,
    "Hit Rating": base.hit,
    Mastery: base.mastery
  };
  stats[hero.primary] = base.major;

  Object.values(hero.equipment).forEach(function (itemId) {
    const item = getItem(itemId);
    if (!item) return;
    item.stats.forEach(function (line) {
      addStat(stats, line.stat, line.value);
    });
  });

  stats.Health = 500 + stats.Stamina * 50;
  stats.Power =
    hero.primary === "Intellect"
      ? stats.Intellect * 10
      : Math.max(stats.Strength, stats.Agility) * 10;

  return stats;
}

function renderStats() {
  const hero = selectedHero();
  const stats = heroStats(hero);
  const important = [
    { label: "Health", key: "Health" },
    { label: hero.primary, key: hero.primary },
    { label: "Power", key: "Power" },
    { label: "Stamina", key: "Stamina" },
    { label: "Spirit", key: "Spirit" },
    { label: "Crit", key: "Crit" },
    { label: "Haste", key: "Haste" },
    { label: "Hit", key: "Hit Rating" }
  ];

  $("heroStats").innerHTML = important
    .map(function (stat) {
      return (
        '<div class="gear-stat">' +
        "<span>" +
        escapeHtml(stat.label) +
        "</span>" +
        "<strong>" +
        Number(stats[stat.key] || 0).toLocaleString() +
        "</strong>" +
        "</div>"
      );
    })
    .join("");
}

function renderHeroHeader() {
  const hero = selectedHero();
  const faction = hero.faction === "Horde" ? "Horde" : "Alliance";
  const factionBadge = $("heroFactionBadge");
  factionBadge.className =
    "gear-faction-badge wow-faction-crest wow-faction-crest--" + faction.toLowerCase();
  factionBadge.innerHTML =
    '<img src="' + Icons.resolve("faction", faction) + '" alt="" aria-hidden="true">';
  Icons.bindFallback(factionBadge.querySelector("img"));
  $("heroRace").textContent = hero.race + " · " + faction;
  $("heroName").textContent = hero.name;
  $("heroClass").textContent = hero.classLabel;
  $("heroSpec").textContent = hero.spec;
  $("heroLevel").textContent = hero.level;
  $("heroLevelBadge").textContent = hero.level;
  $("armorAccess").textContent = (ARMOR_ACCESS[hero.classId] || ["Cloth"]).join(" / ");

  const classIcon = $("heroClassIcon");
  classIcon.className =
    "gear-class-icon wow-icon-frame wow-icon-frame--sm wow-icon-frame--class-" + hero.classId;
  const classImage = classIcon.querySelector("img");
  classImage.src = Icons.iconUrl(hero.classIcon);
  classImage.alt = hero.classLabel + " class icon";
  Icons.bindFallback(classImage);

  const portrait = $("heroPortrait");
  portrait.src = Icons.iconUrl(hero.portrait);
  portrait.alt = hero.race + " character portrait";
  Icons.bindFallback(portrait);

  const equippedItems = SLOT_ORDER.map(function (slot) {
    return getItem(hero.equipment[slot]);
  }).filter(Boolean);
  $("equippedCount").textContent = equippedItems.length;
  const highest = equippedItems.length
    ? Math.max.apply(
        null,
        equippedItems.map(function (item) {
          return item.tier;
        })
      )
    : 0;
  $("loadoutTier").textContent = highest ? "Loadout reaches Tier " + highest : "No gear equipped";
}

function equippedBySelectedHero(item) {
  const hero = selectedHero();
  return hero.equipment[item.slot] === item.id;
}

function renderArmory() {
  const hero = selectedHero();
  const query = state.filters.query.trim().toLowerCase();

  let items = state.items.filter(function (item) {
    if (state.filters.tier !== "all" && item.tier !== Number(state.filters.tier)) return false;
    if (state.filters.slot !== "all" && item.slot !== state.filters.slot) return false;
    if (query && !(item.name + " " + item.family + " " + item.slot).toLowerCase().includes(query))
      return false;
    if (state.filters.equippable && !canEquip(hero, item).ok) return false;
    return true;
  });

  items.sort(function (a, b) {
    if (a.tier !== b.tier) return b.tier - a.tier;
    if (a.slot !== b.slot) return SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
    return a.name.localeCompare(b.name);
  });

  $("armoryCount").textContent = items.length + " / " + state.items.length + " items";
  const root = $("armoryList");
  root.innerHTML = "";

  if (!items.length) {
    root.innerHTML =
      '<div class="armory-empty"><strong>No equipment matches.</strong><span>Change the filters or disable Equippable only.</span></div>';
    return;
  }

  items.forEach(function (item) {
    const eligibility = canEquip(hero, item);
    const equipped = equippedBySelectedHero(item);
    const card = document.createElement("button");
    card.type = "button";
    card.className =
      "armory-item " +
      qualityClass(item) +
      (eligibility.ok ? "" : " locked") +
      (equipped ? " equipped" : "");
    card.setAttribute(
      "aria-label",
      item.name +
        ". " +
        item.quality +
        " T" +
        item.tier +
        " " +
        item.slot +
        ". " +
        (equipped ? "Equipped." : eligibility.ok ? "Click to equip." : eligibility.reason + ".")
    );
    if (!eligibility.ok) card.setAttribute("aria-disabled", "true");
    card.innerHTML =
      '<span class="armory-item-icon wow-icon-frame ' +
      qualityFrameClass(item) +
      (eligibility.ok ? "" : " is-locked") +
      (equipped ? " is-selected" : "") +
      '">' +
      '<img src="' +
      Icons.iconUrl(item.icon) +
      '" alt="">' +
      (equipped ? '<span class="armory-equipped-mark" aria-hidden="true">E</span>' : "") +
      "</span>";
    Icons.bindFallback(card.querySelector("img"));
    Tooltips.attach(card, function () {
      return itemComparisonTooltip(item, hero);
    });

    if (eligibility.ok) {
      card.addEventListener("click", function () {
        const previous = getItem(hero.equipment[item.slot]);
        hero.equipment[item.slot] = item.id;
        persistGear();
        toast((previous ? "Replaced " + previous.name + " with " : "Equipped ") + item.name);
        render();
      });
    }

    root.appendChild(card);
  });
}

function render() {
  Tooltips.hide();
  renderRoster();
  renderPartyLoadouts();
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
  toast.timer = setTimeout(function () {
    el.hidden = true;
  }, 1800);
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
  Roster.reset();
  state.heroes = buildHeroes(state.classIndex);
  state.selectedHeroId = state.heroes[0] ? state.heroes[0].id : null;
  closeSlotPicker();
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
    state.items = window.WarcraftEquipment.build();
    const loaded = await Promise.all([
      loadJson(CLASS_DATA_ROOT + "index.json"),
      loadJson(RACE_DATA_ROOT + "index.json")
    ]);
    state.classIndex = loaded[0];
    state.raceIndex = loaded[1];
    state.heroes = buildHeroes(state.classIndex);
    state.selectedHeroId = state.heroes[0] ? state.heroes[0].id : null;
    state.classIndex.classes.forEach(function (meta) {
      const option = document.createElement("option");
      option.value = meta.id;
      option.textContent = meta.label;
      $("rosterClassFilter").appendChild(option);
    });
    ["rosterClassFilter", "rosterAvailabilityFilter", "rosterSort"].forEach(function (id) {
      $(id).addEventListener("change", render);
    });

    ["tierFilter", "slotFilter", "gearSearch", "equippableOnly"].forEach(function (id) {
      $(id).addEventListener(id === "gearSearch" ? "input" : "change", syncFilters);
    });
    $("resetGear").addEventListener("click", resetRoster);

    document.addEventListener("click", function (event) {
      const picker = $("gearSlotPicker");
      if (picker && !picker.contains(event.target) && !event.target.closest(".gear-slot"))
        closeSlotPicker();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeSlotPicker();
    });
    window.addEventListener("warcraft:roster-changed", function () {
      state.heroes = buildHeroes(state.classIndex);
      if (!state.heroes.some(h => h.id === state.selectedHeroId))
        state.selectedHeroId = state.heroes[0]?.id || null;
      render();
    });
    render();
  } catch (error) {
    showError(error.message + ". Serve the repository over HTTP with npm run dev.");
  }
}

init();
