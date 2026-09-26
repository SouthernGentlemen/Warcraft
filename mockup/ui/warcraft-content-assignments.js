(function (global) {
  "use strict";
  const Campaign = global.WarcraftCampaign,
    Roster = global.WarcraftRoster;
  if (!Campaign || !Roster)
    throw new Error("Campaign and Roster must load before WarcraftContentAssignments.");
  const SLOT_COUNT = 3,
    DURATION_PHASES = 2,
    TYPES = Object.freeze(["quest", "incursion", "dungeon"]);
  let catalog = null,
    processing = false;
  function clone(v) {
    return v == null ? v : JSON.parse(JSON.stringify(v));
  }
  // Also resolves work whose campaign time passed on a page that did not load this module.
  function configure(data) {
    catalog = data;
    if (!Campaign.getActiveCampaign().contentAssignments)
      Campaign.getActiveCampaign().contentAssignments = {};
    process();
    return api;
  }
  function def(type) {
    return catalog && catalog.content.find(x => x.id === type);
  }
  function unlocked(type) {
    const d = def(type);
    return Boolean(
      d && d.automation_base_level != null && Campaign.getBaseLevel() >= d.automation_base_level
    );
  }
  function state(type) {
    const raw = Campaign.getActiveCampaign().contentAssignments?.[type],
      slots = raw && Array.isArray(raw.slots) ? raw.slots : [];
    return {
      type,
      slots: Array.from({ length: SLOT_COUNT }, (_, i) => (slots[i] ? clone(slots[i]) : null))
    };
  }
  function persist(type, next) {
    const campaign = Campaign.getActiveCampaign();
    campaign.contentAssignments = campaign.contentAssignments || {};
    campaign.contentAssignments[type] = clone(next);
    Campaign.commit("content-assignment");
    return state(type);
  }
  function all() {
    return TYPES.flatMap(type => state(type).slots.filter(Boolean));
  }
  function assignmentForHero(id) {
    return all().find(x => x.heroId === String(id)) || null;
  }
  function assign(type, index, heroId, contentId) {
    if (!unlocked(type)) throw new Error(type + " automation is locked.");
    index = Number(index);
    if (!Number.isInteger(index) || index < 0 || index >= SLOT_COUNT)
      throw new Error("Invalid content assignment slot.");
    const hero = Roster.hero(String(heroId));
    if (!hero) throw new Error("Unknown hero.");
    Campaign.validateHeroIds([hero.id]);
    if (hero.availability !== "available" || assignmentForHero(hero.id))
      throw new Error(hero.name + " is unavailable.");
    const next = state(type);
    next.slots[index] = {
      type,
      slotIndex: index,
      heroId: hero.id,
      contentId: String(contentId),
      status: "assigned",
      startPhaseAdvance: Campaign.getClock().phaseAdvances,
      remainingCampaignPhases: DURATION_PHASES,
      attempt: 1
    };
    persist(type, next);
    Roster.updateHero(hero.id, { availability: "assigned" });
    return state(type).slots[index];
  }
  function remove(type, index) {
    const next = state(type),
      current = next.slots[index];
    if (current) {
      const hero = Roster.hero(current.heroId);
      if (hero && hero.availability === "assigned")
        Roster.updateHero(hero.id, { availability: "available" });
    }
    next.slots[index] = null;
    persist(type, next);
  }
  function process() {
    if (processing) return [];
    processing = true;
    try {
      const events = [];
      for (const type of TYPES) {
        if (!unlocked(type)) continue;
        const next = state(type);
        let changed = false;
        next.slots.forEach((a, i) => {
          if (!a) return;
          const elapsed = Campaign.getClock().phaseAdvances - Number(a.startPhaseAdvance || 0);
          a.remainingCampaignPhases = Math.max(0, DURATION_PHASES - elapsed);
          changed = true;
          if (a.remainingCampaignPhases > 0) return;
          const hero = Roster.hero(a.heroId);
          if (!hero) {
            next.slots[i] = null;
            return;
          }
          const success = true;
          if (success) {
            const xp = Roster.awardHeroXp([hero.id], type, { victory: true });
            events.push({
              type: "content_assignment_complete",
              contentKind: type,
              contentId: a.contentId,
              heroId: hero.id,
              xp
            });
            if (hero.availability === "assigned")
              Roster.updateHero(hero.id, { availability: "available" });
            next.slots[i] = null;
          } else {
            a.status = "failed";
            a.attempt = Number(a.attempt || 1) + 1;
            a.startPhaseAdvance = Campaign.getClock().phaseAdvances;
          }
        });
        if (changed) persist(type, next);
      }
      return events;
    } finally {
      processing = false;
    }
  }
  if (global.addEventListener)
    global.addEventListener("warcraft:campaign-changed", e => {
      if (e.detail?.reason === "clock") process();
    });
  const api = {
    configure,
    state,
    assign,
    remove
  };
  global.WarcraftContentAssignments = Object.freeze(api);
})(window);
