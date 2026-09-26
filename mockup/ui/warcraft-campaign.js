(function (global) {
  "use strict";

  const STORAGE_KEY = "warcraft.mockup.campaigns.v2";
  const FACTIONS = Object.freeze(["alliance", "horde"]);
  const DEFAULT_RESOURCES = Object.freeze({ gold: 25430, lumber: 12680, stone: 8440 });
  const ROSTER_CAPACITY_BY_BASE_LEVEL = Object.freeze({ 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 });

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
  function factionId(value) {
    const next = String(value || "").toLowerCase();
    return FACTIONS.includes(next) ? next : "alliance";
  }
  function clampLevel(value) {
    return Math.max(1, Math.min(5, Number(value) || 1));
  }
  function heroFaction(hero) {
    return String((hero && hero.faction) || "")
      .trim()
      .toLowerCase();
  }
  function rosterCapacityForLevel(level) {
    return ROSTER_CAPACITY_BY_BASE_LEVEL[clampLevel(level)];
  }
  function uniqueFactionHeroes(heroes, faction) {
    const seen = new Set();
    return (Array.isArray(heroes) ? heroes : []).filter(hero => {
      if (!hero || !hero.id || heroFaction(hero) !== faction || seen.has(String(hero.id)))
        return false;
      seen.add(String(hero.id));
      return true;
    });
  }
  function sanitizeHeroIdArray(values, ownedIds) {
    return (Array.isArray(values) ? values : []).map(String).filter(id => ownedIds.has(id));
  }
  function sanitizeReferenceValue(value, ownedIds, key, options) {
    const allowSlots = Boolean(options && options.allowSlots);
    if (Array.isArray(value)) {
      if (key === "heroIds") return sanitizeHeroIdArray(value, ownedIds);
      if (key === "slots" && allowSlots)
        return value.map(entry => {
          if (entry == null) return entry;
          if (typeof entry === "string") return ownedIds.has(entry) ? entry : null;
          return sanitizeReferenceValue(entry, ownedIds, "slot", options);
        });
      return value.map(entry => sanitizeReferenceValue(entry, ownedIds, "", options));
    }
    if (!value || typeof value !== "object") return value;
    const next = {};
    Object.entries(value).forEach(([childKey, childValue]) => {
      if (childKey === "heroId") {
        const id = childValue == null ? null : String(childValue);
        next[childKey] = id && ownedIds.has(id) ? id : null;
        return;
      }
      next[childKey] = sanitizeReferenceValue(childValue, ownedIds, childKey, options);
    });
    return next;
  }
  function sanitizeFactionReferencesRecord(campaign) {
    const ownedIds = new Set((campaign.heroes || []).map(hero => String(hero.id)));
    campaign.formations.party = (campaign.formations.party || []).map(record =>
      sanitizeReferenceValue(record, ownedIds, "formation")
    );
    campaign.formations.raid = (campaign.formations.raid || []).map(record =>
      sanitizeReferenceValue(record, ownedIds, "formation")
    );
    campaign.formations.siege = (campaign.formations.siege || []).map(record =>
      sanitizeReferenceValue(record, ownedIds, "formation", { allowSlots: true })
    );
    campaign.quests = (campaign.quests || []).map(record =>
      sanitizeReferenceValue(record, ownedIds, "quest")
    );
    if (campaign.pendingEncounter) {
      const source = campaign.pendingEncounter;
      const expected = Math.max(
        0,
        Number(source.partySize) || (Array.isArray(source.heroIds) ? source.heroIds.length : 0)
      );
      const pending = sanitizeReferenceValue(source, ownedIds, "encounter");
      campaign.pendingEncounter =
        pending.heroIds && pending.heroIds.length === expected ? pending : null;
    }
    campaign.dungeonRuns = (campaign.dungeonRuns || []).map(record =>
      sanitizeReferenceValue(record, ownedIds, "run")
    );
    campaign.embark = sanitizeReferenceValue(campaign.embark, ownedIds, "embark");
    campaign.buildingAssignments = sanitizeReferenceValue(
      campaign.buildingAssignments,
      ownedIds,
      "buildingAssignments"
    );
    campaign.contentAssignments = sanitizeReferenceValue(
      campaign.contentAssignments,
      ownedIds,
      "contentAssignments"
    );
    const selections =
      campaign.professionSelections && typeof campaign.professionSelections === "object"
        ? campaign.professionSelections
        : {};
    campaign.professionSelections = Object.fromEntries(
      Object.entries(selections).filter(([heroId]) => ownedIds.has(String(heroId)))
    );
    return campaign;
  }
  function collectReferencedHeroIds(value, key, output, options) {
    const out = output || [];
    const allowSlots = Boolean(options && options.allowSlots);
    if (Array.isArray(value)) {
      if (key === "heroIds") {
        value.forEach(id => out.push(String(id)));
        return out;
      }
      if (key === "slots" && allowSlots) {
        value.forEach(entry => {
          if (typeof entry === "string") out.push(entry);
          else collectReferencedHeroIds(entry, "slot", out, options);
        });
        return out;
      }
      value.forEach(entry => collectReferencedHeroIds(entry, "", out, options));
      return out;
    }
    if (!value || typeof value !== "object") return out;
    Object.entries(value).forEach(([childKey, childValue]) => {
      if (childKey === "heroId" && childValue != null) out.push(String(childValue));
      else collectReferencedHeroIds(childValue, childKey, out, options);
    });
    return out;
  }
  function enforceFactionHeroOwnership(state) {
    const order = [state.activeFaction, ...FACTIONS.filter(f => f !== state.activeFaction)];
    const seen = new Set();
    order.forEach(faction => {
      const campaign = state.campaigns[faction];
      campaign.heroes = (campaign.heroes || []).filter(hero => {
        const id = String(hero.id);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      sanitizeFactionReferencesRecord(campaign);
    });
    return state;
  }
  function defaultQuestBoard() {
    return { round: 1, seed: "questboard-v1", offerIds: [] };
  }
  function defaultClock() {
    return { day: 1, phase: "day", phaseAdvances: 0 };
  }
  function emptyCampaign(faction) {
    const campaign = {
      faction,
      base: {
        level: 1,
        buildingLevels: {},
        resources: Object.assign({}, DEFAULT_RESOURCES),
        bankHoldings: {}
      },
      heroes: [],
      formations: { party: [], raid: [], siege: [] },
      questBoard: defaultQuestBoard(),
      quests: [],
      pendingEncounter: null,
      dungeonRuns: [],
      embark: { active: null, history: [] },
      profession: { guildLevel: 1, activeTrack: "artisan", activeProfession: null },
      professionSelections: {},
      buildingAssignments: {},
      contentAssignments: {},
      clock: defaultClock()
    };
    return campaign;
  }
  function defaults() {
    return {
      version: 2,
      activeFaction: "alliance",
      campaigns: { alliance: emptyCampaign("alliance"), horde: emptyCampaign("horde") }
    };
  }
  function readStorage(key) {
    try {
      const value = global.localStorage && global.localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (_) {
      return null;
    }
  }
  function normalizeResources(raw) {
    const next = Object.assign({}, DEFAULT_RESOURCES, raw && typeof raw === "object" ? raw : {});
    Object.keys(DEFAULT_RESOURCES).forEach(key => {
      next[key] = Math.max(0, Number(next[key]) || 0);
    });
    return next;
  }
  function normalizeCampaign(raw, faction) {
    const source = raw && typeof raw === "object" ? raw : {};
    const baseSource = source.base && typeof source.base === "object" ? source.base : {};
    const formationSource =
      source.formations && typeof source.formations === "object" ? source.formations : {};
    const professionSource =
      source.profession && typeof source.profession === "object" ? source.profession : {};
    const clockSource = source.clock && typeof source.clock === "object" ? source.clock : {};
    const buildingLevels = {};
    Object.entries(baseSource.buildingLevels || source.buildingLevels || {}).forEach(
      ([id, level]) => {
        buildingLevels[String(id)] = clampLevel(level);
      }
    );
    const keepLevel = clampLevel(buildingLevels.keep || baseSource.level || source.baseLevel || 1);
    if (Object.prototype.hasOwnProperty.call(buildingLevels, "keep"))
      buildingLevels.keep = keepLevel;
    const bankHoldings = {};
    Object.entries(baseSource.bankHoldings || source.bankHoldings || {}).forEach(
      ([id, quantity]) => {
        bankHoldings[String(id)] = Math.max(0, Number(quantity) || 0);
      }
    );
    const board =
      source.questBoard && typeof source.questBoard === "object" ? source.questBoard : {};
    const embark = source.embark && typeof source.embark === "object" ? source.embark : {};
    const phase = clockSource.phase === "night" ? "night" : "day";
    const campaign = {
      faction,
      base: {
        level: keepLevel,
        buildingLevels,
        resources: normalizeResources(baseSource.resources || source.resources),
        bankHoldings
      },
      heroes: uniqueFactionHeroes(clone(source.heroes), faction),
      formations: {
        party: Array.isArray(formationSource.party)
          ? clone(formationSource.party)
          : Array.isArray(source.loadouts)
            ? clone(source.loadouts)
            : [],
        raid: Array.isArray(formationSource.raid) ? clone(formationSource.raid) : [],
        siege: Array.isArray(formationSource.siege) ? clone(formationSource.siege) : []
      },
      questBoard: {
        round: Math.max(1, Number(board.round) || 1),
        seed: String(board.seed || "questboard-v1"),
        offerIds: [...new Set((Array.isArray(board.offerIds) ? board.offerIds : []).map(String))]
      },
      quests: Array.isArray(source.quests) ? clone(source.quests) : [],
      pendingEncounter:
        source.pendingEncounter && typeof source.pendingEncounter === "object"
          ? clone(source.pendingEncounter)
          : null,
      dungeonRuns: Array.isArray(source.dungeonRuns) ? clone(source.dungeonRuns).slice(-50) : [],
      embark: {
        active: embark.active && typeof embark.active === "object" ? clone(embark.active) : null,
        history: Array.isArray(embark.history) ? clone(embark.history) : []
      },
      profession: {
        guildLevel: clampLevel(professionSource.guildLevel),
        activeTrack: ["artisan", "gathering", "survival"].includes(
          String(professionSource.activeTrack || "artisan")
        )
          ? String(professionSource.activeTrack || "artisan")
          : "artisan",
        activeProfession: professionSource.activeProfession
          ? String(professionSource.activeProfession)
          : null
      },
      professionSelections:
        source.professionSelections && typeof source.professionSelections === "object"
          ? clone(source.professionSelections)
          : {},
      buildingAssignments:
        source.buildingAssignments && typeof source.buildingAssignments === "object"
          ? clone(source.buildingAssignments)
          : {},
      contentAssignments:
        source.contentAssignments && typeof source.contentAssignments === "object"
          ? clone(source.contentAssignments)
          : {},
      clock: {
        day: Math.max(1, Number(clockSource.day) || 1),
        phase,
        phaseAdvances: Math.max(0, Number(clockSource.phaseAdvances) || 0)
      }
    };
    return sanitizeFactionReferencesRecord(campaign);
  }
  function normalizeState(raw) {
    const base = defaults();
    const source = raw && typeof raw === "object" ? raw : {};
    base.activeFaction = factionId(source.activeFaction);
    base.campaigns.alliance = normalizeCampaign(
      source.campaigns && source.campaigns.alliance,
      "alliance"
    );
    base.campaigns.horde = normalizeCampaign(source.campaigns && source.campaigns.horde, "horde");
    return enforceFactionHeroOwnership(base);
  }
  function load() {
    const current = readStorage(STORAGE_KEY);
    return current ? normalizeState(current) : defaults();
  }
  let state = load();

  function persist() {
    try {
      global.localStorage && global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }
  function detail(reason) {
    return {
      reason: String(reason || "campaign"),
      activeFaction: state.activeFaction,
      campaign: getActiveCampaign()
    };
  }
  function emit(reason) {
    if (typeof global.dispatchEvent !== "function" || typeof global.CustomEvent !== "function")
      return;
    global.dispatchEvent(
      new global.CustomEvent("warcraft:campaign-changed", { detail: detail(reason) })
    );
  }
  function commit(reason) {
    persist();
    emit(reason || "campaign");
    return getActiveCampaign();
  }
  function getActiveFaction() {
    return state.activeFaction;
  }
  function getCampaign(faction) {
    return state.campaigns[factionId(faction)];
  }
  function getActiveCampaign() {
    return getCampaign(state.activeFaction);
  }
  function setActiveFaction(faction) {
    const next = factionId(faction);
    if (next === state.activeFaction) return next;
    state.activeFaction = next;
    persist();
    emit("faction");
    return next;
  }
  function ensureBase(buildings) {
    let changed = false;
    for (const faction of FACTIONS) {
      const campaign = getCampaign(faction);
      (buildings || []).forEach(building => {
        if (!building || !building.id) return;
        if (!Object.prototype.hasOwnProperty.call(campaign.base.buildingLevels, building.id)) {
          campaign.base.buildingLevels[building.id] = clampLevel(building.level);
          changed = true;
        }
      });
      if (Object.prototype.hasOwnProperty.call(campaign.base.buildingLevels, "keep")) {
        const keep = clampLevel(campaign.base.buildingLevels.keep);
        if (campaign.base.level !== keep) {
          campaign.base.level = keep;
          changed = true;
        }
      }
    }
    if (changed) {
      persist();
      emit("base-init");
    }
    return getActiveCampaign().base;
  }
  function getBaseLevel(faction) {
    return getCampaign(faction || state.activeFaction).base.level;
  }
  function getRosterCapacity(faction) {
    return rosterCapacityForLevel(getBaseLevel(faction || state.activeFaction));
  }
  function validateHeroIds(heroIds, faction) {
    const target = factionId(faction || state.activeFaction);
    const campaign = getCampaign(target);
    const owned = new Set(campaign.heroes.map(hero => String(hero.id)));
    const ids = (Array.isArray(heroIds) ? heroIds : []).map(String);
    ids.forEach(id => {
      if (owned.has(id)) return;
      const other = FACTIONS.find(
        name => name !== target && getCampaign(name).heroes.some(hero => String(hero.id) === id)
      );
      if (other)
        throw new Error(
          "Hero " +
            id +
            " belongs to the " +
            (other === "horde" ? "Horde" : "Alliance") +
            " campaign."
        );
      throw new Error("Unknown hero " + id + " for the active faction.");
    });
    return ids;
  }
  function sanitizeFactionReferences(faction) {
    const target = factionId(faction || state.activeFaction);
    sanitizeFactionReferencesRecord(getCampaign(target));
    persist();
    return getCampaign(target);
  }
  function getBuildingLevels(faction) {
    return getCampaign(faction || state.activeFaction).base.buildingLevels;
  }
  function getBuildingLevel(id, fallback, faction) {
    const levels = getBuildingLevels(faction);
    return Object.prototype.hasOwnProperty.call(levels, id)
      ? clampLevel(levels[id])
      : clampLevel(fallback);
  }
  function getResources(faction) {
    return getCampaign(faction || state.activeFaction).base.resources;
  }
  function applyBaseUpgrade(buildingId, nextLevel, cost) {
    const campaign = getActiveCampaign();
    const id = String(buildingId);
    const current = getBuildingLevel(id, 1);
    const next = clampLevel(nextLevel);
    if (next !== current + 1) throw new Error("Invalid building level transition.");
    const prices = cost && typeof cost === "object" ? cost : {};
    for (const [key, value] of Object.entries(prices)) {
      if ((campaign.base.resources[key] || 0) < Number(value || 0))
        throw new Error("Insufficient " + key + ".");
    }
    for (const [key, value] of Object.entries(prices))
      campaign.base.resources[key] = (campaign.base.resources[key] || 0) - Number(value || 0);
    campaign.base.buildingLevels[id] = next;
    if (id === "keep") campaign.base.level = next;
    commit("base");
    return next;
  }
  function ensureBankHoldings(holdings) {
    let changed = false;
    for (const faction of FACTIONS) {
      const bank = getCampaign(faction).base.bankHoldings;
      (holdings || []).forEach(item => {
        if (!item || !item.id) return;
        if (!Object.prototype.hasOwnProperty.call(bank, item.id)) {
          bank[item.id] = Math.max(0, Number(item.quantity) || 0);
          changed = true;
        }
      });
    }
    if (changed) {
      persist();
      emit("bank-init");
    }
    return getActiveCampaign().base.bankHoldings;
  }
  function getBankHoldings(faction) {
    return getCampaign(faction || state.activeFaction).base.bankHoldings;
  }
  function getBankHoldingQuantity(id, faction) {
    return Math.max(0, Number(getBankHoldings(faction)[id]) || 0);
  }
  function getProfessionState(faction) {
    return getCampaign(faction || state.activeFaction).profession;
  }
  function setProfessionState(patch) {
    const current = getActiveCampaign().profession;
    const next = patch && typeof patch === "object" ? patch : {};
    if (next.guildLevel != null) current.guildLevel = clampLevel(next.guildLevel);
    if (Object.prototype.hasOwnProperty.call(next, "activeTrack")) {
      const track = String(next.activeTrack || "artisan");
      current.activeTrack = ["artisan", "gathering", "survival"].includes(track)
        ? track
        : "artisan";
    }
    if (Object.prototype.hasOwnProperty.call(next, "activeProfession"))
      current.activeProfession = next.activeProfession ? String(next.activeProfession) : null;
    commit("profession");
    return current;
  }
  function getProfessionSelections(faction) {
    return getCampaign(faction || state.activeFaction).professionSelections;
  }
  function setProfessionSelection(heroId, selection) {
    const next = clone(selection);
    validateHeroIds([heroId, ...collectReferencedHeroIds(next)]);
    getActiveCampaign().professionSelections[String(heroId)] = next;
    commit("profession-selection");
    return getActiveCampaign().professionSelections[String(heroId)];
  }
  function getBuildingAssignments(faction) {
    return getCampaign(faction || state.activeFaction).buildingAssignments;
  }
  function setBuildingAssignment(buildingId, assignment) {
    const next = clone(assignment);
    validateHeroIds(collectReferencedHeroIds(next));
    getActiveCampaign().buildingAssignments[String(buildingId)] = next;
    commit("building-assignment");
    return next;
  }
  function getClock(faction) {
    return getCampaign(faction || state.activeFaction).clock;
  }
  function nextClockPhase(clock) {
    const current = clock && clock.phase === "night" ? "night" : "day";
    return current === "day" ? "night" : "day";
  }
  function confirmEmbark(record) {
    const source = record && typeof record === "object" ? clone(record) : {};
    if (source.faction && factionId(source.faction) !== state.activeFaction)
      throw new Error("Embark faction must match the active campaign.");
    const heroIds = collectReferencedHeroIds(source);
    validateHeroIds(heroIds);
    const campaign = getActiveCampaign(),
      before = clone(campaign.clock);
    const sequence = campaign.embark.history.length + 1;
    const entry = Object.assign({}, source, {
      sequence,
      faction: state.activeFaction,
      heroIds: [...new Set((Array.isArray(source.heroIds) ? source.heroIds : heroIds).map(String))],
      confirmedClock: before
    });
    campaign.clock.phase = nextClockPhase(campaign.clock);
    campaign.clock.phaseAdvances += 1;
    if (campaign.clock.phase === "day") campaign.clock.day += 1;
    entry.resultingClock = clone(campaign.clock);
    campaign.embark.active = clone(entry);
    campaign.embark.history.push(clone(entry));
    campaign.embark.history = campaign.embark.history.slice(-100);
    commit("clock");
    return clone(entry);
  }

  persist();

  global.WarcraftCampaign = Object.freeze({
    FACTIONS,
    getActiveFaction,
    setActiveFaction,
    getCampaign,
    getActiveCampaign,
    commit,
    ensureBase,
    getBaseLevel,
    getRosterCapacity,
    getBuildingLevels,
    getBuildingLevel,
    getResources,
    applyBaseUpgrade,
    ensureBankHoldings,
    getBankHoldingQuantity,
    getProfessionState,
    setProfessionState,
    getProfessionSelections,
    setProfessionSelection,
    getBuildingAssignments,
    setBuildingAssignment,
    validateHeroIds,
    sanitizeFactionReferences,
    getClock,
    nextClockPhase,
    confirmEmbark
  });
})(window);
