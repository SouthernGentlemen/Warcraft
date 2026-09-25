const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;
const BUILDING_DATA_ROOT = "../data/base/buildings.json";
let buildings = [];
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

function upgradeState(building) {
  const next = nextProgression(building);
  if (!next) return {canUpgrade:false, reason:"Maximum level reached", next:null};
  const unmet = [];
  Object.entries(next.cost).forEach(([key,value]) => { if ((state.resources[key] || 0) < value) unmet.push(key + " " + fmt(value)); });
  (next.requirements || []).forEach(req => {
    if (req.type === "building_level") {
      const dependency = buildings.find(entry => entry.id === req.building);
      if (!dependency || dependency.level < req.level) unmet.push((dependency ? dependency.name : req.building) + " level " + req.level);
    }
  });
  return {canUpgrade:unmet.length === 0, reason:unmet.length ? "Requires " + unmet.join(", ") : "", next:next};
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
  barracks:['building','barracks'],
  training:['building','training-grounds'],
  recruitment:['building','recruitment-hall'],
  command:['building','command-hall'],
  storehouse:['building','storehouse'],
  blacksmith:['profession','blacksmithing'],
  alchemy:['profession','alchemy'],
  enchanter:['profession','enchanting'],
  tailor:['profession','tailoring'],
  leather:['profession','leatherworking'],
  engineer:['profession','engineering'],
  questboard:['building','command-hall']
};

const costIconKeys = {
  gold:['currency','gold'],
  lumber:['resource','lumber'],
  stone:['resource','stone']
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
    return {key:'upgrade-ready', label:'Upgrade available', detail:'Resources and building requirements are met for the next level.'};
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

function buildingIconMarkup(building, size, extraClass) {
  const icon = buildingIconKeys[building.id] || ['building','keep'];
  return iconMarkup(icon[0], icon[1], size, extraClass || '');
}

function labelize(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function costMarkup(key, value) {
  const icon = costIconKeys[key];
  const affordable = (state.resources[key] || 0) >= value;
  return '<span class="building-cost ' + (affordable ? 'is-affordable' : 'is-short') + '" data-cost="' + key + '">' +
    iconMarkup(icon[0], icon[1], 'xs', 'building-cost-icon') +
    '<span><small>' + labelize(key) + '</small><b>' + fmt(value) + '</b></span>' +
  '</span>';
}

function capabilityMarkup(capabilities) {
  const rows = Array.isArray(capabilities) ? capabilities : [];
  return rows.length
    ? '<ul class="base-sidecar__capabilities">' + rows.map(value => '<li>' + labelize(value) + '</li>').join('') + '</ul>'
    : '<p class="base-sidecar__empty">No additional capability.</p>';
}

function requirementMarkup(requirements) {
  const rows = Array.isArray(requirements) ? requirements : [];
  if (!rows.length) return '<p class="base-sidecar__requirement is-met">No building prerequisite.</p>';
  return rows.map(req => {
    if (req.type !== 'building_level') return '<p class="base-sidecar__requirement">Requirement: ' + labelize(req.type) + '</p>';
    const dependency = buildings.find(entry => entry.id === req.building);
    const met = Boolean(dependency && dependency.level >= req.level);
    const name = dependency ? dependency.name : labelize(req.building);
    return '<p class="base-sidecar__requirement ' + (met ? 'is-met' : 'is-blocked') + '">' +
      '<strong>' + (met ? 'Met' : 'Required') + '</strong><span>' + name + ' Level ' + req.level + '</span>' +
    '</p>';
  }).join('');
}

function bindResolvedIcons(root) {
  (root || document).querySelectorAll('.wow-icon-frame img').forEach(Icons.bindFallback);
}

function buildingTooltipModel(building) {
  const icon = buildingIconKeys[building.id] || ['building','keep'];
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

function syncMapBuildings() {
  all('.base-plot[data-building]').forEach(plot => {
    const building = buildings.find(entry => entry.id === plot.dataset.building);
    if (!building) return;
    const selected = state.selected === building.id;
    const attention = syncBuildingAttention(plot, building);
    plot.classList.toggle('selected', selected);
    plot.setAttribute('aria-pressed', selected ? 'true' : 'false');
    plot.setAttribute('aria-label', building.name + ', level ' + building.level + (attention ? ', attention: ' + attention.label : ''));
    const level = plot.querySelector('.plot-label b');
    if (level) level.textContent = building.level;
  });
  syncQuestBoardMapState();
}

function questBoardBuilding(){return buildings.find(b=>b.id==="questboard");}
function compatibleLoadouts(size){return Roster.getState().loadouts.filter(l=>l.size===size&&Roster.validateLoadout(l,true).valid);}

function syncQuestBoardMapState() {
  const plot = document.querySelector('[data-building="questboard"]');
  const board = questBoardBuilding();
  if (!plot || !board) return;
  const quests = Roster.getState().quests;
  const active = quests.some(q => q.status === 'active');
  const completed = quests.some(q => q.status === 'completed');
  const status = completed ? 'completed' : active ? 'active' : 'available';
  plot.dataset.questStatus = status;
}

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
  const next = upgrade.next;

  $('#baseSidecarIcon').innerHTML = buildingIconMarkup(building, 'lg', 'base-sidecar__building-icon');
  $('#baseSidecarCategory').textContent = building.category === 'profession' ? 'PROFESSION BUILDING' : 'CORE BUILDING';
  $('#baseSidecarTitle').textContent = building.name;
  $('#baseSidecarLevel').textContent = 'Level ' + building.level + ' / ' + building.max + ' · Tier ' + current.tier;

  const identitySection =
    '<section class="base-sidecar__section base-sidecar__summary">' +
      '<p>' + building.description + '</p>' +
    '</section>';

  if (!next) {
    body.innerHTML =
      identitySection +
      '<section class="base-sidecar__section">' +
        '<span class="wow-label">Current Capability</span>' +
        capabilityMarkup(current.capabilities) +
      '</section>' +
      '<section class="base-sidecar__section base-sidecar__upgrade">' +
        '<span class="wow-kicker">MAXIMUM LEVEL</span>' +
        '<h3>Level ' + building.level + ' / ' + building.max + '</h3>' +
        '<p>This building has reached its current progression cap.</p>' +
        '<button class="wow-button wow-button--primary" type="button" disabled>MAX LEVEL</button>' +
      '</section>' +
      (building.category === 'profession'
        ? '<section class="base-sidecar__section"><span class="wow-label">Profession</span><button class="wow-button base-sidecar__profession-action" type="button" disabled>Profession actions coming later</button></section>'
        : '');
  } else {
    body.innerHTML =
      identitySection +
      '<section class="base-sidecar__section">' +
        '<span class="wow-label">Current Capability</span>' +
        capabilityMarkup(current.capabilities) +
      '</section>' +
      '<section class="base-sidecar__section">' +
        '<span class="wow-label">Next Level · ' + next.level + ' / ' + building.max + '</span>' +
        capabilityMarkup(next.capabilities) +
      '</section>' +
      '<section class="base-sidecar__section">' +
        '<span class="wow-label">Requirements</span>' +
        requirementMarkup(next.requirements) +
      '</section>' +
      '<section class="base-sidecar__section">' +
        '<span class="wow-label">Upgrade Cost</span>' +
        '<div class="base-sidecar__costs">' + Object.entries(next.cost).map(([key,value]) => costMarkup(key,value)).join('') + '</div>' +
      '</section>' +
      '<section class="base-sidecar__section base-sidecar__upgrade ' + (upgrade.canUpgrade ? 'is-ready' : 'is-blocked') + '">' +
        '<span class="wow-kicker">' + (upgrade.canUpgrade ? 'READY TO UPGRADE' : 'UPGRADE BLOCKED') + '</span>' +
        '<h3>Level ' + building.level + ' → ' + next.level + '</h3>' +
        (upgrade.reason ? '<p class="base-sidecar__blocked-copy">' + upgrade.reason + '</p>' : '<p>Requirements met. Spend the resources below to advance this building.</p>') +
        '<button id="baseSidecarUpgrade" class="wow-button wow-button--primary" type="button" ' + (upgrade.canUpgrade ? '' : 'disabled') + '>Upgrade to Level ' + next.level + '</button>' +
      '</section>' +
      (building.category === 'profession'
        ? '<section class="base-sidecar__section"><span class="wow-label">Profession</span><button class="wow-button base-sidecar__profession-action" type="button" disabled>Profession actions coming later</button></section>'
        : '');
  }

  if (building.id === 'questboard') {
    body.insertAdjacentHTML('beforeend',
      '<section class="base-sidecar__section base-sidecar__quests">'+
        '<div class="base-sidecar__quest-head"><div><span class="wow-kicker">HERO DISPATCH</span><h3>Quest Board</h3></div><small>Tier 1–'+building.level+' unlocked</small></div>'+
        '<p id="questBoardStatus" class="base-sidecar__quest-status" role="status" aria-live="polite"></p>'+
        '<div id="questTierList" class="quest-tier-list"></div>'+
      '</section>');
  }

  bindResolvedIcons(sidecar);
  if (building.id === 'questboard') renderQuestBoard();
  const upgradeButton = $('#baseSidecarUpgrade');
  if (upgradeButton) upgradeButton.addEventListener('click', () => upgradeBuilding(building.id));
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

function selectBuilding(id, origin) {
  openSidecar(id, origin);
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
  state.selected=id;
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
    selectBuilding(plot.dataset.building, plot);
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
  syncMapBuildings();
  if (state.selected === 'questboard' && !$('#baseSidecar').hidden) renderSidecar();
});

async function initBase() {
  try {
    const response=await fetch(BUILDING_DATA_ROOT); if(!response.ok) throw new Error('Could not load '+BUILDING_DATA_ROOT);
    const payload=await response.json(); buildings=payload.buildings.map(normalizeBuilding);
    Icons.hydrate(document); Tooltips.hydrate(document); bindResolvedIcons(document);
    all('[data-building]').forEach(plot=>{ const building=buildings.find(entry=>entry.id===plot.dataset.building); if(building) Tooltips.attach(plot,()=>buildingTooltipModel(building)); });
    all('[data-resource]').forEach(element=>Tooltips.attach(element,()=>resourceTooltipModel(element.dataset.resource,element),{anchor:'target'}));
    syncResourceBar(); syncMapBuildings(); $('#baseSidecar').hidden = true;
  } catch(error) { toast(error.message); }
}
initBase();
