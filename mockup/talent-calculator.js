const DATA_ROOT = "../data/heroes/classes/";
const Icons = window.WowUIIcons;

const TREE_THEMES = [
  {accent:"#62b17a", glow:"rgba(25,111,84,.66)", tint:"rgba(14,84,72,.48)"},
  {accent:"#8263aa", glow:"rgba(82,49,110,.68)", tint:"rgba(68,43,88,.48)"},
  {accent:"#b79a4f", glow:"rgba(128,99,37,.68)", tint:"rgba(101,79,29,.48)"}
];

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

function requirementFor(specId, tier) {
  const picks = state.picks[specId];

  if (specLocked(specId)) {
    const label = state.classMeta.specs.find(s => s.id === state.primarySpec)?.label || "primary specialization";
    return `Requires ${label} capstone`;
  }

  if (tier === "tier_1") {
    if (state.level < 1) return "Requires Level 1";
    if (state.primarySpec && !primaryComplete() && specId !== state.primarySpec) return "Other trees are locked";
    if (pointCount() >= state.level && !picks.tier_1) return "Requires another hero level";
    return "";
  }

  if (tier === "tier_2") {
    if (state.level < 2) return "Requires Level 2";
    if (!picks.tier_1) return "Requires 1 point in Tier 1";
    if (pointCount() >= state.level && !picks.tier_2) return "Requires another hero level";
    return "";
  }

  if (tier === "capstones") {
    if (state.level < 3) return "Requires Level 3";
    if (!picks.tier_2) return "Requires 1 point in Tier 2";
    if (pointCount() >= state.level && !picks.capstones) return "Requires another hero level";
    return "";
  }

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

function showTooltip(event, specId, tier, item, selected) {
  const spec = state.specs.get(specId);
  const requirement = tooltipRequirement(specId, tier, selected);
  const level = tier === "tier_1" ? 1 : tier === "tier_2" ? 2 : 3;

  $("talentTooltip").innerHTML = `
    <div class="wow-tooltip-title">${escapeHtml(item.name)}</div>
    <div class="wow-tooltip-type">Talent</div>
    <div class="wow-tooltip-requires">Requires ${escapeHtml(state.classMeta.label)}</div>
    <div class="wow-tooltip-effect">${escapeHtml(item.effect)}</div>
    <div class="wow-tooltip-meta">${escapeHtml(spec.specialization)} · ${tierLabel(tier)} · Level ${level}</div>
    ${requirement ? `<div class="wow-tooltip-locked">${escapeHtml(requirement)}</div>` : ""}
  `;

  $("talentTooltip").hidden = false;
  positionTooltip(event);
}

function positionTooltip(event) {
  const tooltip = $("talentTooltip");
  if (tooltip.hidden) return;

  const pad = 18;
  const rect = tooltip.getBoundingClientRect();
  let left = event.clientX + 18;
  let top = event.clientY + 18;

  if (left + rect.width + pad > window.innerWidth) left = event.clientX - rect.width - 18;
  if (top + rect.height + pad > window.innerHeight) top = event.clientY - rect.height - 18;

  tooltip.style.left = Math.max(pad, left) + "px";
  tooltip.style.top = Math.max(pad, top) + "px";
}

function hideTooltip() {
  $("talentTooltip").hidden = true;
}

function connectorSvg(specId) {
  const picks = state.picks[specId];
  const firstActive = Boolean(picks.tier_1);
  const secondActive = Boolean(picks.tier_2);
  const a = firstActive ? " active" : "";
  const b = secondActive ? " active" : "";

  return `
    <svg class="wow-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path class="wow-connector${a}" d="M18 24 L18 43"/>
      <path class="wow-connector${a}" d="M50 24 L50 43"/>
      <path class="wow-connector${a}" d="M82 24 L82 43"/>
      <path class="wow-connector${b}" d="M18 54 L18 61 L36 72"/>
      <path class="wow-connector${b}" d="M50 54 L50 66 L36 72"/>
      <path class="wow-connector${b}" d="M50 54 L50 66 L64 72"/>
      <path class="wow-connector${b}" d="M82 54 L82 61 L64 72"/>
    </svg>
  `;
}

function createTalentNode(specId, tier, item, index, capstone=false) {
  const selected = state.picks[specId][tier] === item.name;
  const canUse = canUseTier(specId, tier) || selected;
  const button = document.createElement("button");

  button.className =
    "wow-talent-node" +
    (selected ? " selected" : "") +
    (canUse ? " available" : " locked") +
    (capstone ? " capstone" : "");

  button.type = "button";
  button.dataset.talent = item.name;
  button.innerHTML = `
    <span class="wow-icon-frame wow-icon-frame--lg${selected ? " is-selected" : ""}${canUse ? "" : " is-locked"}">
      <img src="${Icons.talentUrl(specId, item.name, index)}" alt="" loading="lazy">
      <span class="wow-icon-rank">${selected ? "1" : "0"}/1</span>
    </span>
  `;

  Icons.bindFallback(button.querySelector("img"));

  button.addEventListener("click", () => choose(specId, tier, item.name));
  button.addEventListener("contextmenu", event => {
    event.preventDefault();
    unlearn(specId, tier, item.name);
  });
  button.addEventListener("mouseenter", event => showTooltip(event, specId, tier, item, selected));
  button.addEventListener("mousemove", positionTooltip);
  button.addEventListener("mouseleave", hideTooltip);

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
  const theme = TREE_THEMES[panelIndex % TREE_THEMES.length];
  const specIcon = Icons.resolve("spec", meta.id, {classId:state.classMeta.id});
  const panel = document.createElement("article");

  panel.className = "wow-spec-panel" +
    (specLocked(meta.id) ? " spec-locked" : "") +
    (meta.id === state.primarySpec ? " primary-spec" : "");

  panel.style.setProperty("--tree-accent", theme.accent);
  panel.style.setProperty("--tree-glow", theme.glow);
  panel.style.setProperty("--tree-tint", theme.tint);
  panel.style.setProperty("--spec-art", `url("${specIcon}")`);

  panel.innerHTML = `
    <header class="wow-spec-header">
      <span class="wow-spec-icon wow-icon-frame wow-icon-frame--class-${state.classMeta.id}"><img src="${specIcon}" alt=""></span>
      <div class="wow-spec-name">
        <strong>${escapeHtml(meta.label)}</strong>
        <small>${escapeHtml(spec.identity.role)}</small>
      </div>
      <span class="wow-spec-points">${pointsInSpec(meta.id)} / 3</span>
    </header>
    <div class="wow-spec-body">
      ${connectorSvg(meta.id)}
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
  hideTooltip();
  render();
}

function resetBuild() {
  state.primarySpec = null;
  state.picks = blankPicks();
  hideTooltip();
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

    await changeClass(state.index.classes[0].id);
  } catch (error) {
    showError(error.message + ". Serve the repository over HTTP; see mockup/README.md.");
  }
}

init();
