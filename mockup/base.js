const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;
const BUILDING_DATA_ROOT = "../data/base/buildings.json";
const BASE_PRESENTATION_ROOT = "../data/base/presentation.json";
let buildings = [];
let basePresentation = null;
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
  blacksmith:['profession','blacksmithing'],
  alchemy:['profession','alchemy'],
  enchanter:['profession','enchanting'],
  tailor:['profession','tailoring'],
  leather:['profession','leatherworking'],
  engineer:['profession','engineering'],
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

function buildingAttentionState(building) {
  if (!building) return null;

  if (building.id === 'questboard') {
    const quests = Roster.getState().quests;
    const completed = quests.some(quest => quest.status === 'completed' && quest.tier <= building.level);
    if (completed) return {key:'quest-complete', label:'Quest complete', detail:'A completed quest is ready for review or another dispatch.'};

    const active = quests.some(quest => quest.status === 'active' && quest.tier <= building.level);
    const availableHeroes = Roster.getState().heroes.filter(hero => hero.availability === 'available').length;
    const ready = quests.some(quest => quest.tier <= building.level && quest.status !== 'active' && availableHeroes >= quest.requiredHeroes);
    if (ready) return {key:'quest-ready', label:'Quest ready', detail:'An unlocked quest can be dispatched with the currently available roster.'};
    if (active) return null;
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
    Object.freeze({label:'Manage Roster', href:'./heroes.html', icon:['resource','population'], description:'Review and manage the current hero roster.'})
  ]),
  training:Object.freeze([
    Object.freeze({label:'Open Talents', href:'./talent-calculator.html', icon:['talent','active'], description:'Open the talent workspace for hero build planning.'})
  ]),
  storehouse:Object.freeze([
    Object.freeze({label:'Open Inventory', href:'./inventory.html', icon:['equipment-slot','chest'], description:'Browse owned equipment across the roster.'})
  ]),
  questboard:Object.freeze([
    Object.freeze({label:'Open Quest Journal', href:'./quest-journal.html', icon:['quest','journal'], description:'Review available, active, and completed quests.'})
  ]),
  blacksmith:Object.freeze([
    Object.freeze({label:'Browse Inventory', href:'./inventory.html', icon:['profession','blacksmithing'], description:'Review owned equipment while profession workflows are consolidated into Artisans Guild.'})
  ]),
  alchemy:Object.freeze([
    Object.freeze({label:'Browse Inventory', href:'./inventory.html', icon:['profession','alchemy'], description:'Review owned items while profession workflows are consolidated into Artisans Guild.'})
  ]),
  enchanter:Object.freeze([
    Object.freeze({label:'Browse Inventory', href:'./inventory.html', icon:['profession','enchanting'], description:'Review owned equipment while profession workflows are consolidated into Artisans Guild.'})
  ]),
  tailor:Object.freeze([
    Object.freeze({label:'Browse Inventory', href:'./inventory.html', icon:['profession','tailoring'], description:'Review owned equipment while profession workflows are consolidated into Artisans Guild.'})
  ]),
  leather:Object.freeze([
    Object.freeze({label:'Browse Inventory', href:'./inventory.html', icon:['profession','leatherworking'], description:'Review owned equipment while profession workflows are consolidated into Artisans Guild.'})
  ]),
  engineer:Object.freeze([
    Object.freeze({label:'Browse Inventory', href:'./inventory.html', icon:['profession','engineering'], description:'Review owned items while profession workflows are consolidated into Artisans Guild.'})
  ])
});

function buildingActions(building) {
  return BUILDING_ACTIONS[building.id] || [];
}

function buildingActionMarkup(action) {
  return '<a class="base-sidecar__menu-item base-sidecar__action" href="' + action.href + '" ' +
    'data-wow-tooltip="' + action.label + '" data-wow-tooltip-type="Building Action" ' +
    'data-wow-tooltip-description="' + action.description + '" data-wow-tooltip-variant="control">' +
      iconMarkup(action.icon[0], action.icon[1], 'sm', 'base-sidecar__menu-icon') +
      '<span class="base-sidecar__menu-copy"><strong>' + action.label + '</strong><small>Open</small></span>' +
    '</a>';
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

function renderQuestBoard() {
  const board=questBoardBuilding(), root=$('#questTierList');
  if(!board||!root)return;
  root.innerHTML='';
  const status=$('#questBoardStatus');
  if(status) status.textContent=state.questMessage || 'Dispatch available heroes to unlocked quest tiers.';

  Roster.getState().quests.forEach(quest=>{
    const unlocked=board.level>=quest.tier;
    const active=quest.status==='active';
    const completed=quest.status==='completed';
    const card=document.createElement('article');
    card.className='quest-tier-card'+(!unlocked?' is-locked':'')+(active?' is-active':'')+(completed?' is-completed':'');
    const loadouts=quest.tier>1?compatibleLoadouts(quest.requiredHeroes):[];
    const available=Roster.getState().heroes.filter(h=>h.availability==='available');
    card.innerHTML=
      '<div class="quest-tier-head"><strong>Tier '+quest.tier+'</strong><span>'+quest.requiredHeroes+' hero'+(quest.requiredHeroes===1?'':'es')+'</span><em>'+
      (!unlocked?'LOCKED · Quest Board level '+quest.tier:active?'ACTIVE':completed?'COMPLETED · Ready again':'AVAILABLE')+
      '</em></div>'+
      '<div class="quest-selection"></div>'+
      '<small class="quest-reward">Reward · '+fmt(quest.reward.gold)+' gold · '+quest.reward.amount+' quest mark'+(quest.reward.amount===1?'':'s')+'</small>';

    const selection=card.querySelector('.quest-selection');
    if(active){
      selection.innerHTML='<span class="quest-dispatched">Dispatched: '+quest.heroIds.map(id=>{const h=Roster.hero(id);return h?h.name:id;}).join(', ')+'</span><button class="wow-button" type="button">Complete Quest</button>';
      selection.querySelector('button').addEventListener('click',()=>{
        const result=Roster.completeQuest(quest.tier);
        state.questMessage=result?'Tier '+quest.tier+' completed. Heroes returned to available status.':'Quest is not active.';
        syncMapBuildings();
        renderSidecar();
      });
    } else if(unlocked){
      const select=document.createElement('select');
      select.className='wow-select quest-source';
      select.innerHTML='<option value="">Choose '+(quest.tier===1?'hero':'party source')+'</option>'+
        (quest.tier===1
          ? available.map(h=>'<option value="hero:'+h.id+'">'+h.name+' · '+h.classLabel+'</option>').join('')
          : loadouts.map(l=>'<option value="loadout:'+l.id+'">Saved · '+l.name+'</option>').join(''))+
        '<option value="adhoc">Ad-hoc roster</option>';
      if(quest.tier===1)select.querySelector('option[value="adhoc"]').remove();
      selection.appendChild(select);
      const adhoc=document.createElement('div');adhoc.className='quest-adhoc';selection.appendChild(adhoc);
      const dispatch=document.createElement('button');dispatch.type='button';dispatch.className='wow-button wow-button--primary';dispatch.textContent='Dispatch';dispatch.disabled=true;selection.appendChild(dispatch);
      let ids=[];
      function sync(){dispatch.disabled=ids.length!==quest.requiredHeroes||ids.some(id=>{const h=Roster.hero(id);return !h||h.availability!=='available';});}
      select.addEventListener('change',()=>{
        ids=[];adhoc.innerHTML='';
        if(select.value.startsWith('hero:')) ids=[select.value.slice(5)];
        else if(select.value.startsWith('loadout:')){
          const l=Roster.getState().loadouts.find(x=>x.id===select.value.slice(8));
          ids=l?l.heroIds.slice():[];
        } else if(select.value==='adhoc'){
          available.forEach(h=>{
            const label=document.createElement('label');label.className='quest-hero-choice';
            label.innerHTML='<input type="checkbox" value="'+h.id+'"><span>'+h.name+'<small>'+h.classLabel+'</small></span>';
            label.querySelector('input').addEventListener('change',e=>{
              ids=e.target.checked?ids.concat(h.id):ids.filter(id=>id!==h.id);
              if(ids.length>quest.requiredHeroes){e.target.checked=false;ids=ids.filter(id=>id!==h.id);}
              sync();
            });
            adhoc.appendChild(label);
          });
        }
        sync();
      });
      dispatch.addEventListener('click',()=>{
        try{
          Roster.dispatchQuest(quest.tier,ids);
          state.questMessage='Tier '+quest.tier+' dispatched with '+ids.length+' hero'+(ids.length===1?'':'es')+'.';
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

  if (building.id === 'questboard') {
    body.insertAdjacentHTML('beforeend',
      '<section class="base-sidecar__section base-sidecar__quests">'+
        '<div class="base-sidecar__quest-head"><div><span class="wow-kicker">HERO DISPATCH</span><h3>Quest Board</h3></div><small>Tier 1–'+building.level+' unlocked</small></div>'+
        '<div id="questBoardStatus" class="base-sidecar__quest-status" role="status" aria-live="polite"></div>'+
        '<div id="questTierList" class="quest-tier-list"></div>'+
      '</section>');
  }

  bindResolvedIcons(sidecar);
  Tooltips.hydrate(sidecar);
  if (building.id === 'questboard') renderQuestBoard();

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
    const responses=await Promise.all([fetch(BUILDING_DATA_ROOT),fetch(BASE_PRESENTATION_ROOT)]);
    if(!responses[0].ok) throw new Error('Could not load '+BUILDING_DATA_ROOT);
    if(!responses[1].ok) throw new Error('Could not load '+BASE_PRESENTATION_ROOT);
    const payload=await responses[0].json();
    buildings=payload.buildings.map(normalizeBuilding);
    basePresentation=validateBasePresentation(await responses[1].json());
    Icons.hydrate(document); Tooltips.hydrate(document); bindResolvedIcons(document);
    applyBasePresentation();
    all('[data-building]').forEach(plot=>{ const building=buildings.find(entry=>entry.id===plot.dataset.building); if(building) Tooltips.attach(plot,()=>buildingTooltipModel(building)); });
    all('[data-resource]').forEach(element=>Tooltips.attach(element,()=>resourceTooltipModel(element.dataset.resource,element),{anchor:'target'}));
    syncResourceBar(); applyBasePresentation(); $('#baseSidecar').hidden = true;
  } catch(error) { toast(error.message); }
}
initBase();
