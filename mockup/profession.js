const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Professions = window.WarcraftProfessions;
const Roster = window.WarcraftRoster;

const INDEX_ROOT = "../data/base/profession-buildings/index.json";
const PROGRESSION_ROOT = "../data/base/profession-buildings/progression.json";

const $ = id => document.getElementById(id);
const state = {
  index: null,
  progression: null,
  activeTrack: "artisan",
  activeId: null,
  heroId: null,
  message: ""
};

function labelize(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function professionMeta(id) {
  return state.index.professions.find(entry => entry.id === id) || null;
}

function trackMeta(id) {
  return state.index.tracks.find(entry => entry.id === id) || null;
}

function professionProgression(id) {
  return state.progression.professions.find(entry => entry.id === id) || null;
}

function professionLabel(id) {
  const meta = professionMeta(id);
  return meta ? meta.label : "None";
}

function resolveInitialSelection() {
  const params = new URLSearchParams(location.search);
  const requestedProfession = professionMeta(params.get("profession"));
  const requestedTrack = trackMeta(params.get("track"));
  const savedProfession = professionMeta(Professions.getState().activeProfession);
  const savedTrack = trackMeta(Professions.getActiveTrack());
  const track = requestedProfession
    ? trackMeta(requestedProfession.track)
    : requestedTrack ||
      (savedProfession ? trackMeta(savedProfession.track) : savedTrack) ||
      state.index.tracks[0];
  const choices = Professions.professionsForTrack(track.id);
  const profession =
    requestedProfession && requestedProfession.track === track.id
      ? requestedProfession
      : savedProfession && savedProfession.track === track.id
        ? savedProfession
        : choices[0];
  return { track, profession };
}

function selectProfession(id, options = {}) {
  const meta = professionMeta(id);
  if (!meta) return;
  state.activeTrack = meta.track;
  state.activeId = meta.id;
  Professions.setActiveTrack(meta.track);
  Professions.setActiveProfession(meta.id);
  if (options.updateUrl !== false) {
    const next = new URL(location.href);
    next.searchParams.set("track", meta.track);
    next.searchParams.set("profession", meta.id);
    history.replaceState(null, "", next);
  }
  render();
}

function renderProfessionList() {
  const root = $("professionList");
  const track = trackMeta(state.activeTrack);
  const level = Professions.getTrackLevel(track.id);
  root.setAttribute("aria-label", track.building_label + " professions");
  root.innerHTML = "";
  Professions.professionsForTrack(track.id).forEach(meta => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profession-list__item" + (meta.id === state.activeId ? " is-active" : "");
    button.setAttribute("aria-pressed", meta.id === state.activeId ? "true" : "false");
    button.setAttribute("aria-label", meta.label + ", " + track.label + " level " + level);
    button.innerHTML =
      '<span class="profession-list__icon wow-icon-frame wow-icon-frame--sm"><img src="' +
      Icons.resolve("profession", meta.icon_key) +
      '" alt=""></span>' +
      '<span class="profession-list__copy"><strong>' +
      meta.label +
      "</strong><small>" +
      track.label +
      " · Level " +
      level +
      "</small></span>";
    const image = button.querySelector("img");
    if (image) Icons.bindFallback(image);
    button.addEventListener("click", () => selectProfession(meta.id));
    root.appendChild(button);
  });
}

function renderProgression(profession, level) {
  const root = $("professionProgressionList");
  root.innerHTML = "";
  profession.progression.forEach(step => {
    const row = document.createElement("div");
    row.className =
      "profession-progression__row" +
      (step.level === level ? " is-current" : step.level < level ? " is-complete" : "");
    row.innerHTML =
      '<span class="profession-progression__level">Level ' +
      step.level +
      "</span>" +
      '<span class="profession-progression__capability">' +
      labelize((step.capabilities || [])[0] || "Tier " + step.tier) +
      "</span>" +
      '<span class="profession-progression__tier">Tier ' +
      step.tier +
      "</span>";
    root.appendChild(row);
  });
}

function selectedHero() {
  const heroes = Roster.getState().heroes;
  if (!heroes.length) return null;
  if (!state.heroId || !heroes.some(hero => hero.id === state.heroId)) state.heroId = heroes[0].id;
  return Roster.hero(state.heroId);
}

function renderHeroTraining(meta) {
  const select = $("professionHeroSelect");
  const summary = $("professionHeroChoices");
  const button = $("professionLearnButton");
  const status = $("professionTrainingStatus");
  const heroes = Roster.getState().heroes;
  const hero = selectedHero();

  select.innerHTML = heroes
    .map(
      entry =>
        '<option value="' +
        entry.id +
        '"' +
        (hero && entry.id === hero.id ? " selected" : "") +
        ">" +
        entry.name +
        " · " +
        entry.classLabel +
        "</option>"
    )
    .join("");
  select.disabled = !heroes.length;
  if (!select.dataset.bound) {
    select.dataset.bound = "true";
    select.addEventListener("change", () => {
      state.heroId = select.value;
      state.message = "";
      render();
    });
  }

  if (!hero) {
    summary.innerHTML =
      '<div class="profession-hero-choices__empty">Recruit a hero before learning professions.</div>';
    button.disabled = true;
    status.textContent = state.message;
    return;
  }

  const choices = Professions.getHeroProfessions(hero.id);
  summary.innerHTML = Professions.TRACK_IDS.map(trackId => {
    const track = trackMeta(trackId);
    const selected = choices[trackId];
    return (
      '<div class="profession-hero-choice' +
      (trackId === meta.track ? " is-active-track" : "") +
      '"><span>' +
      track.label +
      "</span><strong>" +
      professionLabel(selected) +
      "</strong></div>"
    );
  }).join("");

  const current = choices[meta.track];
  button.disabled = current === meta.id;
  button.textContent =
    current === meta.id ? "Learned" : current ? "Change to " + meta.label : "Learn " + meta.label;
  button.onclick = () => {
    try {
      const before = Professions.getHeroProfessions(hero.id);
      const after = Professions.setHeroProfession(hero.id, meta.track, meta.id);
      state.message =
        before[meta.track] && before[meta.track] !== meta.id
          ? hero.name +
            " changed " +
            labelize(meta.track) +
            " from " +
            professionLabel(before[meta.track]) +
            " to " +
            meta.label +
            "."
          : hero.name + " learned " + meta.label + ".";
      if (after.artisan !== before.artisan && meta.track !== "artisan")
        throw new Error("Unrelated Artisan profession changed.");
      if (after.gathering !== before.gathering && meta.track !== "gathering")
        throw new Error("Unrelated Gathering profession changed.");
      if (after.survival !== before.survival && meta.track !== "survival")
        throw new Error("Unrelated Survival profession changed.");
      render();
    } catch (error) {
      state.message = error.message;
      render();
    }
  };
  status.textContent =
    state.message ||
    (current
      ? hero.name +
        " currently knows " +
        professionLabel(current) +
        " for " +
        labelize(meta.track) +
        "."
      : hero.name + " has no " + labelize(meta.track) + " profession yet.");
}

function render() {
  const meta = professionMeta(state.activeId);
  const track = trackMeta(state.activeTrack);
  const profession = professionProgression(state.activeId);
  if (!meta || !track || !profession || meta.track !== track.id) return;

  const level = Professions.getTrackLevel(track.id);
  const current =
    profession.progression.find(step => step.level === level) || profession.progression[0];

  $("professionGuildLevel").textContent = String(level);
  $("professionBuildingLevelLabel").textContent = track.building_label + " Level";
  $("professionBuildingKicker").textContent = track.building_label.toUpperCase();
  $("professionTitle").textContent = track.label + " Professions";
  $("professionHeaderSummary").textContent =
    "Each hero may learn one " +
    track.label +
    " profession. Learning another replaces only this track.";
  $("professionName").textContent = meta.label;
  $("professionDescription").textContent = profession.description;
  $("professionTierLabel").textContent = track.label.toUpperCase() + " · TIER " + current.tier;
  $("professionCurrentLevel").textContent = "Level " + level;
  $("professionCapability").textContent = labelize(
    (current.capabilities || [])[0] || "Tier " + current.tier
  );
  $("professionProgressionKicker").textContent =
    track.building_label.toUpperCase() + " PROGRESSION";

  const headerIcon = $("professionHeaderIcon");
  headerIcon.src = Icons.resolve("building", track.building_icon_key);
  headerIcon.alt = track.building_label + " icon";
  Icons.bindFallback(headerIcon);

  $("professionDetailIcon").innerHTML =
    '<img src="' + Icons.resolve("profession", meta.icon_key) + '" alt="">';
  const detailImage = $("professionDetailIcon").querySelector("img");
  if (detailImage) Icons.bindFallback(detailImage);

  const back = $("professionBackToBuilding");
  back.href = "./base.html?building=" + encodeURIComponent(track.building_id);
  back.textContent = "Back to " + track.building_label;

  document.title = meta.label + " — " + track.building_label;
  renderProfessionList();
  renderProgression(profession, level);
  renderHeroTraining(meta);
  Tooltips.hydrate(document);
}

async function initProfession() {
  const responses = await Promise.all([fetch(INDEX_ROOT), fetch(PROGRESSION_ROOT)]);
  if (!responses[0].ok) throw new Error("Could not load " + INDEX_ROOT);
  if (!responses[1].ok) throw new Error("Could not load " + PROGRESSION_ROOT);
  state.index = await responses[0].json();
  state.progression = await responses[1].json();
  Professions.configure(state.index);

  const indexIds = state.index.professions.map(entry => entry.id);
  const progressionIds = state.progression.professions.map(entry => entry.id);
  if (JSON.stringify(indexIds) !== JSON.stringify(progressionIds))
    throw new Error("Profession index/progression mismatch.");

  const initial = resolveInitialSelection();
  state.activeTrack = initial.track.id;
  state.activeId = initial.profession.id;
  selectProfession(state.activeId, { updateUrl: false });
  window.addEventListener("warcraft:professions-changed", render);
  window.addEventListener("warcraft:roster-changed", render);
}

initProfession().catch(error => {
  $("professionName").textContent = "Profession data unavailable";
  $("professionDescription").textContent = error.message;
});
