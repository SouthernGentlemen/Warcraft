const DATA_ROOT = "../data/heroes/classes/";
const WOWHEAD_ICON_ROOT = "https://wow.zamimg.com/images/wow/icons/large/";
const FALLBACK_ICON = WOWHEAD_ICON_ROOT + "inv_misc_questionmark.jpg";

const SPEC_ICONS = {
  "balance":"spell_nature_starfall",
  "feral":"ability_druid_catform",
  "restoration":"spell_nature_rejuvenation",
  "beast-mastery":"ability_hunter_beastcall",
  "marksmanship":"ability_marksmanship",
  "survival":"ability_hunter_survivalinstincts",
  "arcane":"spell_arcane_blast",
  "fire":"spell_fire_fireball02",
  "frost":"spell_frost_frostbolt02",
  "holy":"spell_holy_holybolt",
  "protection":"ability_warrior_defensivestance",
  "retribution":"spell_holy_sealofmight",
  "discipline":"spell_holy_powerwordshield",
  "shadow":"spell_shadow_shadowwordpain",
  "assassination":"ability_rogue_eviscerate",
  "combat":"ability_backstab",
  "subtlety":"ability_rogue_ambush",
  "elemental":"spell_nature_lightning",
  "enhancement":"ability_shaman_stormstrike",
  "affliction":"spell_shadow_shadowwordpain",
  "demonology":"spell_shadow_summonvoidwalker",
  "destruction":"spell_fire_flamebolt",
  "arms":"ability_warrior_savageblow",
  "fury":"ability_warrior_innerrage"
};

const TALENT_ICON_POOL = [
  "spell_nature_lightning",
  "spell_nature_chainlightning",
  "spell_nature_rejuvenation",
  "spell_nature_healingwavegreater",
  "spell_nature_starfall",
  "spell_nature_naturesblessing",
  "spell_nature_regeneration",
  "spell_nature_forceofnature",
  "spell_arcane_blast",
  "spell_arcane_arcanetorrent",
  "spell_fire_flamebolt",
  "spell_fire_fireball02",
  "spell_fire_flameshock",
  "spell_frost_frostbolt02",
  "spell_frost_frostarmor02",
  "spell_frost_iceshard",
  "spell_shadow_shadowbolt",
  "spell_shadow_shadowwordpain",
  "spell_shadow_corruption",
  "spell_shadow_lifedrain02",
  "spell_holy_holybolt",
  "spell_holy_powerwordshield",
  "spell_holy_greaterheal",
  "spell_holy_renew",
  "ability_druid_catform",
  "ability_druid_bearform",
  "ability_rogue_eviscerate",
  "ability_rogue_sprint",
  "ability_rogue_ambush",
  "ability_backstab",
  "ability_warrior_charge",
  "ability_warrior_defensivestance",
  "ability_warrior_innerrage",
  "ability_warrior_savageblow",
  "ability_hunter_beastcall",
  "ability_marksmanship",
  "ability_hunter_survivalinstincts",
  "ability_hunter_aimedshot",
  "spell_holy_sealofmight",
  "spell_holy_devotionaura",
  "spell_holy_divineshield",
  "spell_holy_righteousfury",
  "ability_paladin_shieldofthetemplar",
  "spell_shaman_lavaburst",
  "spell_shaman_spiritwalkersgrace",
  "spell_shaman_feralspirit",
  "spell_shaman_astralshift",
  "ability_shaman_stormstrike"
];

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

function iconUrl(slug) {
  return WOWHEAD_ICON_ROOT + (slug || "inv_misc_questionmark") + ".jpg";
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash) + value.charCodeAt(i);
  return Math.abs(hash);
}

function talentIcon(specId, itemName, index) {
  const start = hashString(specId + itemName) % TALENT_ICON_POOL.length;
  return iconUrl(TALENT_ICON_POOL[(start + index * 7) % TALENT_ICON_POOL.length]);
}

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
    <span class="wow-icon-frame">
      <img src="${talentIcon(specId, item.name, index)}" alt="" loading="lazy">
    </span>
    <span class="wow-rank ${selected ? "learned" : ""}">${selected ? "1" : "0"}/1</span>
  `;

  const image = button.querySelector("img");
  image.addEventListener("error", () => {
    if (image.src !== FALLBACK_ICON) image.src = FALLBACK_ICON;
  }, {once:true});

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
  const specIcon = iconUrl(SPEC_ICONS[meta.id] || "inv_misc_questionmark");
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
      <span class="wow-spec-icon"><img src="${specIcon}" alt=""></span>
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

  const specImg = panel.querySelector(".wow-spec-icon img");
  specImg.addEventListener("error", () => {
    if (specImg.src !== FALLBACK_ICON) specImg.src = FALLBACK_ICON;
  }, {once:true});

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
