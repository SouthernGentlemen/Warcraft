import { FPS } from "./engine/constants.js";
import { CombatSimulation, hexHash } from "./engine/combat-sim.js";
import { createEnemyDefinition, createHeroDefinition } from "./engine/hero-factory.js";

const DATA_ROOT = "../../data/heroes/classes/";
const state = {
  index: null,
  lastResult: null,
  lastActors: null,
  lastVerification: null,
  slotValues: [
    "warrior/protection",
    "priest/holy",
    "mage/fire"
  ]
};

const $ = id => document.getElementById(id);

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load " + path);
  return response.json();
}

function showError(message) {
  $("error").textContent = message;
  $("error").classList.add("show");
}

function parseSeed(value) {
  const parsed = Number(String(value).trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0x5eed;
}

function buildOptions() {
  const options = [];
  for (const classMeta of state.index.classes) {
    for (const spec of classMeta.specs) {
      options.push({
        value: classMeta.id + "/" + spec.id,
        label: classMeta.label + " — " + spec.label
      });
    }
  }
  return options;
}

function renderHeroSlots() {
  const count = Number($("scenario").value);
  const options = buildOptions();
  $("heroSlots").innerHTML = "";

  for (let i = 0; i < 3; i += 1) {
    const wrap = document.createElement("div");
    wrap.className = "hero-slot" + (i >= count ? " hidden" : "");
    const label = document.createElement("label");
    label.textContent = "Hero " + (i + 1);
    const select = document.createElement("select");

    for (const option of options) {
      const node = document.createElement("option");
      node.value = option.value;
      node.textContent = option.label;
      select.appendChild(node);
    }

    select.value = state.slotValues[i] || options[i]?.value || "";
    select.addEventListener("change", () => {
      state.slotValues[i] = select.value;
    });

    wrap.append(label, select);
    $("heroSlots").appendChild(wrap);
  }
}

async function buildHero(slotIndex, buildValue, level) {
  const [classId, specId] = buildValue.split("/");
  const classMeta = state.index.classes.find(item => item.id === classId);
  if (!classMeta) throw new Error("Unknown class " + classId);
  const specMeta = classMeta.specs.find(item => item.id === specId);
  if (!specMeta) throw new Error("Unknown spec " + specId);

  const [specData, abilityData] = await Promise.all([
    loadJson(DATA_ROOT + specMeta.data_path.replace("./", "")),
    loadJson(DATA_ROOT + (classMeta.abilities_path || ("./" + classId + "/abilities/README.json")).replace("./", ""))
  ]);

  return createHeroDefinition({
    id: "hero-" + slotIndex,
    name: classMeta.label + " " + specMeta.label,
    classMeta,
    specData,
    abilityData,
    level,
    team: 0
  });
}

async function buildScenario() {
  const count = Number($("scenario").value);
  const level = Number($("heroLevel").value);
  const heroes = [];

  for (let i = 0; i < count; i += 1) {
    heroes.push(await buildHero(i, state.slotValues[i], level));
  }

  return [...heroes, createEnemyDefinition(count)];
}

function runOnce(actors, seed, maxFrames) {
  const simulation = new CombatSimulation({ actors, seed });
  return simulation.run(maxFrames);
}

function actorName(index) {
  return state.lastActors?.[index]?.name || (index === undefined ? "" : "Actor " + index);
}

function verifyRuns(first, second) {
  return {
    match:
      first.summary.finalHash === second.summary.finalHash &&
      first.summary.logHash === second.summary.logHash,
    firstState: first.summary.finalHash,
    secondState: second.summary.finalHash,
    firstLog: first.summary.logHash,
    secondLog: second.summary.logHash
  };
}

function summaryCard(label, value, className = "") {
  return '<div class="summary-card ' + className + '"><span>' + label + '</span><strong>' + value + '</strong></div>';
}

function renderSummary() {
  const result = state.lastResult;
  const verification = state.lastVerification;
  const winner =
    result.summary.winnerTeam === 0 ? "Heroes" :
    result.summary.winnerTeam === 1 ? "Enemy" :
    "Timeout";

  $("summaryCards").innerHTML =
    summaryCard("Winner", winner, result.summary.winnerTeam === 0 ? "good" : "bad") +
    summaryCard("Ticks", String(result.summary.ticks)) +
    summaryCard("Seconds", (result.summary.ticks / FPS).toFixed(2)) +
    summaryCard("State Hash", hexHash(result.summary.finalHash)) +
    summaryCard("Log Hash", hexHash(result.summary.logHash)) +
    summaryCard("Determinism", verification.match ? "MATCH" : "MISMATCH", verification.match ? "good" : "bad");

  $("summarySection").hidden = false;
}

function statCell(label, value) {
  return '<div class="stat"><span>' + label + '</span><strong>' + value + '</strong></div>';
}

function renderActors() {
  $("actorCards").innerHTML = "";

  state.lastActors.forEach((actor, index) => {
    const card = document.createElement("article");
    card.className = "actor-card" + (actor.kind === "enemy" ? " enemy" : "");
    const hooks = actor.talentHooks || { implemented:[], unimplemented:[] };

    card.innerHTML = `
      <h3>${actor.name}</h3>
      <div class="actor-sub">#${index} · Team ${actor.team} · ${actor.kind === "hero" ? "Level " + actor.level : actor.specName}</div>
      <div class="stat-grid">
        ${statCell("HP", actor.derived.maxHealth)}
        ${statCell("Resource", actor.resourceType + " " + actor.maxResource)}
        ${statCell("Physical", actor.derived.physicalPower)}
        ${statCell("Spell", actor.derived.spellPower)}
        ${statCell("Healing", actor.derived.healingPower)}
        ${statCell("Crit BP", actor.derived.critBp)}
        ${statCell("Hit BP", actor.derived.hitBp)}
        ${statCell("Haste BP", actor.derived.hasteBp)}
        ${statCell("Mastery BP", actor.derived.masteryBp)}
      </div>
      <div class="actor-actions">
        <p><b>Auto:</b> ${actor.auto.name} · ${actor.auto.kind} · ${actor.auto.base_ticks} ticks</p>
        <p><b>Cooldowns:</b> ${actor.cooldowns.length ? actor.cooldowns.map(a => a.name + " (" + a.cooldown_ticks + "t)").join(" · ") : "none"}</p>
        <p><b>Ultimate:</b> ${actor.ultimate ? actor.ultimate.name : "none"}</p>
        <p><b>Talents:</b> ${actor.selectedTalents.length ? actor.selectedTalents.join(" · ") : "none"}</p>
        <p class="hook-line"><b>Talent hooks:</b> ${hooks.implemented.length} live · ${hooks.unimplemented.length} registered for later</p>
      </div>
    `;

    $("actorCards").appendChild(card);
  });

  $("actorsSection").hidden = false;
}

function eventCategory(type) {
  if (["action_start","hit","miss","critical"].includes(type)) return "actions";
  if (["damage","heal","shield"].includes(type)) return "damage";
  if (type.startsWith("resource_") || type.startsWith("ultimate_") || type.startsWith("cooldown_")) return "resources";
  return "system";
}

function eventDetail(event) {
  if (event.type === "action_start") return event.action + " [" + event.source + "]";
  if (event.type === "damage") return event.action + (event.critical ? " · CRIT" : "") + (event.absorbed ? " · absorbed " + event.absorbed : "");
  if (event.type === "heal") return event.action + (event.critical ? " · CRIT" : "") + (event.overheal ? " · overheal " + event.overheal : "");
  if (event.type === "shield") return event.action + " · shield " + event.value;
  if (event.type === "buff_apply") return event.action + " · " + event.key + " " + event.valueBp + " BP / " + event.ticks + "t";
  if (event.type === "buff_expire") return event.key;
  if (event.type === "resource_spend" || event.type === "resource_gain" || event.type === "resource_regen") return event.resource + " → " + event.value;
  if (event.type === "ultimate_gain") return event.reason + " → " + event.value;
  if (event.type === "cooldown_start") return event.action + " · " + event.ticks + "t";
  if (event.type === "cooldown_ready") return event.action;
  if (event.type === "death") return "killed by " + actorName(event.sourceActor) + " · " + event.action;
  if (event.type === "round_end") return "winner team " + event.winnerTeam;
  if (event.type === "timeout") return "simulation timeout";
  return event.action || event.reason || "";
}

function eventAmount(event) {
  if (event.type === "damage") return "-" + event.amount;
  if (event.type === "heal" || event.type === "shield") return "+" + event.amount;
  if (event.type === "resource_spend") return "-" + event.amount;
  if (event.type === "resource_gain" || event.type === "resource_regen" || event.type === "ultimate_gain") return "+" + event.amount;
  return "";
}

function renderLog() {
  const filter = $("eventFilter").value;
  const showEmpty = $("showEmptyTicks").checked;
  const body = $("combatLogBody");
  body.innerHTML = "";
  const fragment = document.createDocumentFragment();
  let visibleEvents = 0;
  let totalEvents = 0;

  for (const frame of state.lastResult.frames) {
    totalEvents += frame.events.length;
    const events = frame.events.filter(event => filter === "all" || eventCategory(event.type) === filter);

    if (!events.length && showEmpty) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${frame.frame}</td>
        <td>${(frame.frame / FPS).toFixed(3)}</td>
        <td>—</td><td>tick</td><td>no events</td><td>—</td><td>—</td>
        <td>${hexHash(frame.stateHash)}</td>
      `;
      fragment.appendChild(row);
      continue;
    }

    for (const event of events) {
      visibleEvents += 1;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${frame.frame}</td>
        <td>${(frame.frame / FPS).toFixed(3)}</td>
        <td>${event.actor === undefined ? "—" : actorName(event.actor)}</td>
        <td class="event-${event.type}">${event.type}</td>
        <td>${eventDetail(event)}</td>
        <td>${event.target === undefined ? "—" : actorName(event.target)}</td>
        <td>${eventAmount(event)}</td>
        <td>${hexHash(frame.stateHash)}</td>
      `;
      fragment.appendChild(row);
    }
  }

  body.appendChild(fragment);
  $("logMeta").textContent =
    state.lastResult.frames.length + " frame reports · " +
    totalEvents + " total events · " +
    visibleEvents + " visible events · full JSON retained in memory";
  $("logSection").hidden = false;
}

async function runSimulation() {
  try {
    $("error").classList.remove("show");
    const actors = await buildScenario();
    const seed = parseSeed($("seed").value);
    const maxFrames = Math.max(5, Number($("maxSeconds").value) || 90) * FPS;

    const first = runOnce(actors, seed, maxFrames);
    const second = runOnce(actors, seed, maxFrames);

    state.lastActors = actors;
    state.lastResult = first;
    state.lastVerification = verifyRuns(first, second);

    renderSummary();
    renderActors();
    renderLog();
  } catch (error) {
    showError(error.stack || error.message);
  }
}

function downloadLog() {
  if (!state.lastResult) return;
  const payload = {
    generated_from: "mockup/simulation",
    fps: FPS,
    actors: state.lastActors,
    determinism: state.lastVerification,
    result: state.lastResult
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "warcraft-combat-log.json";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function init() {
  try {
    state.index = await loadJson(DATA_ROOT + "index.json");
    renderHeroSlots();
    $("scenario").addEventListener("change", renderHeroSlots);
    $("runSimulation").addEventListener("click", runSimulation);
    $("downloadLog").addEventListener("click", downloadLog);
    $("showEmptyTicks").addEventListener("change", () => state.lastResult && renderLog());
    $("eventFilter").addEventListener("change", () => state.lastResult && renderLog());
  } catch (error) {
    showError(error.message + ". Run npm run dev so /data is rebuilt from /docs.");
  }
}

init();
