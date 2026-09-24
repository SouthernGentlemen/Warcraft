const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;

const BASE_TEAMS = {
  alliance: [
    { id:"a-paladin", name:"Mira", race:"Human", className:"Paladin", level:5, icon:"spell_holy_holybolt", hp:760, resource:210, role:"healer", power:72 },
    { id:"a-warrior", name:"Brom", race:"Dwarf", className:"Warrior", level:5, icon:"ability_warrior_defensivestance", hp:980, resource:100, role:"tank", power:68 },
    { id:"a-mage", name:"Fizzik", race:"Gnome", className:"Mage", level:4, icon:"spell_fire_fireball02", hp:610, resource:330, role:"damage", power:88 },
    { id:"a-priest", name:"Selene", race:"Human", className:"Priest", level:4, icon:"spell_holy_powerwordshield", hp:650, resource:360, role:"healer", power:64 },
    { id:"a-rogue", name:"Pip", race:"Gnome", className:"Rogue", level:4, icon:"ability_rogue_ambush", hp:680, resource:120, role:"damage", power:84 },
    { id:"a-warlock", name:"Thrain", race:"Dwarf", className:"Warlock", level:3, icon:"spell_shadow_shadowbolt", hp:720, resource:300, role:"damage", power:80 }
  ],
  horde: [
    { id:"h-warrior", name:"Korga", race:"Orc", className:"Warrior", level:5, icon:"ability_warrior_savageblow", hp:1020, resource:100, role:"tank", power:74 },
    { id:"h-shaman", name:"Zula", race:"Troll", className:"Shaman", level:5, icon:"spell_nature_lightning", hp:740, resource:310, role:"healer", power:70 },
    { id:"h-warlock", name:"Morrow", race:"Undead", className:"Warlock", level:4, icon:"spell_shadow_summonvoidwalker", hp:720, resource:320, role:"damage", power:82 },
    { id:"h-rogue", name:"Rikk", race:"Troll", className:"Rogue", level:4, icon:"ability_backstab", hp:670, resource:120, role:"damage", power:88 },
    { id:"h-priest", name:"Vex", race:"Undead", className:"Priest", level:4, icon:"spell_shadow_shadowwordpain", hp:660, resource:350, role:"healer", power:66 },
    { id:"h-shaman2", name:"Grash", race:"Orc", className:"Shaman", level:3, icon:"ability_shaman_stormstrike", hp:760, resource:250, role:"damage", power:78 }
  ]
};

const state = {
  teams: null,
  paused: false,
  speed: 1,
  timer: null,
  turn: 0,
  finished: false
};

const $ = id => document.getElementById(id);

function cloneTeams() {
  return {
    alliance: BASE_TEAMS.alliance.map(unit => ({...unit, currentHp:unit.hp, currentResource:unit.resource})),
    horde: BASE_TEAMS.horde.map(unit => ({...unit, currentHp:unit.hp, currentResource:unit.resource}))
  };
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function resourceLabel(unit) {
  if (unit.className === "Warrior") return "Rage";
  if (unit.className === "Rogue") return "Energy";
  return "Mana";
}

function unitTooltipModel(unit, faction) {
  const resource = resourceLabel(unit);
  return {
    variant:"unit",
    title:unit.name,
    type:unit.race + " " + unit.className,
    classId:slug(unit.className),
    icon:{slug:unit.icon, classId:slug(unit.className)},
    description:unit.role.charAt(0).toUpperCase() + unit.role.slice(1) + " combatant.",
    stats:[
      {label:"Health", value:unit.currentHp + " / " + unit.hp},
      {label:resource, value:unit.currentResource + " / " + unit.resource},
      {label:"Power", value:String(unit.power)}
    ],
    meta:[
      {label:"Faction", value:faction === "alliance" ? "Alliance" : "Horde"},
      {label:"Level", value:String(unit.level)}
    ],
    locked:unit.currentHp <= 0 ? ["Defeated"] : []
  };
}

function resourceTooltipModel(unit) {
  const resource = resourceLabel(unit);
  return {
    variant:"resource",
    title:resource,
    type:"Combat resource",
    icon:{category:"resource", key:resource},
    description:resource === "Rage"
      ? "Generated and spent through combat actions."
      : resource === "Energy"
        ? "Fast-regenerating combat resource."
        : "Spellcasting resource used by this unit.",
    stats:[
      {label:"Current", value:String(unit.currentResource)},
      {label:"Maximum", value:String(unit.resource)}
    ],
    meta:{label:"Owner", value:unit.name}
  };
}

function unitMarkup(unit, faction) {
  const classId = slug(unit.className);
  const resource = resourceLabel(unit);
  const article = document.createElement("article");
  article.className = "combatant unit-frame wow-class--" + classId + " " + faction + "-combatant";
  article.dataset.unit = unit.id;
  article.innerHTML =
    '<div class="unit-portrait wow-icon-frame">' +
      '<img src="' + Icons.resolve("race", unit.race) + '" alt="" loading="lazy">' +
      '<span class="unit-class-icon wow-icon-frame wow-icon-frame--xs wow-icon-frame--class-' + classId + '">' +
        '<img src="' + Icons.resolve("class", classId) + '" alt="" loading="lazy">' +
      '</span>' +
      '<span class="unit-level">' + unit.level + '</span>' +
    '</div>' +
    '<div class="unit-frame-body">' +
      '<div class="unit-heading">' +
        '<div class="unit-identity">' +
          '<strong class="combatant-name">' + unit.name + '</strong>' +
          '<span class="combatant-meta">' + unit.className + ' · ' + unit.role.toUpperCase() + '</span>' +
        '</div>' +
        '<div class="unit-action" data-action-kind="ready">' +
          '<span class="unit-action-icon wow-icon-frame wow-icon-frame--sm wow-icon-frame--class-' + classId + '">' +
            '<img src="' + Icons.iconUrl(unit.icon) + '" alt="" loading="lazy">' +
          '</span>' +
          '<span class="unit-action-copy"><small>ACTION</small><strong>Ready</strong></span>' +
        '</div>' +
      '</div>' +
      '<div class="unit-bar hp-stat">' +
        '<span class="unit-bar-label">Health</span>' +
        '<span class="mini-fill"></span>' +
        '<b>' + unit.currentHp + ' / ' + unit.hp + '</b>' +
      '</div>' +
      '<div class="unit-bar resource-stat" tabindex="0">' +
        '<span class="unit-bar-label">' + resource + '</span>' +
        '<span class="mini-fill"></span>' +
        '<b>' + unit.currentResource + ' / ' + unit.resource + '</b>' +
      '</div>' +
      '<div class="unit-status-row" aria-label="Buff and debuff hooks">' +
        '<div class="unit-status-hooks buff-hooks" aria-label="Buffs">' +
          '<span class="unit-status-slot" data-status-slot="buff-1"></span>' +
          '<span class="unit-status-slot" data-status-slot="buff-2"></span>' +
        '</div>' +
        '<div class="unit-status-hooks debuff-hooks" aria-label="Debuffs">' +
          '<span class="unit-status-slot" data-status-slot="debuff-1"></span>' +
          '<span class="unit-status-slot" data-status-slot="debuff-2"></span>' +
        '</div>' +
      '</div>' +
    '</div>';

  article.querySelectorAll("img").forEach(Icons.bindFallback);
  const portrait = article.querySelector(".unit-portrait");
  portrait.tabIndex = 0;
  Tooltips.attach(portrait, function() { return unitTooltipModel(unit, faction); }, {anchor:"target"});
  Tooltips.attach(article.querySelector(".resource-stat"), function() { return resourceTooltipModel(unit); }, {anchor:"target"});

  return article;
}

function renderTeam(faction) {
  const root = $(faction + "Team");
  root.innerHTML = "";
  state.teams[faction].forEach(unit => root.appendChild(unitMarkup(unit, faction)));
}

function teamTotals(faction) {
  const units = state.teams[faction];
  return {
    current: units.reduce((sum, unit) => sum + unit.currentHp, 0),
    max: units.reduce((sum, unit) => sum + unit.hp, 0)
  };
}

function updateHud() {
  ["alliance","horde"].forEach(faction => {
    const totals = teamTotals(faction);
    const percent = totals.max ? Math.max(0, totals.current / totals.max * 100) : 0;
    $(faction + "HpText").textContent = totals.current.toLocaleString() + " / " + totals.max.toLocaleString();
    $(faction + "HpFill").style.width = percent + "%";
  });
}

function updateUnit(unit, faction) {
  const el = document.querySelector('[data-unit="' + unit.id + '"]');
  if (!el) return;

  const hpPercent = Math.max(0, unit.currentHp / unit.hp * 100);
  const resourcePercent = Math.max(0, unit.currentResource / unit.resource * 100);

  const hp = el.querySelector(".hp-stat");
  const resource = el.querySelector(".resource-stat");
  hp.querySelector(".mini-fill").style.width = hpPercent + "%";
  hp.querySelector("b").textContent = unit.currentHp + " / " + unit.hp;
  resource.querySelector(".mini-fill").style.width = resourcePercent + "%";
  resource.querySelector("b").textContent = unit.currentResource + " / " + unit.resource;

  el.classList.toggle("low-health", hpPercent > 0 && hpPercent <= 30);
  el.classList.toggle("defeated", unit.currentHp <= 0);
  if (unit.currentHp <= 0) {
    const action = el.querySelector(".unit-action");
    if (action) {
      action.dataset.actionKind = "death";
      action.classList.remove("is-active");
      action.querySelector("strong").textContent = "Defeated";
    }
  }
}

function randomLiving(faction) {
  const living = state.teams[faction].filter(unit => unit.currentHp > 0);
  return living[Math.floor(Math.random() * living.length)] || null;
}

function randomInjured(faction) {
  const injured = state.teams[faction].filter(unit => unit.currentHp > 0 && unit.currentHp < unit.hp * .88);
  return injured[Math.floor(Math.random() * injured.length)] || null;
}

function healCapable(unit) {
  return unit.role === "healer";
}

function eventText(text) {
  $("battleEvent").textContent = text;
}

function abilityLabel(unit, mode) {
  if (mode === "heal") {
    if (unit.className === "Paladin") return "Holy Light";
    if (unit.className === "Priest") return "Flash Heal";
    if (unit.className === "Shaman") return "Healing Wave";
  }

  const names = {
    Warrior:"Weapon Strike",
    Paladin:"Holy Strike",
    Mage:"Fireball",
    Priest:"Smite",
    Rogue:"Ambush",
    Warlock:"Shadow Bolt",
    Shaman:"Stormstrike"
  };
  return names[unit.className] || unit.className + " Ability";
}

function actionEventKind() {
  if (state.turn > 0 && state.turn % 10 === 0) return "ultimate";
  if (state.turn > 0 && state.turn % 5 === 0) return "cooldown";
  return "ability";
}

function showAction(unit, mode) {
  const el = document.querySelector('[data-unit="' + unit.id + '"]');
  if (!el) return;

  const kind = actionEventKind();
  const action = el.querySelector(".unit-action");
  const label = abilityLabel(unit, mode);
  action.dataset.actionKind = kind;
  action.classList.remove("is-active");
  void action.offsetWidth;
  action.classList.add("is-active");
  action.querySelector("strong").textContent =
    kind === "ultimate" ? "Ultimate · " + label :
    kind === "cooldown" ? "Cooldown · " + label :
    label;

  if (kind === "ultimate" || kind === "cooldown") {
    spawnEventTag(unit.id, kind === "ultimate" ? "ULTIMATE" : "COOLDOWN", kind);
  }

  clearTimeout(el._actionTimer);
  el._actionTimer = setTimeout(function() {
    if (!el.isConnected || el.classList.contains("defeated")) return;
    action.dataset.actionKind = "ready";
    action.classList.remove("is-active");
    action.querySelector("strong").textContent = "Ready";
  }, Math.max(240, 720 / state.speed));
}

function pulseStatus(unitId, type) {
  const el = document.querySelector('[data-unit="' + unitId + '"]');
  if (!el) return;
  const slot = el.querySelector(type === "buff" ? '[data-status-slot="buff-1"]' : '[data-status-slot="debuff-1"]');
  if (!slot) return;
  slot.classList.remove("is-active");
  slot.dataset.state = type;
  void slot.offsetWidth;
  slot.classList.add("is-active");
  clearTimeout(slot._statusTimer);
  slot._statusTimer = setTimeout(function() {
    slot.classList.remove("is-active");
    delete slot.dataset.state;
  }, Math.max(260, 780 / state.speed));
}

function spawnEventTag(targetId, text, type) {
  const arena = document.querySelector(".battle-arena");
  const target = document.querySelector('[data-unit="' + targetId + '"]');
  if (!arena || !target) return;

  const a = arena.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const fx = document.createElement("span");
  fx.className = "combat-event-tag " + type;
  fx.textContent = text;
  fx.style.left = (t.left - a.left + t.width * .5) + "px";
  fx.style.top = (t.top - a.top + 10) + "px";
  $("fxLayer").appendChild(fx);
  setTimeout(function() { fx.remove(); }, 760);
}

function spawnMissFeedback(targetId) {
  spawnEventTag(targetId, "MISS", "miss");
}

function spawnFloat(targetId, amount, type) {
  const arena = document.querySelector(".battle-arena");
  const target = document.querySelector('[data-unit="' + targetId + '"]');
  if (!arena || !target) return;

  const a = arena.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const fx = document.createElement("span");
  fx.className = "floating-number " + type;
  fx.textContent = type === "miss" ? "MISS" : (type === "heal" ? "+" : "−") + Math.abs(amount);
  fx.style.left = (t.left - a.left + t.width * .5) + "px";
  fx.style.top = (t.top - a.top + 32) + "px";
  $("fxLayer").appendChild(fx);
  setTimeout(() => fx.remove(), 900);
}

function spawnStreak(attackerId, targetId, kind) {
  const arena = document.querySelector(".battle-arena");
  const attacker = document.querySelector('[data-unit="' + attackerId + '"]');
  const target = document.querySelector('[data-unit="' + targetId + '"]');
  if (!arena || !attacker || !target) return;

  const a = arena.getBoundingClientRect();
  const from = attacker.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const x1 = from.left - a.left + from.width / 2;
  const y1 = from.top - a.top + from.height / 2;
  const x2 = to.left - a.left + to.width / 2;
  const y2 = to.top - a.top + to.height / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  const streak = document.createElement("span");
  streak.className = "attack-streak " + kind;
  streak.style.left = x1 + "px";
  streak.style.top = y1 + "px";
  streak.style.width = length + "px";
  streak.style.transform = "rotate(" + angle + "deg)";
  $("fxLayer").appendChild(streak);
  setTimeout(() => streak.remove(), 430);
}

function flashUnit(id, className) {
  const el = document.querySelector('[data-unit="' + id + '"]');
  if (!el) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), 420);
}

function spendResource(unit) {
  if (unit.resource <= 120) {
    unit.currentResource = Math.min(unit.resource, unit.currentResource + 12);
  } else {
    unit.currentResource = Math.max(0, unit.currentResource - (10 + Math.floor(Math.random() * 18)));
  }
}

function recoverResources() {
  ["alliance","horde"].forEach(faction => {
    state.teams[faction].forEach(unit => {
      if (unit.currentHp <= 0) return;
      const gain = unit.resource <= 120 ? 8 : 12;
      unit.currentResource = Math.min(unit.resource, unit.currentResource + gain);
      updateUnit(unit, faction);
    });
  });
}

function attack(attackingFaction, defendingFaction) {
  const attacker = randomLiving(attackingFaction);
  if (!attacker) return;

  const healTarget = healCapable(attacker) && Math.random() < .25 ? randomInjured(attackingFaction) : null;

  if (healTarget) {
    const heal = Math.min(
      healTarget.hp - healTarget.currentHp,
      Math.round(42 + attacker.power * (.45 + Math.random() * .3))
    );
    healTarget.currentHp += heal;
    spendResource(attacker);
    updateUnit(healTarget, attackingFaction);
    updateUnit(attacker, attackingFaction);
    showAction(attacker, "heal");
    pulseStatus(healTarget.id, "buff");
    spawnFloat(healTarget.id, heal, "heal");
    spawnStreak(attacker.id, healTarget.id, "heal-streak");
    flashUnit(healTarget.id, "healed");
    eventText(attacker.name + " restores " + heal + " health to " + healTarget.name + ".");
    return;
  }

  const target = randomLiving(defendingFaction);
  if (!target) return;

  const mitigation = target.role === "tank" ? .78 : 1;
  const crit = Math.random() < .14;
  const amount = Math.max(18, Math.round(attacker.power * (.72 + Math.random() * .55) * mitigation * (crit ? 1.55 : 1)));
  const wasAlive = target.currentHp > 0;
  target.currentHp = Math.max(0, target.currentHp - amount);
  spendResource(attacker);

  updateUnit(target, defendingFaction);
  updateUnit(attacker, attackingFaction);
  showAction(attacker, "attack");
  pulseStatus(target.id, "debuff");
  spawnFloat(target.id, amount, crit ? "crit" : "damage");
  spawnStreak(attacker.id, target.id, "damage-streak");
  flashUnit(target.id, "hit");
  if (crit) {
    flashUnit(attacker.id, "critical");
    spawnEventTag(attacker.id, "CRIT", "crit");
  }
  if (wasAlive && target.currentHp <= 0) {
    spawnEventTag(target.id, "DEFEATED", "death");
    flashUnit(target.id, "death");
  }

  eventText(
    attacker.name + " hits " + target.name + " for " + amount +
    (crit ? " critical damage." : " damage.")
  );
}

function finishIfNeeded() {
  const alliance = teamTotals("alliance").current;
  const horde = teamTotals("horde").current;
  if (alliance > 0 && horde > 0) return false;

  state.finished = true;
  clearTimeout(state.timer);
  const winner = alliance > 0 ? "Alliance" : "Horde";
  const banner = $("resultBanner");
  banner.innerHTML = '<span>VICTORY</span><strong>' + winner + '</strong><small>Reset fight to replay the encounter</small>';
  banner.hidden = false;
  $("battleStatus").textContent = winner + " wins";
  document.querySelector(".status-dot").classList.add("stopped");
  return true;
}

function battleStep() {
  if (state.paused || state.finished) return;

  state.turn += 1;
  const allianceAttacks = state.turn % 2 === 1;
  attack(allianceAttacks ? "alliance" : "horde", allianceAttacks ? "horde" : "alliance");

  if (state.turn % 4 === 0) recoverResources();
  updateHud();

  if (!finishIfNeeded()) scheduleNext();
}

function scheduleNext() {
  clearTimeout(state.timer);
  if (state.paused || state.finished) return;
  state.timer = setTimeout(battleStep, Math.max(170, 880 / state.speed));
}

function setPaused(paused) {
  state.paused = paused;
  $("pauseBattle").textContent = paused ? "▶" : "Ⅱ";
  $("pauseBattle").classList.toggle("is-selected", paused);
  $("pauseBattle").setAttribute("aria-pressed", paused ? "true" : "false");
  $("pauseBattle").setAttribute("aria-label", paused ? "Resume battle" : "Pause battle");
  $("battleStatus").textContent = paused ? "Battle paused" : "Auto battle running";
  document.querySelector(".status-dot").classList.toggle("stopped", paused);
  if (paused) clearTimeout(state.timer);
  else scheduleNext();
}

function setSpeed(speed) {
  state.speed = speed;
  document.querySelectorAll("#speedButtons button").forEach(button => {
    const active = Number(button.dataset.speed) === speed;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  $("fastForward").classList.toggle("is-selected", speed > 1);
  if (!state.paused) scheduleNext();
}

function nextSpeed() {
  const speeds = [1,2,4];
  const index = speeds.indexOf(state.speed);
  setSpeed(speeds[(index + 1) % speeds.length]);
}

function resetBattle() {
  clearTimeout(state.timer);
  state.teams = cloneTeams();
  state.turn = 0;
  state.finished = false;
  state.paused = false;
  state.speed = 1;

  renderTeam("alliance");
  renderTeam("horde");
  state.teams.alliance.forEach(unit => updateUnit(unit, "alliance"));
  state.teams.horde.forEach(unit => updateUnit(unit, "horde"));
  updateHud();

  $("resultBanner").hidden = true;
  $("resultBanner").innerHTML = "";
  $("pauseBattle").textContent = "Ⅱ";
  $("pauseBattle").classList.remove("is-selected");
  $("pauseBattle").setAttribute("aria-pressed", "false");
  $("battleStatus").textContent = "Auto battle running";
  $("battleEvent").textContent = "Alliance and Horde are engaging.";
  document.querySelector(".status-dot").classList.remove("stopped");
  setSpeed(1);
  scheduleNext();
}

function init() {
  Icons.hydrate(document);
  Tooltips.hydrate(document);
  $("pauseBattle").addEventListener("click", () => setPaused(!state.paused));
  $("fastForward").addEventListener("click", nextSpeed);
  $("resetBattle").addEventListener("click", resetBattle);
  document.querySelectorAll("#speedButtons button").forEach(button => {
    button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
  });

  resetBattle();
}

init();
