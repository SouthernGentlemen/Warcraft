/*
 * Embark bar: manual Quest / Incursion / Dungeon launches from the bottom of Base. Heroes are
 * dragged in from the roster sidecar (or loaded from a saved party) and Embark hands the
 * encounter to Battle. Raids and sieges launch from Raids & Sieges instead.
 */
(function (global) {
  "use strict";

  const Campaign = global.WarcraftCampaign;
  const Roster = global.WarcraftRoster;
  const Progression = global.WarcraftContentProgression;
  const Icons = global.WowUIIcons;
  const Tooltips = global.WowUITooltips;
  const Sidecar = global.WarcraftRosterSidecar;
  const SLOT_LABELS = [
    "Rear left",
    "Rear right",
    "Middle left",
    "Middle right",
    "Front · high aggro"
  ];
  const INCURSION = { id: "frontier-incursion", label: "Frontier Incursion", partySize: 5 };

  function createController({ progression, dungeons, questOffers }) {
    Progression.configure(progression);
    const offersById = new Map(questOffers.offers.map(offer => [offer.id, offer]));
    let selectedKey = null;
    let slots = [];

    function starterPoolId() {
      const faction = Campaign.getActiveFaction();
      const starter =
        dungeons.dungeons.find(d => (d.faction.starter_for || []).includes(faction)) ||
        dungeons.dungeons[0];
      return starter.npc_pool_id;
    }

    function questOptions() {
      const boardLevel = Campaign.getBuildingLevel("questboard");
      Roster.advanceQuestRound(questOffers, boardLevel);
      Roster.ensureQuestRound(questOffers, boardLevel);
      const state = Roster.getState();
      const round = Roster.getQuestBoardState();
      return round.offerIds
        .map(id => offersById.get(id))
        .filter(Boolean)
        .filter(offer => {
          const prior = state.quests.find(
            quest => quest.round === round.round && quest.sourceOfferId === offer.id
          );
          return !prior || prior.status === "available";
        })
        .map(offer => ({
          key: "quest:" + offer.id,
          kind: "quest",
          label: offer.title,
          partySize: offer.party_size,
          offer
        }));
    }

    function options() {
      return Progression.available(Campaign.getBaseLevel()).flatMap(tier =>
        tier.id === "quest"
          ? questOptions()
          : tier.id === "incursion"
            ? [{ key: "incursion:" + INCURSION.id, kind: "incursion", ...INCURSION }]
            : tier.id === "dungeon"
              ? dungeons.dungeons.map(dungeon => ({
                  key: "dungeon:" + dungeon.id,
                  kind: "dungeon",
                  id: dungeon.id,
                  label: dungeon.display_name,
                  partySize: Roster.PARTY_SIZE,
                  dungeon
                }))
              : []
      );
    }

    function selected() {
      const all = options();
      return all.find(option => option.key === selectedKey) || all[0] || null;
    }

    function select(key) {
      selectedKey = key;
      const option = selected();
      const usable = id => {
        const hero = id && Roster.hero(id);
        return hero && hero.availability === "available" ? id : null;
      };
      slots = Array.from({ length: option ? option.partySize : 0 }, (_, i) => usable(slots[i]));
    }

    function place(heroId, index) {
      const hero = Roster.hero(heroId);
      if (!hero || hero.availability !== "available")
        throw new Error((hero ? hero.name : "That hero") + " is not available.");
      if (index < 0 || index >= slots.length) throw new Error("No such party slot.");
      slots = slots.map(id => (id === heroId ? null : id));
      slots[index] = heroId;
    }

    function remove(index) {
      slots[index] = null;
    }

    function loadParty(loadoutId) {
      const loadout = Roster.getState().loadouts.find(entry => entry.id === loadoutId);
      if (!loadout) return;
      const formation = Roster.partyFormation(loadout);
      slots = formation.slots.slice(0, slots.length).map(slot => slot.heroId || null);
    }

    function embark() {
      const option = selected();
      if (!option) throw new Error("Nothing is available to embark on yet.");
      const heroIds = slots.filter(Boolean);
      if (heroIds.length !== option.partySize)
        throw new Error("Fill all " + option.partySize + " party slots.");
      Campaign.validateHeroIds(heroIds);
      const clock = Campaign.getClock();
      const encounter = {
        kind: option.kind,
        faction: Campaign.getActiveFaction(),
        heroIds,
        partySize: option.partySize,
        seed: (clock.day * 1000 + clock.phaseAdvances * 17 + option.key.length) >>> 0,
        source: "embark",
        returnTo: "base.html",
        encounterName: option.label,
        npcPoolId: option.dungeon ? option.dungeon.npc_pool_id : starterPoolId()
      };
      if (option.kind === "quest") {
        const assignment = Roster.dispatchQuest(option.offer, heroIds);
        Object.assign(encounter, {
          questOfferId: option.offer.id,
          questAssignmentId: assignment.id,
          questRound: assignment.round,
          enemyCount:
            Number(option.offer.encounter && option.offer.encounter.enemy_count) || heroIds.length,
          reward: Object.assign({}, option.offer.reward || {})
        });
      }
      if (option.dungeon) {
        encounter.dungeonId = option.dungeon.id;
        encounter.dungeonName = option.dungeon.display_name;
      }
      Roster.setPendingEncounter(encounter);
      Campaign.confirmEmbark(encounter);
      slots = slots.map(() => null);
      return { encounter, href: "./battle.html?encounter=" + encodeURIComponent(option.kind) };
    }

    select(null);
    return {
      options,
      selected,
      select,
      place,
      remove,
      loadParty,
      embark,
      slots: () => slots.slice()
    };
  }

  function mount(root, data, { navigate = href => (global.location.href = href) } = {}) {
    const bar = createController(data);
    const content = document.createElement("select");
    content.className = "wow-select embark-bar__content";
    content.setAttribute("aria-label", "Content");
    const party = document.createElement("div");
    party.className = "embark-bar__party";
    const saved = document.createElement("select");
    saved.className = "wow-select embark-bar__saved";
    saved.setAttribute("aria-label", "Load a saved party");
    const go = document.createElement("button");
    go.type = "button";
    go.className = "wow-button wow-button--primary embark-bar__go";
    go.textContent = "Embark";
    const status = document.createElement("span");
    status.className = "embark-bar__status";
    status.setAttribute("role", "status");
    root.replaceChildren(content, party, saved, go, status);

    const report = error => (status.textContent = error ? error.message : "");
    const attempt = action => {
      try {
        action();
        report(null);
      } catch (error) {
        report(error);
      }
      draw();
    };

    function slotElement(heroId, index, formation) {
      const slot = document.createElement("div");
      slot.className = "embark-bar__slot" + (heroId ? " is-filled" : "");
      slot.dataset.slot = String(index);
      const hero = heroId ? Roster.hero(heroId) : null;
      if (hero) {
        slot.innerHTML =
          '<span class="wow-icon-frame wow-icon-frame--sm wow-icon-frame--class-' +
          hero.classId +
          '"><img src="' +
          Icons.resolve("race", hero.race) +
          '" alt="' +
          hero.name +
          '"></span>';
        slot.querySelectorAll("img").forEach(Icons.bindFallback);
        slot.addEventListener("click", () => attempt(() => bar.remove(index)));
      }
      Tooltips.attach(slot, () => ({
        title: hero ? hero.name : "Empty slot",
        type: formation ? SLOT_LABELS[index] : "Party slot " + (index + 1),
        description: hero ? "Click to remove." : "Drag a hero here from the roster."
      }));
      Sidecar.dropTarget(slot, dropped => attempt(() => bar.place(dropped, index)));
      return slot;
    }

    function draw() {
      const all = bar.options();
      const current = bar.selected();
      content.replaceChildren(
        ...all.map(option => {
          const node = document.createElement("option");
          node.value = option.key;
          node.textContent = option.label + " · " + option.partySize;
          node.selected = current && option.key === current.key;
          return node;
        })
      );
      content.disabled = !all.length;
      const formation = current && current.partySize === Roster.PARTY_SIZE;
      party.classList.toggle("is-formation", Boolean(formation));
      party.replaceChildren(...bar.slots().map((id, index) => slotElement(id, index, formation)));
      const ready = Roster.getState().loadouts.filter(
        loadout => Roster.validateLoadout(loadout, true).valid
      );
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = ready.length ? "Load party" : "No ready party";
      saved.replaceChildren(
        placeholder,
        ...ready.map(loadout => {
          const node = document.createElement("option");
          node.value = loadout.id;
          node.textContent = loadout.name;
          return node;
        })
      );
      saved.hidden = !formation;
      go.disabled = !current;
      if (!all.length) status.textContent = "Nothing to embark on yet.";
    }

    content.addEventListener("change", () => attempt(() => bar.select(content.value)));
    saved.addEventListener("change", () => attempt(() => bar.loadParty(saved.value)));
    go.addEventListener("click", () => {
      try {
        const launch = bar.embark();
        navigate(launch.href);
      } catch (error) {
        report(error);
        draw();
      }
    });
    for (const type of ["warcraft:roster-changed", "warcraft:campaign-changed"]) {
      global.addEventListener(type, () => {
        bar.select(content.value);
        draw();
      });
    }
    draw();
    return bar;
  }

  global.WarcraftEmbarkBar = Object.freeze({ mount });
})(window);
