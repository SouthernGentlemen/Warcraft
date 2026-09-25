const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;
const BUILDING_DATA_ROOT = "../data/base/buildings.json";
const BASE_PRESENTATION_ROOT = "../data/base/presentation.json";
const RECRUITMENT_DATA_ROOT = "../data/base/recruitment.json";
const PROFESSION_DATA_ROOT = "../data/base/profession-buildings/index.json";
const QUEST_OFFER_POOL_ROOT = "../data/base/quest-offers.json";
const DUNGEON_CATALOG_ROOT = "../data/dungeons/catalog.json";
const Professions = window.WarcraftProfessions;
let buildings = [];
let basePresentation = null;
let recruitmentData = null;
let professionData = null;
let questOfferPool = null;
let dungeonCatalog = null;
let sidecarOrigin = null;

function normalizeBuilding(raw) {
  const level = Number(raw.level);
  const max = Number(raw.max_level);
  if (!Number.isInteger(level) || level < 1 || level > 5 || max !== 5) throw new Error("Invalid building level contract for " + raw.id);
  return Object.assign({}, raw, {level:level, max:max});
}

function currentProgression(building) {
  return building.progression.find(entry => entry.level === building.level);
}

function nextProgression(building) {
  return building.progression.find(entry => entry.level === building.level + 1) || null;
}

function keepUpgradeGate(building, next) {
  const keep = buildings.find(entry => entry.id === 'keep') || null;
  if (!next || building.id === 'keep') {
    return {blocked:false, currentLevel:keep ? keep.level : 0, requiredLevel:null, reason:''};
  }
  const requiredLevel = next.level;
  const currentLevel = keep ? keep.level : 0;
  const blocked = !keep || currentLevel < requiredLevel;
  return {
    blocked,
    currentLevel,
    requiredLevel,
    reason:blocked ? 'Upgrade Keep to level ' + requiredLevel + ' first.' : ''
  };
}

function resourceShortages(next) {
  if (!next) return [];
  return Object.entries(next.cost).filter(([key,value]) => (state.resources[key] || 0) < value)
    .map(([key,value]) => ({resource:key, required:value, current:state.resources[key] || 0}));
}

function upgradeState(building) {
  const next = nextProgression(building);
  if (!next) return {canUpgrade:false, reason:'Maximum level reached', next:null, keepGate:keepUpgradeGate(building, null), shortages:[]};
  const keepGate = keepUpgradeGate(building, next);
  const shortages = resourceShortages(next);
  const reasons = [];
  if (keepGate.blocked) reasons.push(keepGate.reason);
  if (shortages.length) reasons.push('Need ' + shortages.map(entry => labelize(entry.resource) + ' ' + fmt(entry.required)).join(', ') + '.');
  return {
    canUpgrade:!keepGate.blocked && shortages.length === 0,
    reason:reasons.join(' '),
    next,
    keepGate,
    shortages
  };
}


const state = {
  selected: null,
  questMessage: "",
  recruitmentOpen: false,
  recruitmentMessage: "",
  artisansOpen: false,
  questBoardMode: "offers",
  selectedDungeonId: null,
  dungeonMessage: "",
  resources: { gold: 25430, lumber: 12680, stone: 8440 }
};

const fmt = value => value.toLocaleString('en-US');
const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];

const buildingIconKeys = {
  keep:['building','keep'],
  training:['building','training-grounds'],
  recruitment:['building','recruitment-hall'],
  storehouse:['building','storehouse'],
  artisans:['building','artisans-guild'],
  questboard:['building','quest-board']
};


const attentionIcons = {
  'quest-complete':['status','victory'],
  'quest-ready':['status','combat'],
  'profession-action':['status','speed'],
  'upgrade-ready':['status','victory'],
  'blocked':['status','critical']
};

function professionActionAvailable(building) {
  const current = currentProgression(building);
  return Boolean(building.category === 'profession' && current && current.action_available === true);
}

function currentQuestOffers() {
  if (!questOfferPool) return [];
  const boardState = Roster.getQuestBoardState();
  const ids = new Set(boardState.offerIds || []);
  return questOfferPool.offers.filter(offer => ids.has(offer.id));
}

function currentRoundQuestForOffer(offerId) {
  const round = Roster.getQuestBoardState().round;
  return Roster.getState().quests.find(quest => quest.round === round && quest.sourceOfferId === offerId) || null;
}

function buildingAttentionState(building) {
  if (!building) return null;

  if (building.id === 'questboard') {
    const round = Roster.getQuestBoardState().round;
    const quests = Roster.getState().quests.filter(quest => quest.round === round);
    if (quests.some(quest => quest.status === 'completed')) {
      return {key:'quest-complete', label:'Quest complete', detail:'A quest from the current Quest Board round has been completed.'};
    }

    const availableHeroes = Roster.getState().heroes.filter(hero => hero.availability === 'available').length;
    const ready = currentQuestOffers().some(offer => !currentRoundQuestForOffer(offer.id) && availableHeroes >= offer.party_size);
    if (ready) return {key:'quest-ready', label:'Quest ready', detail:'A quest offer in the current round can be dispatched with the available roster.'};
    if (quests.some(quest => quest.status === 'active')) return null;
  }

  if (professionActionAvailable(building)) {
    return {key:'profession-action', label:'Profession action available', detail:'This profession building has an available action.'};
  }

  const upgrade = upgradeState(building);
  if (upgrade.next && upgrade.canUpgrade) {
    return {key:'upgrade-ready', label:'Upgrade available', detail:'Keep gate and resource costs are satisfied for the next level.'};
  }
  if (upgrade.next && !upgrade.canUpgrade) {
    return {key:'blocked', label:'Upgrade blocked', detail:upgrade.reason || 'The next building level is currently blocked.'};
  }
  return null;
}

function attentionIconMarkup(attention) {
  const icon = attentionIcons[attention.key] || ['status','critical'];
  return '<span class="base-plot-attention is-' + attention.key + '" data-attention-state="' + attention.key + '" aria-hidden="true">' +
    '<span class="wow-icon-frame wow-icon-frame--xs"><img src="' + Icons.resolve(icon[0], icon[1]) + '" alt=""></span>' +
  '</span>';
}

function iconMarkup(category, key, size, extraClass) {
  return '<span class="wow-icon-frame ' + (size ? 'wow-icon-frame--' + size : '') + ' ' + (extraClass || '') + '">' +
    '<img src="' + Icons.resolve(category, key) + '" alt="">' +
  '</span>';
}

function currentFactionId() {
  const faction = Roster && typeof Roster.getFaction === 'function' ? Roster.getFaction() : Roster?.getState?.().faction;
  return faction === 'horde' ? 'horde' : 'alliance';
}

function currentBaseVariant() {
  if (!basePresentation || !basePresentation.variants) return null;
  return basePresentation.variants[currentFactionId()] || basePresentation.variants[basePresentation.default_faction] || null;
}

function buildingIconSpec(building) {
  const variant = currentBaseVariant();
  if (building && building.id === 'keep' && variant && variant.keep_icon_key) return ['building', variant.keep_icon_key];
  return buildingIconKeys[building.id] || ['building','keep'];
}

function buildingIconMarkup(building, size, extraClass) {
  const icon = buildingIconSpec(building);
  return iconMarkup(icon[0], icon[1], size, extraClass || '');
}

function labelize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}


const BUILDING_ACTIONS = Object.freeze({
  keep:Object.freeze([
    Object.freeze({label:'Open Roster', href:'./heroes.html', icon:['resource','population'], description:'Manage heroes, equipment, talents, and saved parties.'})
  ]),
  recruitment:Object.freeze([
    Object.freeze({label:'Recruit Heroes', action:'recruitment', icon:['resource','population'], description:'Discover and recruit heroes allowed by the current Recruitment Hall level.'})
  ]),
  training:Object.freeze([
    Object.freeze({label:'Open Talents', href:'./talent-calculator.html', icon:['talent','active'], description:'Open the talent workspace for hero build planning.'})
  ]),
  storehouse:Object.freeze([
    Object.freeze({label:'Open Inventory', href:'./inventory.html', icon:['equipment-slot','chest'], description:'Browse owned equipment across the roster.'})
  ]),
  questboard:Object.freeze([
    Object.freeze({label:'Open Quest Journal', href:'./quest-journal.html', icon:['quest','journal'], description:'Review available, active, and completed quests.'}),
    Object.freeze({label:'Dungeon Map', action:'dungeon-map', icon:['battle','combat'], description:'Open the Azeroth dungeon map and prepare a dungeon party.'})
  ]),
  artisans:Object.freeze([
    Object.freeze({label:'Open Professions', action:'artisans', icon:['building','artisans-guild'], description:'Open the Artisans Guild profession roster.'})
  ])
});

function buildingActions(building) {
  return BUILDING_ACTIONS[building.id] || [];
}

function buildingActionMarkup(action) {
  const content =
    iconMarkup(action.icon[0], action.icon[1], 'sm', 'base-sidecar__menu-icon') +
    '<span class="base-sidecar__menu-copy"><strong>' + action.label + '</strong><small>Open</small></span>';
  const tooltip =
    ' data-wow-tooltip="' + action.label + '" data-wow-tooltip-type="Building Action"' +
    ' data-wow-tooltip-description="' + action.description + '" data-wow-tooltip-variant="control"';
  if (action.href) return '<a class="base-sidecar__menu-item base-sidecar__action" href="' + action.href + '"' + tooltip + '>' + content + '</a>';
  return '<button class="base-sidecar__menu-item base-sidecar__action" type="button" data-building-action="' + action.action + '"' + tooltip + '>' + content + '</button>';
}

function upgradeControlMarkup(building, upgrade) {
  const next = upgrade.next;
  const label = next ? 'Upgrade to Level ' + next.level : 'Max Level';
  const stateLabel = next ? (upgrade.canUpgrade ? 'Ready' : 'Blocked') : 'Complete';
  return '<button id="baseSidecarUpgrade" class="base-sidecar__menu-item base-sidecar__upgrade-control' +
    (upgrade.canUpgrade ? '' : ' is-disabled') + '" type="button" aria-disabled="' +
    (upgrade.canUpgrade ? 'false' : 'true') + '">' +
      iconMarkup('building','upgrade','sm','base-sidecar__menu-icon') +
      '<span class="base-sidecar__menu-copy"><strong>' + label + '</strong><small>' + stateLabel + '</small></span>' +
    '</button>';
}

function validateRecruitmentData(payload) {
  if (!payload || !payload.factions || !Array.isArray(payload.factions.alliance) || !Array.isArray(payload.factions.horde)) throw new Error('Recruitment data requires Alliance and Horde candidate pools.');
  const ids = Object.values(payload.factions).flat().map(candidate => candidate.id);
  if (new Set(ids).size !== ids.length) throw new Error('Recruitment candidate IDs must be unique.');
  return payload;
}

function recruitmentConfig(building) {
  const progression = currentProgression(building);
  return progression && progression.recruitment ? progression.recruitment : {roster_capacity:0, discovery_limit:0};
}

function currentFactionRoster() {
  const faction = currentFactionId();
  return Roster.getState().heroes.filter(hero => String(hero.faction || '').toLowerCase() === faction);
}

function discoveredRecruitmentCandidates(building) {
  const config = recruitmentConfig(building);
  const faction = currentFactionId();
  const pool = recruitmentData && recruitmentData.factions ? recruitmentData.factions[faction] || [] : [];
  return pool.slice(0, config.discovery_limit);
}

function recruitmentCandidateTooltip(candidate) {
  return {
    variant:'control',
    title:candidate.name,
    type:candidate.race + ' ' + candidate.classLabel,
    icon:{category:'race', key:candidate.race},
    description:'Recruitable ' + candidate.spec + ' ' + candidate.classLabel + '.',
    stats:[
      {label:'Starting level', value:'1'},
      {label:'Primary stat', value:candidate.primary}
    ]
  };
}

function renderRecruitmentWorkflow(building) {
  const root = $('#recruitmentWorkflow');
  if (!root || !building) return;
  const config = recruitmentConfig(building);
  const faction = currentFactionId();
  const roster = currentFactionRoster();
  const candidates = discoveredRecruitmentCandidates(building);
  const full = roster.length >= config.roster_capacity;

  root.hidden = !state.recruitmentOpen;
  if (!state.recruitmentOpen) return;

  root.innerHTML =
    '<div class="base-sidecar__recruitment-head">' +
      '<span><strong>' + roster.length + ' / ' + config.roster_capacity + '</strong><small>Faction roster</small></span>' +
      '<span><strong>' + candidates.length + '</strong><small>Discovered</small></span>' +
    '</div>' +
    '<div id="recruitmentStatus" class="base-sidecar__recruitment-status" role="status" aria-live="polite">' +
      (state.recruitmentMessage || (full ? 'Recruitment capacity reached.' : 'Choose a discovered hero to recruit.')) +
    '</div>' +
    '<div class="base-sidecar__candidate-list"></div>';

  const list = root.querySelector('.base-sidecar__candidate-list');
  candidates.forEach(candidate => {
    const existing = Roster.hero(candidate.id);
    const row = document.createElement('article');
    row.className = 'base-sidecar__candidate' + (existing ? ' is-recruited' : '');
    row.innerHTML =
      iconMarkup('race', candidate.race, 'sm', 'base-sidecar__candidate-icon') +
      '<span class="base-sidecar__candidate-copy"><strong>' + candidate.name + '</strong><small>' + candidate.race + ' · ' + candidate.classLabel + ' · ' + candidate.spec + '</small></span>' +
      '<button class="wow-button base-sidecar__recruit-button' + ((full || existing) ? ' is-disabled' : '') + '" type="button" aria-disabled="' + ((full || existing) ? 'true' : 'false') + '">' +
        (existing ? 'Recruited' : 'Recruit') +
      '</button>';
    const button = row.querySelector('.base-sidecar__recruit-button');
    Tooltips.attach(row, () => recruitmentCandidateTooltip(candidate), {anchor:'target'});
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-disabled') === 'true') return;
      try {
        const factionLabel = faction === 'horde' ? 'Horde' : 'Alliance';
        Roster.recruitHero(Object.assign({}, candidate, {faction:factionLabel, level:1}), {rosterCapacity:config.roster_capacity});
        state.recruitmentMessage = candidate.name + ' joined the roster.';
        state.recruitmentOpen = true;
        renderSidecar();
      } catch (error) {
        state.recruitmentMessage = error.message;
        state.recruitmentOpen = true;
        renderSidecar();
      }
    });
    list.appendChild(row);
  });
  bindResolvedIcons(root);
}

function validateProfessionData(payload) {
  if (!payload || !Array.isArray(payload.professions) || payload.professions.length !== 6) throw new Error('Profession index requires six professions.');
  const ids = payload.professions.map(entry => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error('Profession IDs must be unique.');
  payload.professions.forEach(entry => {
    if (!entry.label || !entry.icon_key || !entry.definition_path || !entry.progression_id) throw new Error('Invalid profession metadata for ' + entry.id);
  });
  return payload;
}

function renderArtisansWorkflow(building) {
  const root = $('#artisansWorkflow');
  if (!root || !building || !professionData) return;
  root.hidden = !state.artisansOpen;
  if (!state.artisansOpen) return;

  root.innerHTML =
    '<div class="base-sidecar__artisan-head">' +
      '<span class="wow-kicker">PROFESSIONS</span>' +
      '<small>All professions · Level ' + building.level + '</small>' +
    '</div>' +
    '<div class="base-sidecar__profession-list"></div>';

  const list = root.querySelector('.base-sidecar__profession-list');
  professionData.professions.forEach(definition => {
    const item = document.createElement('a');
    item.className = 'base-sidecar__profession-entry';
    item.href = './profession.html?profession=' + encodeURIComponent(definition.id);
    item.setAttribute('aria-label', 'Open ' + definition.label + ', level ' + building.level);
    item.innerHTML =
      iconMarkup('profession', definition.icon_key, 'sm', 'base-sidecar__profession-icon') +
      '<span class="base-sidecar__profession-copy"><strong>' + definition.label + '</strong><small>Level ' + building.level + ' · Open profession</small></span>';
    list.appendChild(item);
  });
  bindResolvedIcons(root);
}

function bindResolvedIcons(root) {
  (root || document).querySelectorAll('.wow-icon-frame img').forEach(Icons.bindFallback);
}

function buildingTooltipModel(building) {
  const icon = buildingIconSpec(building);
  const current = currentProgression(building);
  const upgrade = upgradeState(building);
  const attention = buildingAttentionState(building);
  return {
    variant:building.category === 'profession' ? 'profession' : 'building', title:building.name,
    type:building.category === 'profession' ? 'Profession building' : 'Base building', icon:{category:icon[0], key:icon[1]},
    description:building.description,
    stats:[{label:'Level',value:building.level+' / 5'},{label:'Progression tier',value:'Tier '+building.level},{label:'Unlocks',value:(current.capabilities||[]).join(', ')||'Base capability'}]
      .concat(attention ? [{label:attention.label,value:attention.detail}] : [])
      .concat(upgrade.next ? Object.entries(upgrade.next.cost).map(([key,value])=>({label:'Next '+key,value:fmt(value)})) : []),
    meta:[{label:'Category',value:building.category==='profession'?'Profession':'Core'},{label:'Next level',value:upgrade.next ? String(upgrade.next.level) : 'MAX'}].concat(attention ? [{label:'Attention',value:attention.label}] : []),
    locked:attention && attention.key === 'blocked' ? [attention.detail] : (upgrade.reason ? [upgrade.reason] : [])
  };
}

function upgradeTooltipModel(building) {
  const upgrade = upgradeState(building);
  const icon = buildingIconSpec(building);
  if (!upgrade.next) {
    return {
      variant:'control',
      title:building.name + ' · Max Level',
      type:'Building upgrade',
      icon:{category:icon[0], key:icon[1]},
      description:'This building is already at maximum level.',
      stats:[{label:'Current level', value:String(building.level)}]
    };
  }
  const stats = [
    {label:'Upgrade', value:'Level ' + building.level + ' → ' + upgrade.next.level}
  ].concat(Object.entries(upgrade.next.cost).map(([key,value]) => ({label:labelize(key), value:fmt(value)})));
  if (building.id !== 'keep') {
    stats.push({label:'Keep gate', value:'Level ' + upgrade.keepGate.requiredLevel + ' required · current ' + upgrade.keepGate.currentLevel});
  }
  return {
    variant:'control',
    title:'Upgrade ' + building.name,
    type:upgrade.canUpgrade ? 'Ready' : 'Blocked',
    icon:{category:icon[0], key:icon[1]},
    description:upgrade.canUpgrade ? 'Spend the listed resources to advance this building.' : upgrade.reason,
    stats,
    locked:upgrade.canUpgrade ? [] : [upgrade.reason]
  };
}

function resourceTooltipModel(key) {
  const names = {gold:'Gold', lumber:'Lumber', stone:'Stone'};
  return {
    variant:'resource',
    title:names[key] || key,
    type:'Base resource',
    icon:key === 'gold' ? {category:'currency', key:'gold'} : {category:'resource', key:key},
    description:'Persistent base resource used for building upgrades.',
    stats:{label:'Current', value:fmt(state.resources[key] || 0)}
  };
}

function syncResourceBar() {
  $('#goldValue').textContent = fmt(state.resources.gold);
  $('#lumberValue').textContent = fmt(state.resources.lumber);
  $('#stoneValue').textContent = fmt(state.resources.stone);
  if (buildings.length) syncMapBuildings();
}

function syncBuildingAttention(plot, building) {
  const attention = buildingAttentionState(building);
  const existing = plot.querySelector('.base-plot-attention');

  if (!attention) {
    if (existing) existing.remove();
    delete plot.dataset.attentionState;
    return null;
  }

  plot.dataset.attentionState = attention.key;
  if (!existing || existing.dataset.attentionState !== attention.key) {
    if (existing) existing.remove();
    plot.insertAdjacentHTML('beforeend', attentionIconMarkup(attention));
    const marker = plot.querySelector('.base-plot-attention');
    if (marker) marker.dataset.attentionState = attention.key;
    bindResolvedIcons(plot);
  }
  return attention;
}

function validateBasePresentation(payload) {
  if (!payload || !payload.variants || !payload.variants.alliance || !payload.variants.horde) throw new Error('Base presentation requires Alliance and Horde variants');
  const requiredIds = all('.base-plot[data-building]').map(plot => plot.dataset.building).sort();
  ['alliance','horde'].forEach(faction => {
    const variant = payload.variants[faction];
    const ids = Object.keys(variant.positions || {}).sort();
    const mobileIds = Object.keys(variant.mobile_positions || {}).sort();
    if (JSON.stringify(ids) !== JSON.stringify(requiredIds)) throw new Error('Base presentation hotspots do not match map buildings for ' + faction);
    if (JSON.stringify(mobileIds) !== JSON.stringify(requiredIds)) throw new Error('Base mobile presentation hotspots do not match map buildings for ' + faction);
  });
  return payload;
}

function applyBasePresentation() {
  const map = $('#baseMap');
  const variant = currentBaseVariant();
  if (!map || !variant) return;

  const faction = currentFactionId();
  const mapClasses = Object.values(basePresentation.variants).map(entry => entry.map_class).filter(Boolean);
  map.classList.remove(...mapClasses);
  if (variant.map_class) map.classList.add(variant.map_class);
  map.dataset.faction = faction;
  document.body.dataset.faction = faction;
  map.setAttribute('aria-label', variant.label + ' base map');

  const crestFrame = document.querySelector('.base-map-caption__crest');
  const crestImage = $('#baseFactionCrest');
  if (crestFrame) crestFrame.className = 'base-map-caption__crest wow-faction-crest wow-faction-crest--' + faction;
  if (crestImage) {
    crestImage.src = Icons.resolve(variant.crest.category, variant.crest.key);
    crestImage.alt = variant.label + ' crest';
    Icons.bindFallback(crestImage);
  }

  $('#baseStrongholdName').textContent = variant.map_name;
  $('#baseStrongholdSubtitle').textContent = variant.subtitle;

  const useMobilePositions = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 700px)').matches;
  const positions = useMobilePositions ? variant.mobile_positions : variant.positions;
  Object.entries(positions || {}).forEach(([id, position]) => {
    const plot = document.querySelector('[data-building="' + id + '"]');
    if (!plot) return;
    plot.style.setProperty('--x', Number(position.x) + '%');
    plot.style.setProperty('--y', Number(position.y) + '%');
  });

  const keepImage = document.querySelector('[data-building="keep"] .plot-art img');
  if (keepImage && variant.keep_icon_key) {
    keepImage.dataset.wowIcon = 'building';
    keepImage.dataset.wowKey = variant.keep_icon_key;
    keepImage.src = Icons.resolve('building', variant.keep_icon_key);
    Icons.bindFallback(keepImage);
  }

  syncMapBuildings();
}

function syncMapBuildings() {
  all('.base-plot[data-building]').forEach(plot => {
    const building = buildings.find(entry => entry.id === plot.dataset.building);
    if (!building) return;
    const selected = state.selected === building.id;
    const attention = syncBuildingAttention(plot, building);
    plot.classList.toggle('selected', selected);
    plot.setAttribute('aria-pressed', selected ? 'true' : 'false');
    plot.setAttribute('aria-expanded', selected ? 'true' : 'false');
    plot.setAttribute('aria-controls', 'baseSidecar');
    plot.setAttribute('aria-label', building.name + ', level ' + building.level + (attention ? ', attention: ' + attention.label : ''));
    const level = plot.querySelector('.plot-label b');
    if (level) level.textContent = building.level;
  });
}

function questBoardBuilding(){return buildings.find(b=>b.id==="questboard");}
function compatibleLoadouts(size){return Roster.getState().loadouts.filter(l=>l.size===size&&Roster.validateLoadout(l,true).valid);}

function questSeedHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function questSeededRandom(seed) {
  let value = seed >>> 0;
  return function() {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ next >>> 15, next | 1);
    next ^= next + Math.imul(next ^ next >>> 7, next | 61);
    return ((next ^ next >>> 14) >>> 0) / 4294967296;
  };
}

function generateQuestOfferIds(round, boardLevel) {
  if (!questOfferPool) return [];
  const eligible = questOfferPool.offers.filter(offer => offer.min_board_level <= boardLevel);
  const random = questSeededRandom(questSeedHash(Roster.getQuestBoardState().seed + ':' + round + ':' + boardLevel));
  const shuffled = eligible.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(questOfferPool.offer_count, shuffled.length)).map(offer => offer.id);
}

function ensureDifferentQuestOfferSet(nextIds, previousIds, boardLevel) {
  if (!previousIds.length || nextIds.length !== previousIds.length) return nextIds;
  const sameSet = nextIds.every(id => previousIds.includes(id)) && previousIds.every(id => nextIds.includes(id));
  if (!sameSet) return nextIds;
  const replacement = questOfferPool.offers.find(offer => offer.min_board_level <= boardLevel && !previousIds.includes(offer.id));
  if (!replacement || !nextIds.length) return nextIds;
  return nextIds.slice(0, -1).concat(replacement.id);
}

function ensureQuestRoundOffers(board) {
  const boardState = Roster.getQuestBoardState();
  if (boardState.offerIds.length) return boardState.offerIds;
  const offerIds = generateQuestOfferIds(boardState.round, board.level);
  Roster.setQuestBoardOffers(offerIds);
  return offerIds;
}

function questBattleEncounter(offer,heroIds,assignment,loadoutId=null){
  const dungeon=factionStarterDungeon();
  if(!dungeon)throw new Error('No faction starter dungeon is available.');
  const partySize=Number(offer.party_size)||heroIds.length;
  return {
    kind:'quest',
    encounterName:offer.title,
    questOfferId:offer.id,
    questAssignmentId:assignment.id,
    questRound:assignment.round,
    dungeonId:dungeon.id,
    dungeonName:dungeon.display_name,
    npcPoolId:dungeon.npc_pool_id,
    partySize,
    enemyCount:Number(offer.encounter&&offer.encounter.enemy_count)||partySize,
    heroIds:heroIds.slice(),
    loadoutId:loadoutId||null,
    faction:currentFactionId(),
    seed:questSeedHash(offer.id+':'+assignment.round+':'+heroIds.join(',')),
    source:'questboard'
  };
}

function renderQuestOffers() {
  const board=questBoardBuilding(), root=$('#questOfferList');
  if(!board||!root||!questOfferPool)return;
  ensureQuestRoundOffers(board);
  root.innerHTML='';

  const boardState=Roster.getQuestBoardState();
  const status=$('#questBoardStatus');
  if(status) status.textContent=state.questMessage || 'Round '+boardState.round+' · Choose an offer and dispatch the required party.';

  const roundButton=$('#questBoardAdvance');
  if(roundButton){
    roundButton.textContent='Advance to Round '+(boardState.round+1);
    roundButton.addEventListener('click',()=>{
      const nextRound=boardState.round+1;
      const nextIds=ensureDifferentQuestOfferSet(generateQuestOfferIds(nextRound,board.level),boardState.offerIds,board.level);
      Roster.advanceQuestRound(nextIds);
      state.questMessage='Quest Board advanced to Round '+nextRound+'.';
      renderSidecar();
    },{once:true});
  }

  currentQuestOffers().forEach(offer=>{
    const quest=currentRoundQuestForOffer(offer.id);
    const active=quest&&quest.status==='active';
    const completed=quest&&quest.status==='completed';
    const card=document.createElement('article');
    card.className='quest-offer-card'+(active?' is-active':'')+(completed?' is-completed':'');
    const loadouts=offer.party_size>1?compatibleLoadouts(offer.party_size):[];
    const available=Roster.getState().heroes.filter(h=>h.availability==='available');
    card.innerHTML=
      '<div class="quest-offer-head"><strong>'+offer.title+'</strong><span>'+offer.party_size+' hero'+(offer.party_size===1?'':'es')+'</span><em>'+
      (active?'ACTIVE':completed?'COMPLETED':'AVAILABLE')+
      '</em></div>'+
      '<div class="quest-offer-description">'+offer.description+'</div>'+
      '<div class="quest-selection"></div>'+
      '<small class="quest-reward">Reward · '+fmt(offer.reward.gold)+' gold · '+offer.reward.meta_amount+' quest mark'+(offer.reward.meta_amount===1?'':'s')+'</small>';

    const selection=card.querySelector('.quest-selection');
    const battleOffer=[1,3].includes(offer.party_size)&&offer.encounter&&offer.encounter.kind==='npc';
    if(active){
      if(battleOffer){
        selection.innerHTML='<span class="quest-dispatched">Committed: '+quest.heroIds.map(id=>{const h=Roster.hero(id);return h?h.name:id;}).join(', ')+'</span><button class="wow-button wow-button--primary" type="button">Resume Battle</button>';
        selection.querySelector('button').addEventListener('click',()=>{
          try{
            const pending=Roster.getPendingEncounter();
            if(!pending||pending.questAssignmentId!==quest.id||pending.status==='resolved'){
              Roster.setPendingEncounter(questBattleEncounter(offer,quest.heroIds,quest));
            }
            window.location.href='./battle.html?encounter=quest&quest='+encodeURIComponent(quest.id);
          }catch(error){
            state.questMessage=error.message;
            renderSidecar();
          }
        });
      }else{
        selection.innerHTML='<span class="quest-dispatched">Dispatched: '+quest.heroIds.map(id=>{const h=Roster.hero(id);return h?h.name:id;}).join(', ')+'</span><button class="wow-button" type="button">Complete Quest</button>';
        selection.querySelector('button').addEventListener('click',()=>{
          const result=Roster.completeQuest(quest.id);
          state.questMessage=result?offer.title+' completed. Heroes returned to available status.':'Quest is not active.';
          syncMapBuildings();
          renderSidecar();
        });
      }
    } else if(completed){
      selection.innerHTML='<span class="quest-dispatched">Completed this round.</span>';
    } else {
      const select=document.createElement('select');
      select.className='wow-select quest-source';
      select.innerHTML='<option value="">Choose '+(offer.party_size===1?'hero':'party source')+'</option>'+
        (offer.party_size===1
          ? available.map(h=>'<option value="hero:'+h.id+'">'+h.name+' · '+h.classLabel+'</option>').join('')
          : loadouts.map(l=>'<option value="loadout:'+l.id+'">Saved · '+l.name+'</option>').join(''))+
        '<option value="adhoc">Ad-hoc roster</option>';
      if(offer.party_size===1)select.querySelector('option[value="adhoc"]').remove();
      selection.appendChild(select);
      const adhoc=document.createElement('div');adhoc.className='quest-adhoc';selection.appendChild(adhoc);
      const dispatch=document.createElement('button');dispatch.type='button';dispatch.className='wow-button wow-button--primary';dispatch.textContent=battleOffer?'Launch Battle':'Dispatch';dispatch.disabled=true;selection.appendChild(dispatch);
      let ids=[];
      let selectedLoadoutId=null;
      function sync(){dispatch.disabled=ids.length!==offer.party_size||ids.some(id=>{const h=Roster.hero(id);return !h||h.availability!=='available';});}
      select.addEventListener('change',()=>{
        ids=[];adhoc.innerHTML='';
        selectedLoadoutId=null;
        if(select.value.startsWith('hero:')) ids=[select.value.slice(5)];
        else if(select.value.startsWith('loadout:')){
          selectedLoadoutId=select.value.slice(8);
          const l=Roster.getState().loadouts.find(x=>x.id===selectedLoadoutId);
          ids=l?l.heroIds.slice():[];
        } else if(select.value==='adhoc'){
          available.forEach(h=>{
            const label=document.createElement('label');label.className='quest-hero-choice';
            label.innerHTML='<input type="checkbox" value="'+h.id+'"><span>'+h.name+'<small>'+h.classLabel+'</small></span>';
            label.querySelector('input').addEventListener('change',event=>{
              ids=event.target.checked?ids.concat(h.id):ids.filter(id=>id!==h.id);
              if(ids.length>offer.party_size){event.target.checked=false;ids=ids.filter(id=>id!==h.id);}
              sync();
            });
            adhoc.appendChild(label);
          });
        }
        sync();
      });
      dispatch.addEventListener('click',()=>{
        try{
          const assignment=Roster.dispatchQuest(offer,ids);
          if(battleOffer){
            Roster.setPendingEncounter(questBattleEncounter(offer,ids,assignment,selectedLoadoutId));
            window.location.href='./battle.html?encounter=quest&quest='+encodeURIComponent(assignment.id);
            return;
          }
          state.questMessage=offer.title+' dispatched with '+ids.length+' hero'+(ids.length===1?'':'es')+'.';
          syncMapBuildings();
          renderSidecar();
        }catch(error){
          state.questMessage=error.message;
          renderSidecar();
        }
      });
    }
    root.appendChild(card);
  });
}

function validateDungeonCatalog(payload) {
  if (!payload || !Array.isArray(payload.dungeons) || !payload.dungeons.length) throw new Error('Dungeon catalog is empty.');
  const ids = payload.dungeons.map(dungeon => dungeon.id);
  if (new Set(ids).size !== ids.length) throw new Error('Dungeon IDs must be unique.');
  payload.dungeons.forEach(dungeon => {
    const point = dungeon.map && dungeon.map.azeroth;
    if (!point || point.x_pct < 0 || point.x_pct > 100 || point.y_pct < 0 || point.y_pct > 100) throw new Error('Invalid Azeroth coordinate for ' + dungeon.id);
    if (!dungeon.npc_pool_id) throw new Error('Dungeon NPC pool missing for ' + dungeon.id);
  });
  return payload;
}

function dungeonForId(id) {
  return dungeonCatalog && dungeonCatalog.dungeons.find(dungeon => dungeon.id === id) || null;
}

function factionStarterDungeon() {
  if (!dungeonCatalog) return null;
  const faction = currentFactionId();
  return dungeonCatalog.dungeons.find(dungeon => (dungeon.faction.starter_for || []).includes(faction)) || dungeonCatalog.dungeons[0] || null;
}

function dungeonTooltipModel(dungeon) {
  const faction = currentFactionId();
  const starter = (dungeon.faction.starter_for || []).includes(faction);
  return {
    variant:'control',
    title:dungeon.display_name,
    type:dungeon.continent + ' · ' + dungeon.zone,
    icon:{category:'battle', key:'combat'},
    description:dungeon.subregion + (starter ? ' · Faction starter dungeon.' : ''),
    stats:[
      {label:'Party size', value:String(dungeon.party.canonical_size)},
      {label:'Access', value:(dungeon.faction.available_to || []).includes(faction) ? 'Available' : 'Unavailable'},
      {label:'NPC pool', value:dungeon.npc_pool_id}
    ],
    meta:[
      {label:'Continent', value:dungeon.continent},
      {label:'Zone', value:dungeon.zone}
    ]
  };
}

function renderDungeonSelection(dungeon) {
  const root = $('#dungeonSelection');
  if (!root || !dungeon) return;
  const size = Number(dungeon.party.canonical_size) || 5;
  const loadouts = compatibleLoadouts(size);
  const available = Roster.getState().heroes.filter(hero => hero.availability === 'available');
  root.innerHTML =
    '<div class="dungeon-selection__head">' +
      '<div><span class="wow-kicker">SELECTED DUNGEON</span><h4>' + dungeon.display_name + '</h4><small>' + dungeon.continent + ' · ' + dungeon.zone + ' · ' + size + ' players</small></div>' +
      '<span class="dungeon-selection__pool">' + dungeon.npc_pool_id + '</span>' +
    '</div>' +
    '<div id="dungeonPartyPicker" class="dungeon-party-picker"></div>';

  const picker = $('#dungeonPartyPicker');
  const select = document.createElement('select');
  select.className='wow-select dungeon-party-source';
  select.innerHTML='<option value="">Choose party source</option>'+
    loadouts.map(loadout=>'<option value="loadout:'+loadout.id+'">Saved · '+loadout.name+'</option>').join('')+
    '<option value="adhoc">Ad-hoc roster</option>';
  picker.appendChild(select);

  const adhoc=document.createElement('div');
  adhoc.className='quest-adhoc dungeon-party-adhoc';
  picker.appendChild(adhoc);

  const launch=document.createElement('button');
  launch.type='button';
  launch.className='wow-button wow-button--primary';
  launch.textContent='Launch Battle';
  launch.disabled=true;
  picker.appendChild(launch);

  let ids=[];
  function sync(){
    launch.disabled=ids.length!==size||ids.some(id=>{const hero=Roster.hero(id);return !hero||hero.availability!=='available';});
  }

  select.addEventListener('change',()=>{
    ids=[];
    adhoc.innerHTML='';
    if(select.value.startsWith('loadout:')){
      const loadout=Roster.getState().loadouts.find(entry=>entry.id===select.value.slice(8));
      ids=loadout?loadout.heroIds.slice():[];
    } else if(select.value==='adhoc'){
      available.forEach(hero=>{
        const label=document.createElement('label');
        label.className='quest-hero-choice';
        label.innerHTML='<input type="checkbox" value="'+hero.id+'"><span>'+hero.name+'<small>'+hero.classLabel+'</small></span>';
        label.querySelector('input').addEventListener('change',event=>{
          ids=event.target.checked?ids.concat(hero.id):ids.filter(id=>id!==hero.id);
          if(ids.length>size){event.target.checked=false;ids=ids.filter(id=>id!==hero.id);}
          sync();
        });
        adhoc.appendChild(label);
      });
    }
    sync();
  });

  launch.addEventListener('click',()=>{
    try{
      Roster.setPendingEncounter({
        kind:'dungeon',
        dungeonId:dungeon.id,
        dungeonName:dungeon.display_name,
        npcPoolId:dungeon.npc_pool_id,
        partySize:size,
        heroIds:ids,
        faction:currentFactionId(),
        seed:questSeedHash(dungeon.id+':'+ids.join(',')),
        source:'questboard'
      });
      window.location.href='./battle.html?encounter=dungeon&dungeon='+encodeURIComponent(dungeon.id);
    }catch(error){
      state.dungeonMessage=error.message;
      const status=$('#questBoardStatus');
      if(status) status.textContent=state.dungeonMessage;
    }
  });
}

function renderDungeonMap() {
  const map = $('#dungeonWorldMap');
  if (!map || !dungeonCatalog) return;
  const faction = currentFactionId();
  map.innerHTML =
    '<div class="dungeon-map__continent is-kalimdor" aria-hidden="true"><span>Kalimdor</span></div>' +
    '<div class="dungeon-map__continent is-eastern-kingdoms" aria-hidden="true"><span>Eastern Kingdoms</span></div>';

  let selected = dungeonForId(state.selectedDungeonId);
  if (!selected) {
    selected = factionStarterDungeon();
    state.selectedDungeonId = selected ? selected.id : null;
  }

  dungeonCatalog.dungeons.forEach(dungeon=>{
    const point=dungeon.map.azeroth;
    const starter=(dungeon.faction.starter_for||[]).includes(faction);
    const available=(dungeon.faction.available_to||[]).includes(faction);
    const button=document.createElement('button');
    button.type='button';
    button.className='dungeon-map__hotspot'+(starter?' is-starter':'')+(dungeon.id===state.selectedDungeonId?' is-selected':'')+(available?'':' is-locked');
    button.style.setProperty('--x',point.x_pct+'%');
    button.style.setProperty('--y',point.y_pct+'%');
    button.dataset.dungeonId=dungeon.id;
    button.setAttribute('aria-label',dungeon.display_name+', '+dungeon.zone+', '+dungeon.party.canonical_size+' players'+(starter?', faction starter':''));
    button.innerHTML=
      '<span class="dungeon-map__marker wow-icon-frame wow-icon-frame--xs"><img src="'+Icons.resolve('battle','combat')+'" alt=""></span>'+
      '<span class="dungeon-map__label"><strong>'+dungeon.display_name+'</strong><small>'+dungeon.zone+(starter?' · STARTER':'')+'</small></span>';
    button.querySelectorAll('img').forEach(Icons.bindFallback);
    Tooltips.attach(button,()=>dungeonTooltipModel(dungeon),{anchor:'target'});
    if(available) button.addEventListener('click',()=>{
      state.selectedDungeonId=dungeon.id;
      state.dungeonMessage='';
      renderDungeonMap();
    });
    map.appendChild(button);
  });

  const status=$('#questBoardStatus');
  if(status) status.textContent=state.dungeonMessage || (selected ? selected.display_name+' selected · choose a '+selected.party.canonical_size+'-hero party.' : 'Select a dungeon.');
  if(selected) renderDungeonSelection(selected);
}

function renderQuestBoard() {
  const offersView=$('#questOffersView');
  const mapView=$('#dungeonMapView');
  const offersTab=$('#questBoardOffersTab');
  const dungeonsTab=$('#questBoardDungeonsTab');
  if(!offersView||!mapView)return;
  const dungeonMode=state.questBoardMode==='dungeons';
  offersView.hidden=dungeonMode;
  mapView.hidden=!dungeonMode;
  if(offersTab){
    offersTab.classList.toggle('is-selected',!dungeonMode);
    offersTab.setAttribute('aria-pressed',dungeonMode?'false':'true');
  }
  if(dungeonsTab){
    dungeonsTab.classList.toggle('is-selected',dungeonMode);
    dungeonsTab.setAttribute('aria-pressed',dungeonMode?'true':'false');
  }
  if(dungeonMode) renderDungeonMap();
  else renderQuestOffers();
}

function toast(message) {
  const node = $('#baseToast');
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.hidden = true, 1800);
}

function renderSidecar() {
  const sidecar = $('#baseSidecar');
  const body = $('#baseSidecarBody');
  const building = buildings.find(item => item.id === state.selected);
  if (!sidecar || !body || !building) return;

  const current = currentProgression(building);
  const upgrade = upgradeState(building);
  const actions = buildingActions(building);

  $('#baseSidecarIcon').innerHTML = buildingIconMarkup(building, 'lg', 'base-sidecar__building-icon');
  $('#baseSidecarCategory').textContent = building.category === 'profession' ? 'PROFESSION BUILDING' : 'CORE BUILDING';
  $('#baseSidecarTitle').textContent = building.name;
  $('#baseSidecarLevel').textContent = 'Level ' + building.level + ' / ' + building.max + ' · Tier ' + current.tier;

  body.innerHTML =
    '<div class="base-sidecar__menu" aria-label="' + building.name + ' actions">' +
      actions.map(buildingActionMarkup).join('') +
      upgradeControlMarkup(building, upgrade) +
    '</div>';

  if (building.id === 'recruitment') {
    body.insertAdjacentHTML('beforeend',
      '<section id="recruitmentWorkflow" class="base-sidecar__section base-sidecar__recruitment" hidden></section>');
  }

  if (building.id === 'artisans') {
    body.insertAdjacentHTML('beforeend',
      '<section id="artisansWorkflow" class="base-sidecar__section base-sidecar__artisans" hidden></section>');
  }

  if (building.id === 'questboard') {
    body.insertAdjacentHTML('beforeend',
      '<section class="base-sidecar__section base-sidecar__quests">'+
        '<div class="base-sidecar__quest-head"><div><span class="wow-kicker">HERO DISPATCH</span><h3>Quest Board</h3></div><small>Round <span id="questBoardRound">'+Roster.getQuestBoardState().round+'</span></small></div>'+
        '<div class="quest-board-mode-tabs" role="group" aria-label="Quest Board mode">'+
          '<button id="questBoardOffersTab" class="wow-tab" type="button" aria-pressed="true">Quest Offers</button>'+
          '<button id="questBoardDungeonsTab" class="wow-tab" type="button" aria-pressed="false">Dungeon Map</button>'+
        '</div>'+
        '<div id="questBoardStatus" class="base-sidecar__quest-status" role="status" aria-live="polite"></div>'+
        '<div id="questOffersView">'+
          '<div id="questOfferList" class="quest-offer-list"></div>'+
          '<button id="questBoardAdvance" class="wow-button base-sidecar__quest-advance" type="button">Advance Round</button>'+
        '</div>'+
        '<div id="dungeonMapView" hidden>'+
          '<div id="dungeonWorldMap" class="dungeon-world-map wow-inset" aria-label="Azeroth dungeon map"></div>'+
          '<div id="dungeonSelection" class="dungeon-selection"></div>'+
        '</div>'+
      '</section>');
  }

  bindResolvedIcons(sidecar);
  Tooltips.hydrate(sidecar);
  if (building.id === 'questboard') {
    renderQuestBoard();
    const offersTab=$('#questBoardOffersTab');
    const dungeonsTab=$('#questBoardDungeonsTab');
    if(offersTab) offersTab.addEventListener('click',()=>{state.questBoardMode='offers';state.questMessage='';renderSidecar();});
    if(dungeonsTab) dungeonsTab.addEventListener('click',()=>{state.questBoardMode='dungeons';state.dungeonMessage='';renderSidecar();});
    const dungeonAction=sidecar.querySelector('[data-building-action="dungeon-map"]');
    if(dungeonAction) dungeonAction.addEventListener('click',()=>{state.questBoardMode='dungeons';state.dungeonMessage='';renderSidecar();});
  }
  if (building.id === 'recruitment') {
    renderRecruitmentWorkflow(building);
    const recruitmentAction = sidecar.querySelector('[data-building-action="recruitment"]');
    if (recruitmentAction) recruitmentAction.addEventListener('click', () => {
      state.recruitmentOpen = true;
      state.recruitmentMessage = '';
      renderSidecar();
    });
  }
  if (building.id === 'artisans') {
    renderArtisansWorkflow(building);
    const artisansAction = sidecar.querySelector('[data-building-action="artisans"]');
    if (artisansAction) artisansAction.addEventListener('click', () => {
      state.artisansOpen = true;
      renderSidecar();
    });
  }

  const upgradeButton = $('#baseSidecarUpgrade');
  if (upgradeButton) {
    Tooltips.attach(upgradeButton, () => upgradeTooltipModel(building), {anchor:'target'});
    upgradeButton.addEventListener('click', () => upgradeBuilding(building.id));
  }
}

function openSidecar(id, origin) {
  const building = buildings.find(item => item.id === id);
  const sidecar = $('#baseSidecar');
  if (!building || !sidecar) return;

  if (state.selected !== id) {
    state.recruitmentOpen = false;
    state.recruitmentMessage = '';
    state.artisansOpen = false;
    if (id !== 'questboard') {
      state.questBoardMode = 'offers';
      state.selectedDungeonId = null;
      state.dungeonMessage = '';
    }
  }
  state.selected = id;
  sidecarOrigin = origin || sidecarOrigin;
  syncMapBuildings();
  renderSidecar();
  sidecar.hidden = false;
  const body = $('#baseSidecarBody');
  if (body) body.scrollTop = 0;
  $('#baseSidecarClose')?.focus({preventScroll:true});
}

function closeSidecar(options = {}) {
  const sidecar = $('#baseSidecar');
  if (!sidecar || sidecar.hidden) return;

  const restoreFocus = options.restoreFocus !== false;
  sidecar.hidden = true;
  state.selected = null;
  syncMapBuildings();

  if (restoreFocus && sidecarOrigin && typeof sidecarOrigin.focus === 'function') {
    sidecarOrigin.focus({preventScroll:true});
  }
  sidecarOrigin = null;
}


function upgradeBuilding(id) {
  const b=buildings.find(item=>item.id===id);
  if(!b) return;
  const up=upgradeState(b);
  if(!up.next){ toast(b.name+' is already level '+b.max+'.'); return; }
  if(!up.canUpgrade){ renderSidecar(); toast(up.reason); return; }

  Object.entries(up.next.cost).forEach(([key,value])=>{ state.resources[key]-=value; });
  if(up.next.level!==b.level+1||up.next.level>b.max) throw new Error('Invalid building level transition');

  b.level=up.next.level;
  if (b.id === 'artisans') Professions.setGuildLevel(b.level);
  syncResourceBar();
  syncMapBuildings();
  if (b.id === 'questboard') {
    state.questMessage='Quest Board upgraded. Tier '+b.level+' quests are now unlocked.';
  }
  renderSidecar();
  toast(b.name+' upgraded to level '+b.level+' (Tier '+b.level+').');
}

$('#baseMap').addEventListener('click', event => {
  const plot = event.target.closest('[data-building]');
  if (plot) {
    openSidecar(plot.dataset.building, plot);
    return;
  }
  closeSidecar({restoreFocus:false});
});

$('#baseSidecarClose').addEventListener('click', () => closeSidecar());

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#baseSidecar').hidden) {
    event.preventDefault();
    closeSidecar();
  }
});

window.addEventListener('warcraft:roster-changed', () => {
  applyBasePresentation();
  if (state.selected && !$('#baseSidecar').hidden) renderSidecar();
});

window.addEventListener('resize', () => {
  if (basePresentation) applyBasePresentation();
});

async function initBase() {
  try {
    const responses=await Promise.all([fetch(BUILDING_DATA_ROOT),fetch(BASE_PRESENTATION_ROOT),fetch(RECRUITMENT_DATA_ROOT),fetch(PROFESSION_DATA_ROOT),fetch(QUEST_OFFER_POOL_ROOT),fetch(DUNGEON_CATALOG_ROOT)]);
    if(!responses[0].ok) throw new Error('Could not load '+BUILDING_DATA_ROOT);
    if(!responses[1].ok) throw new Error('Could not load '+BASE_PRESENTATION_ROOT);
    if(!responses[2].ok) throw new Error('Could not load '+RECRUITMENT_DATA_ROOT);
    if(!responses[3].ok) throw new Error('Could not load '+PROFESSION_DATA_ROOT);
    if(!responses[4].ok) throw new Error('Could not load '+QUEST_OFFER_POOL_ROOT);
    if(!responses[5].ok) throw new Error('Could not load '+DUNGEON_CATALOG_ROOT);
    const payload=await responses[0].json();
    buildings=payload.buildings.map(normalizeBuilding);
    basePresentation=validateBasePresentation(await responses[1].json());
    recruitmentData=validateRecruitmentData(await responses[2].json());
    professionData=validateProfessionData(await responses[3].json());
    questOfferPool=await responses[4].json();
    if(!questOfferPool||!Array.isArray(questOfferPool.offers)||!questOfferPool.offers.length) throw new Error('Quest offer pool is empty.');
    dungeonCatalog=validateDungeonCatalog(await responses[5].json());
    const artisansBuilding=buildings.find(entry=>entry.id==='artisans');
    if (artisansBuilding) artisansBuilding.level=Math.max(artisansBuilding.level,Professions.getGuildLevel());
    const questBoard=buildings.find(entry=>entry.id==='questboard');
    if (questBoard) ensureQuestRoundOffers(questBoard);
    Icons.hydrate(document); Tooltips.hydrate(document); bindResolvedIcons(document);
    applyBasePresentation();
    all('[data-building]').forEach(plot=>{ const building=buildings.find(entry=>entry.id===plot.dataset.building); if(building) Tooltips.attach(plot,()=>buildingTooltipModel(building)); });
    all('[data-resource]').forEach(element=>Tooltips.attach(element,()=>resourceTooltipModel(element.dataset.resource,element),{anchor:'target'}));
    syncResourceBar(); applyBasePresentation(); $('#baseSidecar').hidden = true;
  } catch(error) { toast(error.message); }
}
initBase();
