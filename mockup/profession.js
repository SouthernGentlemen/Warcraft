const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Professions = window.WarcraftProfessions;

const INDEX_ROOT = "../data/base/profession-buildings/index.json";
const PROGRESSION_ROOT = "../data/base/profession-buildings/progression.json";

const $ = id => document.getElementById(id);
const state = {index:null, progression:null, activeId:null};

function labelize(value) {
  return String(value || "").replace(/[_-]+/g," ").replace(/w/g, char => char.toUpperCase());
}

function professionMeta(id) {
  return state.index.professions.find(entry => entry.id === id) || null;
}

function professionProgression(id) {
  return state.progression.professions.find(entry => entry.id === id) || null;
}

function currentId() {
  const params = new URLSearchParams(location.search);
  const requested = params.get("profession");
  if (requested && professionMeta(requested)) return requested;
  const saved = Professions.getState().activeProfession;
  if (saved && professionMeta(saved)) return saved;
  return state.index.professions[0].id;
}

function selectProfession(id, options = {}) {
  const meta = professionMeta(id);
  if (!meta) return;
  state.activeId = id;
  Professions.setActiveProfession(id);
  if (options.updateUrl !== false) {
    const next = new URL(location.href);
    next.searchParams.set("profession", id);
    history.replaceState(null, "", next);
  }
  render();
}

function renderProfessionList() {
  const root = $("professionList");
  root.innerHTML = "";
  const level = Professions.getGuildLevel();
  state.index.professions.forEach(meta => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profession-list__item" + (meta.id === state.activeId ? " is-active" : "");
    button.setAttribute("aria-pressed", meta.id === state.activeId ? "true" : "false");
    button.setAttribute("aria-label", meta.label + ", level " + level);
    button.innerHTML =
      '<span class="profession-list__icon wow-icon-frame wow-icon-frame--sm"><img src="' +
        Icons.resolve("profession", meta.icon_key) + '" alt=""></span>' +
      '<span class="profession-list__copy"><strong>' + meta.label + '</strong><small>Level ' + level + '</small></span>';
    button.querySelector("img") && Icons.bindFallback(button.querySelector("img"));
    button.addEventListener("click", () => selectProfession(meta.id));
    root.appendChild(button);
  });
}

function renderProgression(profession, level) {
  const root = $("professionProgressionList");
  root.innerHTML = "";
  profession.progression.forEach(step => {
    const row = document.createElement("div");
    row.className = "profession-progression__row" + (step.level === level ? " is-current" : step.level < level ? " is-complete" : "");
    row.innerHTML =
      '<span class="profession-progression__level">Level ' + step.level + '</span>' +
      '<span class="profession-progression__capability">' + labelize((step.capabilities || [])[0] || ("Tier " + step.tier)) + '</span>' +
      '<span class="profession-progression__tier">Tier ' + step.tier + '</span>';
    root.appendChild(row);
  });
}

function render() {
  const meta = professionMeta(state.activeId);
  const profession = professionProgression(state.activeId);
  if (!meta || !profession) return;

  const level = Professions.getGuildLevel();
  const current = profession.progression.find(step => step.level === level) || profession.progression[0];

  $("professionGuildLevel").textContent = String(level);
  $("professionName").textContent = meta.label;
  $("professionDescription").textContent = profession.description;
  $("professionTierLabel").textContent = "TIER " + current.tier;
  $("professionCurrentLevel").textContent = "Level " + level;
  $("professionCapability").textContent = labelize((current.capabilities || [])[0] || ("Tier " + current.tier));

  const headerIcon = $("professionHeaderIcon");
  headerIcon.src = Icons.resolve("profession", meta.icon_key);
  headerIcon.alt = meta.label + " icon";
  Icons.bindFallback(headerIcon);

  $("professionDetailIcon").innerHTML =
    '<img src="' + Icons.resolve("profession", meta.icon_key) + '" alt="">';
  $("professionDetailIcon").querySelector("img") && Icons.bindFallback($("professionDetailIcon").querySelector("img"));

  document.title = meta.label + " — Artisans Guild";
  renderProfessionList();
  renderProgression(profession, level);
  Tooltips.hydrate(document);
}

async function initProfession() {
  const responses = await Promise.all([fetch(INDEX_ROOT), fetch(PROGRESSION_ROOT)]);
  if (!responses[0].ok) throw new Error("Could not load " + INDEX_ROOT);
  if (!responses[1].ok) throw new Error("Could not load " + PROGRESSION_ROOT);
  state.index = await responses[0].json();
  state.progression = await responses[1].json();

  const indexIds = state.index.professions.map(entry => entry.id);
  const progressionIds = state.progression.professions.map(entry => entry.id);
  if (JSON.stringify(indexIds) !== JSON.stringify(progressionIds)) throw new Error("Profession index/progression mismatch.");

  state.activeId = currentId();
  selectProfession(state.activeId, {updateUrl:false});
  window.addEventListener("warcraft:professions-changed", render);
}

initProfession().catch(error => {
  $("professionName").textContent = "Profession data unavailable";
  $("professionDescription").textContent = error.message;
});
