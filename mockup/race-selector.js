const RACE_INDEX = "../data/heroes/races/index.json";
const CLASS_ROOT = "../data/heroes/classes/";
const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;

const state = {
  index: null,
  classIndex: null,
  faction: "alliance",
  body: "body-1",
  race: null,
  raceData: null,
  renderToken: 0
};

const $ = id => document.getElementById(id);

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(char) {
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];
  });
}

function plainText(markdown) {
  return String(markdown || "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*-\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function showError(message) {
  $("error").textContent = message;
  $("error").classList.add("show");
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load " + path);
  return response.json();
}

function currentFaction() {
  return state.index.factions[state.faction];
}

function currentRaceMeta() {
  return currentFaction().races.find(function(race) { return race.id === state.race; });
}

function bodyMeta() {
  return state.index.body_types.find(function(body) { return body.id === state.body; });
}

function factionKeyByLabel(label) {
  return String(label || "").toLowerCase();
}

function raceTooltipModel(race, faction) {
  return {
    variant:"race",
    title:race.label,
    type:faction.label + " race",
    icon:{category:"race", key:race.id, context:{body:state.body}},
    description:"Select this race to inspect its racial talent and class availability.",
    meta:[
      {label:"Faction", value:faction.label},
      {label:"Body preview", value:bodyMeta().presentation}
    ]
  };
}

function factionTooltipModel(factionId, faction) {
  return {
    variant:"race",
    title:faction.label,
    type:"Faction",
    icon:{category:"faction", key:factionId},
    description:"Select " + faction.label + " races and class availability.",
    meta:{label:"Faction class", value:faction.exclusive_class}
  };
}

function bodyTooltipModel(body) {
  return {
    variant:"control",
    title:body.label,
    type:"Character presentation",
    description:body.presentation + " prototype portrait presentation."
  };
}

function classTooltipModel(classMeta, faction, race, available) {
  const classId = classMeta.id;
  const factionRestriction = classMeta.faction || "";
  const requirements = [];
  const locked = [];

  if (factionRestriction) {
    requirements.push({label:"Faction class", value:factionRestriction + " only"});
  }

  if (!available) {
    locked.push(factionRestriction
      ? classMeta.label + " is unavailable to " + faction.label + "."
      : classMeta.label + " is unavailable to " + race.label + ".");
  }

  return {
    variant:"class",
    title:classMeta.label,
    type:available ? "Available class" : "Unavailable class",
    classId:classId,
    icon:{category:"class", key:classId, classId:classId},
    description:available
      ? "Available to " + race.label + " under the canonical Classic race/class rules."
      : "Visible for comparison, but not selectable under the current prototype rules.",
    requirements:requirements,
    locked:locked,
    meta:{label:"Resource", value:classMeta.resource}
  };
}

function racialTooltipModel() {
  if (!state.raceData) return null;
  return {
    variant:"ability",
    title:state.raceData.racial.name,
    type:state.raceData.race + " racial talent",
    icon:{category:"racial", key:state.race},
    description:plainText(state.raceData.racial.mechanic),
    meta:{label:"Race", value:state.raceData.race}
  };
}

function syncFactionControls() {
  document.querySelectorAll(".race-faction-button").forEach(function(button) {
    const selected = button.dataset.faction === state.faction;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function syncBodyControls() {
  document.querySelectorAll(".race-body-button").forEach(function(button) {
    const selected = button.dataset.body === state.body;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function renderFactionControls() {
  const root = $("factionToggle");
  root.innerHTML = "";

  Object.entries(state.index.factions).forEach(function(entry) {
    const factionId = entry[0];
    const faction = entry[1];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "race-faction-button wow-button";
    button.dataset.faction = factionId;
    button.innerHTML =
      '<span class="race-faction-crest wow-faction-crest wow-faction-crest--' + factionId + '">' +
        '<img src="' + Icons.resolve("faction", factionId) + '" alt="">' +
      '</span>' +
      '<span class="race-faction-copy"><strong>' + escapeHtml(faction.label) + '</strong><small>' + escapeHtml(faction.exclusive_class) + '</small></span>';

    button.querySelectorAll("img").forEach(Icons.bindFallback);
    Tooltips.attach(button, function() { return factionTooltipModel(factionId, faction); }, {anchor:"target"});
    button.addEventListener("click", function() { setFaction(factionId); });
    root.appendChild(button);
  });

  syncFactionControls();
}

function renderBodyControls() {
  const root = $("bodyToggle");
  root.innerHTML = "";

  state.index.body_types.forEach(function(body) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "race-body-button wow-button";
    button.dataset.body = body.id;
    button.innerHTML =
      '<strong>' + escapeHtml(body.label) + '</strong>' +
      '<small>' + escapeHtml(body.presentation) + '</small>';
    Tooltips.attach(button, function() { return bodyTooltipModel(body); }, {anchor:"target"});
    button.addEventListener("click", function() { setBody(body.id); });
    root.appendChild(button);
  });

  syncBodyControls();
}

function renderRaceList() {
  const faction = currentFaction();
  const root = $("raceList");
  root.innerHTML = "";
  $("raceCount").textContent = String(faction.races.length);

  faction.races.forEach(function(race) {
    const selected = race.id === state.race;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "race-option" + (selected ? " is-selected" : "");
    button.dataset.race = race.id;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.innerHTML =
      '<span class="race-option-icon wow-icon-frame wow-icon-frame--lg' + (selected ? " is-selected" : "") + '">' +
        '<img src="' + Icons.resolve("race", race.id, {body:state.body}) + '" alt="">' +
      '</span>' +
      '<span class="race-option-copy"><strong>' + escapeHtml(race.label) + '</strong><small>' + escapeHtml(faction.label) + '</small></span>';

    button.querySelectorAll("img").forEach(Icons.bindFallback);
    Tooltips.attach(button, function() { return raceTooltipModel(race, faction); }, {anchor:"target"});
    button.addEventListener("click", function() {
      state.race = race.id;
      renderRaceList();
      renderRace();
    });
    root.appendChild(button);
  });
}

function renderClasses() {
  const faction = currentFaction();
  const race = currentRaceMeta();
  const availableClasses = race && Array.isArray(race.available_classes) ? race.available_classes : [];
  const available = new Set(availableClasses);
  const root = $("classGrid");
  root.innerHTML = "";

  state.classIndex.classes.forEach(function(classMeta) {
    const isAvailable = available.has(classMeta.label);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "race-class-button wow-class--" + classMeta.id + (isAvailable ? "" : " is-locked");
    button.setAttribute("aria-disabled", isAvailable ? "false" : "true");
    button.setAttribute("aria-label", classMeta.label + (isAvailable ? ", available" : ", unavailable"));
    button.innerHTML =
      '<span class="race-class-icon wow-icon-frame wow-icon-frame--md wow-icon-frame--class-' + classMeta.id + (isAvailable ? "" : " is-locked") + '">' +
        '<img src="' + Icons.resolve("class", classMeta.id) + '" alt="">' +
      '</span>' +
      '<span>' + escapeHtml(classMeta.label) + '</span>';

    button.querySelectorAll("img").forEach(Icons.bindFallback);
    Tooltips.attach(button, function() {
      return classTooltipModel(classMeta, faction, race, isAvailable);
    }, {anchor:"target"});
    root.appendChild(button);
  });

  $("classSummary").textContent = availableClasses.length + " available · " +
    (state.classIndex.classes.length - availableClasses.length) + " locked";
}

function renderStage(data) {
  const faction = currentFaction();
  const body = bodyMeta();
  const factionId = state.faction;

  $("stageRace").textContent = data.race;
  $("stageFaction").textContent = faction.label;
  $("stageBody").textContent = body.label + " · " + body.presentation;

  const stage = $("characterStage");
  stage.className = "race-character-stage wow-frame wow-frame--" + factionId + " is-" + factionId;

  const crest = $("stageFactionCrest");
  crest.className = "race-stage-crest wow-faction-crest wow-faction-crest--" + factionId;
  const crestImage = $("stageFactionCrestImage");
  crestImage.src = Icons.resolve("faction", factionId);
  Icons.bindFallback(crestImage);

  const portrait = $("stagePortrait");
  portrait.src = Icons.resolve("race", state.race, {body:state.body});
  portrait.alt = body.presentation + " " + data.race + " character portrait";
  Icons.bindFallback(portrait);

  const portraitFrame = $("stagePortraitFrame");
  portraitFrame.classList.add("is-selected");
}

function renderDetail(data) {
  const faction = currentFaction();
  $("raceName").textContent = data.race;
  $("factionLabel").textContent = faction.label.toUpperCase();
  $("racialName").textContent = data.racial.name;
  $("racialHeading").textContent = data.race + " racial";

  const detailPortrait = $("detailRacePortraitImage");
  detailPortrait.src = Icons.resolve("race", state.race, {body:state.body});
  Icons.bindFallback(detailPortrait);

  const racialIcon = $("racialIcon");
  racialIcon.src = Icons.resolve("racial", state.race);
  Icons.bindFallback(racialIcon);

  renderClasses();
}

function renderRace() {
  const meta = currentRaceMeta();
  if (!meta) return;

  Tooltips.hide();
  state.raceData = {
    race: meta.label,
    racial: meta.racial || {name:"Unknown racial", mechanic:""},
    balance_role: meta.balance_role || ""
  };
  renderStage(state.raceData);
  renderDetail(state.raceData);
}

async function setFaction(factionId) {
  state.faction = factionId;
  state.race = state.index.factions[factionId].races[0].id;
  state.raceData = null;
  syncFactionControls();
  renderRaceList();
  await renderRace();
}

function setBody(bodyId) {
  state.body = bodyId;
  syncBodyControls();
  renderRaceList();
  renderRace();
}

async function init() {
  try {
    Icons.hydrate(document);
    Tooltips.hydrate(document);

    const loaded = await Promise.all([
      loadJson(RACE_INDEX),
      loadJson(CLASS_ROOT + "index.json")
    ]);
    state.index = loaded[0];
    state.classIndex = loaded[1];

    renderFactionControls();
    renderBodyControls();
    Tooltips.attach($("racialTalent"), racialTooltipModel, {anchor:"target"});

    await setFaction("alliance");
  } catch (error) {
    showError(error.message + ". Serve the repository over HTTP; see mockup/README.md.");
  }
}

init();
