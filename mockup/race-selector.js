const DATA_ROOT = "../data/heroes/races/";
const state = { index: null, faction: "alliance", body: "body-1", race: null };

const $ = (id) => document.getElementById(id);
const escapeHtml = (s="") => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function miniMarkdown(md="") {
  const safe = escapeHtml(md)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "• $1")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");
  return "<p>" + safe + "</p>";
}
function showError(message) {
  $("error").textContent = message;
  $("error").classList.add("show");
}
async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Could not load " + path);
  return res.json();
}
function currentFaction() { return state.index.factions[state.faction]; }
function currentRaceMeta() { return currentFaction().races.find(r => r.id === state.race); }
function bodyMeta() { return state.index.body_types.find(b => b.id === state.body); }

async function renderRace() {
  const faction = currentFaction();
  const meta = currentRaceMeta();
  if (!meta) return;

  const data = await loadJson(DATA_ROOT + meta.data_path.replace("./",""));
  $("raceName").textContent = data.race;
  $("stageRace").textContent = data.race;
  $("factionLabel").textContent = faction.label.toUpperCase();
  $("racialName").textContent = data.racial.name;
  $("racialMechanic").innerHTML = miniMarkdown(data.racial.mechanic);
  $("availabilityRule").textContent = state.index.availability_rule;

  const body = bodyMeta();
  $("stageBody").textContent = body.label + " · " + body.presentation;
  $("silhouette").className = "silhouette " + state.body;

  $("classGrid").innerHTML = "";
  faction.available_classes.forEach(name => {
    const chip = document.createElement("span");
    chip.className = "class-chip" + (name === faction.exclusive_class ? " exclusive" : "");
    chip.textContent = name + (name === faction.exclusive_class ? " · faction" : "");
    $("classGrid").appendChild(chip);
  });

  document.querySelectorAll(".race-button").forEach(btn => btn.classList.toggle("active", btn.dataset.race === state.race));
}

function renderRaceList() {
  const faction = currentFaction();
  $("raceList").innerHTML = "";
  faction.races.forEach(r => {
    const button = document.createElement("button");
    button.className = "race-button " + state.faction;
    button.dataset.race = r.id;
    button.innerHTML = "<strong>" + escapeHtml(r.label) + "</strong><span>View racial & classes</span>";
    button.addEventListener("click", async () => {
      state.race = r.id;
      await renderRace();
    });
    $("raceList").appendChild(button);
  });
}

async function setFaction(factionId) {
  state.faction = factionId;
  state.race = state.index.factions[factionId].races[0].id;
  document.querySelectorAll("#factionToggle button").forEach(b => b.classList.toggle("active", b.dataset.faction === factionId));
  renderRaceList();
  await renderRace();
}

function setBody(bodyId) {
  state.body = bodyId;
  document.querySelectorAll("#bodyToggle button").forEach(b => b.classList.toggle("active", b.dataset.body === bodyId));
  renderRace();
}

async function init() {
  try {
    state.index = await loadJson(DATA_ROOT + "index.json");
    document.querySelectorAll("#factionToggle button").forEach(b => b.addEventListener("click", () => setFaction(b.dataset.faction)));
    document.querySelectorAll("#bodyToggle button").forEach(b => b.addEventListener("click", () => setBody(b.dataset.body)));
    await setFaction("alliance");
  } catch (err) {
    showError(err.message + ". Serve the repository over HTTP; see mockup/README.md.");
  }
}
init();
