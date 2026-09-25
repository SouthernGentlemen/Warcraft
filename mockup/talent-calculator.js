const DATA_ROOT = "../data/heroes/classes/";
const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;\nconst Roster = window.WarcraftRoster;

const state = {
  index: null,
  classMeta: null,
  specs: new Map(),
  primarySpec: null,
  level: 5,
  picks: {}
};

const $ = id => document.getElementById(id);
const escapeHtml = (s="") => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Could not load " + path);
  return res.json();
}

function showError(message) {
  $("error").textContent = message;
  $("error").classList.add("show");
}

function blankPicks() {
  const out = {};
  state.classMeta.specs.forEach(spec => {
    out[spec.id] = {tier_1:null, tier_2:null, capstones:null};
  });
  return out;
}

function pointCount() {
  return Object.values(state.picks).reduce(
    (sum, picks) => sum + ["tier_1","tier_2","capstones"].filter(key => picks[key]).length,
    0
  );
}

function pointsInSpec(specId) {
  const picks = state.picks[specId];
  return ["tier_1","tier_2","capstones"].filter(key => picks?.[key]).length;
}

function primaryComplete() {
  return Boolean(state.primarySpec && state.picks[state.primarySpec]?.capstones);
}

function specLocked(specId) {
  return Boolean(state.primarySpec && !primaryComplete() && specId !== state.primarySpec);
}

function tierThreshold(specId, tier) {
  const model = state.specs.get(specId)?.talent_model || {};
  if (tier === "tier_1") return Number(model.tier_1_unlock_points || 0);
  if (tier === "tier_2") return Number(model.tier_2_unlock_points ?? 1);
  return Number(model.capstone_unlock_points ?? 2);
}

function requirementFor(specId, tier) {
  const picks = state.picks[specId];

  if (specLocked(specId)) {
    const label = state.classMeta.specs.find(s => s.id === state.primarySpec)?.label || "primary specialization";
    return `Requires ${label} capstone`;
  }

  const threshold = tierThreshold(specId, tier);
  const current = pointsInSpec(specId);
  if (current < threshold && !picks[tier]) {
    return `Requires ${threshold} point${threshold === 1 ? "" : "s"} spent in this tree`;
  }
  if (pointCount() >= state.level && !picks[tier]) return "Requires another hero level";
  return "";
}

function canUseTier(specId, tier) {
  return requirementFor(specId, tier) === "";
}

function choose(specId, tier, name) {
  const picks = state.picks[specId];
  const selected = picks[tier] === name;

  if (selected || !canUseTier(specId, tier)) return;

  if (tier === "tier_1" && !state.primarySpec) {
    state.primarySpec = specId;
  }

  picks[tier] = name;
  render();
}

function clearOffspecs() {
  state.classMeta.specs.forEach(spec => {
    if (spec.id !== state.primarySpec) {
      state.picks[spec.id] = {tier_1:null, tier_2:null, capstones:null};
    }
  });
}

function unlearn(specId, tier, name) {
  const picks = state.picks[specId];
  if (picks[tier] !== name) return;

  if (specId === state.primarySpec && tier === "tier_1") {
    state.primarySpec = null;
    state.picks = blankPicks();
    render();
    return;
  }

  if (tier === "tier_1") {
    picks.tier_1 = null;
    picks.tier_2 = null;
    picks.capstones = null;
  } else if (tier === "tier_2") {
    picks.tier_2 = null;
    picks.capstones = null;
    if (specId === state.primarySpec) clearOffspecs();
  } else {
    picks.capstones = null;
    if (specId === state.primarySpec) clearOffspecs();
  }

  render();
}

function tierLabel(tier) {
  if (tier === "tier_1") return "Tier 1";
  if (tier === "tier_2") return "Tier 2";
  return "Capstone";
}

function tooltipRequirement(specId, tier, selected) {
  if (selected) return "";
  return requirementFor(specId, tier);
}

function talentTooltipModel(specId, tier, item, selected, iconUrl) {
  const spec = state.specs.get(specId);
  const requirement = tooltipRequirement(specId, tier, selected);
  const threshold = tierThreshold(specId, tier);
  const capstone = tier === "capstones";

  return {
    variant:"talent",
    title:item.name,
    type:capstone ? "Capstone Choice" : "Choice Talent",
    badge:selected ? "Learned" : "",
    icon:{url:iconUrl, classId:state.classMeta.id},
    requirements:[
      {label:"Class", value:state.classMeta.label},
      {label:"Tree spend to unlock", value:String(threshold)}
    ],
    description:item.effect,
    meta:[
      {label:"Specialization", value:spec.specialization},
      {label:"Tier", value:tierLabel(tier)},
      {label:"State", value:selected ? "Learned" : requirement ? "Locked" : "Available"}
    ],
    locked:requirement ? [requirement] : []
  };
}

function createTalentNode(specId, tier, item, index, capstone=false) {
  const selected = state.picks[specId][tier] === item.name;
  const canUse = canUseTier(specId, tier) || selected;
  const button = document.createElement("button");

  button.className =
    "wow-talent-node choice" +
    (selected ? " selected" : "") +
    (canUse ? " available" : " locked") +
    (capstone ? " capstone" : "");

  button.type = "button";
  button.dataset.talent = item.name;
  button.dataset.tier = tier;
  button.setAttribute("aria-pressed", selected ? "true" : "false");
  button.setAttribute("aria-disabled", canUse || selected ? "false" : "true");
  const requirement = tooltipRequirement(specId, tier, selected);
  button.setAttribute("aria-label", item.name + ", " + tierLabel(tier) + (selected ? ", learned" : requirement ? ", locked: " + requirement : ", available"));
  const talentIconUrl = Icons.iconUrl(item.icon_slug);
  button.innerHTML = `
    <span class="wow-icon-frame${selected ? " is-selected" : ""}${canUse ? "" : " is-locked"}">
      <img src="${talentIconUrl}" alt="" loading="lazy">
      <span class="wow-icon-rank">${selected ? "1" : "0"}/1</span>
    </span>
  `;

  Icons.bindFallback(button.querySelector("img"));
  Tooltips.attach(button, () => talentTooltipModel(specId, tier, item, selected, talentIconUrl));

  button.addEventListener("click", () => choose(specId, tier, item.name));
  button.addEventListener("contextmenu", event => {
    event.preventDefault();
    unlearn(specId, tier, item.name);
  });
  button.addEventListener("keydown", event => {
    if ((event.key === "Delete" || event.key === "Backspace") && selected) {
      event.preventDefault();
      unlearn(specId, tier, item.name);
    }
  });

  return button;
}

function createTalentRow(specId, tier, items, rowNumber) {
  const row = document.createElement("div");
  const capstone = tier === "capstones";
  row.className = `wow-talent-row row-${rowNumber}${capstone ? " capstone-row" : ""}`;

  items.forEach((item, index) => {
    row.appendChild(createTalentNode(specId, tier, item, index + rowNumber * 3, capstone));
  });

  return row;
}

function renderSpecPanel(meta, panelIndex) {
  const spec = state.specs.get(meta.id);
  const specIcon = Icons.resolve("spec", meta.id, {classId:state.classMeta.id});
  const panel = document.createElement("article");

  panel.className = "wow-spec-panel wow-frame wow-spec-panel--" + ((panelIndex % 3) + 1) +
    (specLocked(meta.id) ? " spec-locked" : "") +
    (meta.id === state.primarySpec ? " primary-spec" : "");

  panel.style.setProperty("--spec-art", `url("${specIcon}")`);

  panel.innerHTML = `
    <header class="wow-spec-header">
      <span class="wow-spec-icon wow-icon-frame wow-icon-frame--md wow-icon-frame--class-${state.classMeta.id}"><img src="${specIcon}" alt=""></span>
      <div class="wow-spec-name">
        <strong>${escapeHtml(meta.label)}</strong>
        <small>${escapeHtml(spec.identity.role)}</small>
      </div>
      <span class="wow-spec-points wow-tier-label">${pointsInSpec(meta.id)} / 3</span>
    </header>
    <div class="wow-spec-body">
      <span class="wow-tier-model-note">Talent tiers · not item tiers</span>
      <div class="wow-tier-markers" aria-hidden="true">
        <span>Tier 1</span><span>Tier 2</span><span>Capstone</span>
      </div>
    </div>
  `;

  Icons.bindFallback(panel.querySelector(".wow-spec-icon img"));

  const body = panel.querySelector(".wow-spec-body");
  body.appendChild(createTalentRow(meta.id, "tier_1", spec.talents.tier_1, 1));
  body.appendChild(createTalentRow(meta.id, "tier_2", spec.talents.tier_2, 2));
  body.appendChild(createTalentRow(meta.id, "capstones", spec.talents.capstones, 3));

  return panel;
}

function renderTrees() {
  $("wowTreeBoard").innerHTML = "";
  state.classMeta.specs.forEach((meta, index) => {
    $("wowTreeBoard").appendChild(renderSpecPanel(meta, index));
  });
}

function renderStatus() {
  const used = pointCount();
  $("pointsUsed").textContent = used + " / " + state.level;

  let text = "Choose a Tier 1 talent to select a specialization.";
  if (state.primarySpec && !state.picks[state.primarySpec].tier_2) {
    text = "Primary specialization chosen. Learn one Tier 2 talent in that tree.";
  } else if (state.primarySpec && !state.picks[state.primarySpec].capstones) {
    text = "Choose one capstone to unlock the other two trees.";
  } else if (primaryComplete() && used < state.level) {
    text = "Primary tree complete. Spend remaining points in any unlocked tree.";
  } else if (used === state.level) {
    text = "All available talent points are spent.";
  }

  $("buildStatus").textContent = text;
}

function render() {
  Tooltips.hide();
  renderTrees();
  renderStatus();
}

async function changeClass(classId) {
  state.classMeta = state.index.classes.find(c => c.id === classId);
  state.specs = new Map();

  for (const meta of state.classMeta.specs) {
    const path = DATA_ROOT + meta.data_path.replace("./", "");
    state.specs.set(meta.id, await loadJson(path));
  }

  state.primarySpec = null;
  state.picks = blankPicks();
  Tooltips.hide();
  render();
}

function resetBuild() {
  state.primarySpec = null;
  state.picks = blankPicks();
  Tooltips.hide();
  render();
}

async function init() {
  try {
    state.index = await loadJson(DATA_ROOT + "index.json");

    state.index.classes.forEach(classMeta => {
      const option = document.createElement("option");
      option.value = classMeta.id;
      option.textContent = classMeta.label + (classMeta.faction ? " · " + classMeta.faction : "");
      $("classSelect").appendChild(option);
    });

    $("classSelect").addEventListener("change", event => changeClass(event.target.value));
    $("levelRange").addEventListener("input", event => {
      const next = Number(event.target.value);
      if (pointCount() > next) resetBuild();
      state.level = next;
      $("levelBadge").textContent = next;
      render();
    });
    $("resetBuild").addEventListener("click", resetBuild);

    const firstHero=Roster.getState().heroes[0];\n    state.rosterHeroId=firstHero ? firstHero.id : null;\n    const initialClass=firstHero ? firstHero.classId : state.index.classes[0].id;\n    $("classSelect").value=initialClass;\n    await changeClass(initialClass);
  } catch (error) {
    showError(error.message + ". Serve the repository over HTTP; see mockup/README.md.");
  }
}

init();
