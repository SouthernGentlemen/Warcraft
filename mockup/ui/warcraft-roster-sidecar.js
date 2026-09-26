/*
 * Roster sidecar: the one hero list on Base. Each available hero is a drag source for every
 * assignment (Embark party slots, building slots, Quest Board automation); `dropTarget` wires
 * any element to accept them.
 */
(function (global) {
  "use strict";

  const Roster = global.WarcraftRoster;
  const Icons = global.WowUIIcons;
  const Tooltips = global.WowUITooltips;
  const HERO_TYPE = "text/warcraft-hero-id";

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
    );
  }

  function statusLabel(hero) {
    const value = String(hero.availability || "available").replace(/-/g, " ");
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function heroTooltip(hero) {
    const progress = Roster.getHeroProgress(hero.id);
    return {
      title: hero.name,
      type: [hero.race, hero.classLabel, hero.spec].filter(Boolean).join(" · "),
      stats: [
        { label: "Level", value: String(hero.level) },
        { label: "XP", value: progress.xp + " / " + progress.maxXp },
        { label: "Status", value: statusLabel(hero) }
      ]
    };
  }

  function heroRow(hero, onOpenHero) {
    const available = hero.availability === "available";
    const row = document.createElement("div");
    row.className = "roster-sidecar__hero" + (available ? "" : " is-unavailable");
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.draggable = available;
    row.dataset.heroId = hero.id;
    row.innerHTML =
      '<span class="wow-icon-frame wow-icon-frame--sm wow-icon-frame--class-' +
      hero.classId +
      '"><img src="' +
      Icons.resolve("race", hero.race) +
      '" alt=""></span><span class="roster-sidecar__name">' +
      escapeHtml(hero.name) +
      "</span>";
    row.querySelectorAll("img").forEach(Icons.bindFallback);
    Tooltips.attach(row, () => heroTooltip(hero));
    row.addEventListener("dragstart", event => {
      event.dataTransfer.setData(HERO_TYPE, hero.id);
      event.dataTransfer.setData("text/plain", hero.id);
      event.dataTransfer.effectAllowed = "move";
    });
    if (onOpenHero) {
      row.addEventListener("click", () => onOpenHero(hero.id));
      row.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") onOpenHero(hero.id);
      });
    }
    return row;
  }

  function mount(root, { onOpenHero } = {}) {
    const draw = () =>
      root.replaceChildren(...Roster.getState().heroes.map(hero => heroRow(hero, onOpenHero)));
    draw();
    for (const type of [
      "warcraft:roster-changed",
      "warcraft:campaign-changed",
      "warcraft:assignments-changed"
    ]) {
      global.addEventListener(type, draw);
    }
    return draw;
  }

  function dropTarget(element, onDrop) {
    element.addEventListener("dragover", event => {
      event.preventDefault();
      element.classList.add("is-drop-target");
    });
    element.addEventListener("dragleave", () => element.classList.remove("is-drop-target"));
    element.addEventListener("drop", event => {
      event.preventDefault();
      element.classList.remove("is-drop-target");
      const heroId = event.dataTransfer
        ? event.dataTransfer.getData(HERO_TYPE) || event.dataTransfer.getData("text/plain")
        : "";
      if (heroId) onDrop(heroId, event);
    });
  }

  global.WarcraftRosterSidecar = Object.freeze({ mount, dropTarget });
})(window);
