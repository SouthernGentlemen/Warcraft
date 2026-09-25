const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;
const BUILDING_DATA_ROOT = "../data/base/buildings.json";
let buildings = [];

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
  selected: 'keep',
  filter: 'all',
  tab: 'buildings',
  resources: { gold: 25430, lumber: 12680, stone: 8440, mana: 2350 }
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

function iconMarkup(category, key, size, extraClass) {
  return '<span class="wow-icon-frame ' + (size ? 'wow-icon-frame--' + size : '') + ' ' + (extraClass || '') + '">' +
    '<img src="' + Icons.resolve(category, key) + '" alt="">' +
  '</span>';
}

function buildingIconMarkup(building, size, extraClass) {
  const icon = buildingIconKeys[building.id] || ['building','keep'];
  return iconMarkup(icon[0], icon[1], size, extraClass || '');
}

function costMarkup(key, value) {
  const icon = costIconKeys[key];
  return '<span class="building-cost" data-cost="' + key + '">' +
    iconMarkup(icon[0], icon[1], 'xs', 'building-cost-icon') +
    '<b>' + fmt(value) + '</b>' +
  '</span>';
}

function bindResolvedIcons(root) {
  (root || document).querySelectorAll('.wow-icon-frame img').forEach(Icons.bindFallback);
}

function buildingTooltipModel(building) {
  const icon = buildingIconKeys[building.id] || ['building','keep'];
  const current = currentProgression(building);
  const upgrade = upgradeState(building);
  return {
    variant:building.category === 'profession' ? 'profession' : 'building', title:building.name,
    type:building.category === 'profession' ? 'Profession building' : 'Base building', icon:{category:icon[0], key:icon[1]},
    description:building.description,
    stats:[{label:'Level',value:building.level+' / 5'},{label:'Progression tier',value:'Tier '+building.level},{label:'Unlocks',value:(current.capabilities||[]).join(', ')||'Base capability'}].concat(upgrade.next ? Object.entries(upgrade.next.cost).map(([key,value])=>({label:'Next '+key,value:fmt(value)})) : []),
    meta:[{label:'Category',value:building.category==='profession'?'Profession':'Core'},{label:'Next level',value:upgrade.next ? String(upgrade.next.level) : 'MAX'}],
    locked:upgrade.reason ? [upgrade.reason] : []
  };
}

function resourceTooltipModel(key, element) {
  const names = {gold:'Gold', lumber:'Lumber', stone:'Stone', mana:'Mana', population:'Population'};
  const current = key === 'population'
    ? element.querySelector('strong').textContent
    : fmt(state.resources[key]);
  return {
    variant:'resource',
    title:names[key] || key,
    type:'Base resource',
    icon:key === 'gold' ? {category:'currency', key:'gold'} : {category:'resource', key:key},
    description:key === 'population'
      ? 'Current roster and settlement capacity.'
      : 'Persistent base resource used for upgrades and progression.',
    stats:[
      {label:'Current', value:current},
      {label:'Rate', value:element.querySelector('small') ? element.querySelector('small').textContent : '—'}
    ]
  };
}

function currencyTooltipModel(key, element) {
  const name = element.querySelector('small') ? element.querySelector('small').textContent : key;
  return {
    variant:'currency',
    title:name,
    type:'Account currency',
    icon:{category:'currency', key:key},
    description:'Persistent progression currency shown in the base status strip.',
    stats:{label:'Current', value:element.querySelector('strong') ? element.querySelector('strong').textContent : '—'}
  };
}

function bindBuildingTooltips(root) {
  root.querySelectorAll('[data-select-building], [data-upgrade]').forEach(button => {
    const id = button.dataset.selectBuilding || button.dataset.upgrade;
    const building = buildings.find(entry => entry.id === id);
    if (building) Tooltips.attach(button, () => buildingTooltipModel(building));
  });
}

function syncResourceBar() {
  $('#goldValue').textContent = fmt(state.resources.gold);
  $('#lumberValue').textContent = fmt(state.resources.lumber);
  $('#stoneValue').textContent = fmt(state.resources.stone);
  $('#manaValue').textContent = fmt(state.resources.mana);
}

function syncMapBuildings() {
  all('.base-plot[data-building]').forEach(plot => {
    const building = buildings.find(entry => entry.id === plot.dataset.building);
    if (!building) return;
    const selected = state.selected === building.id;
    plot.classList.toggle('selected', selected);
    plot.setAttribute('aria-pressed', selected ? 'true' : 'false');
    const level = plot.querySelector('.plot-label b');
    if (level) level.textContent = building.level;
  });
}

function renderBuildings() {
  syncMapBuildings();
  const list=$('#buildingList');
  if (!list) return;
  const filtered=buildings.filter(b=>state.filter==='all'||b.category===state.filter);
  list.innerHTML=filtered.map(b=>{ const up=upgradeState(b); const next=up.next; return `
    <article class="building-row ${state.selected===b.id?'selected':''}" data-building-row="${b.id}">
      <button class="building-thumb" type="button" data-select-building="${b.id}" aria-label="Select ${b.name}">${buildingIconMarkup(b,'lg','building-thumb-icon')}</button>
      <div class="building-copy"><div class="building-title"><strong>${b.name}</strong><span>Level ${b.level} / 5</span></div><p>${b.description}</p>
      <div class="building-costs">${next ? Object.entries(next.cost).map(([key,value])=>costMarkup(key,value)).join('') : '<strong class="building-max-copy">Maximum level</strong>'}</div>
      ${up.reason && next ? '<small class="building-requirement">'+up.reason+'</small>' : ''}</div>
      <button class="building-upgrade wow-button wow-button--primary" type="button" data-upgrade="${b.id}" ${!up.canUpgrade?'disabled':''} aria-label="${up.canUpgrade?'Upgrade '+b.name+' to level '+next.level:up.reason}">${next?'Upgrade to '+next.level:'MAX LEVEL'}</button>
    </article>`; }).join('');
  bindResolvedIcons(list); bindBuildingTooltips(list); renderSelection();
}

function renderSelection() {
  syncMapBuildings();
  const detail = $('#selectionDetail');
  if (!detail) return;
  const b=buildings.find(item=>item.id===state.selected)||buildings[0];
  if (!b) return;
  const current=currentProgression(b); const up=upgradeState(b);
  detail.innerHTML=`
    <span class="wow-kicker">SELECTED BUILDING</span><div class="selection-title">${buildingIconMarkup(b,'md','selection-building-icon')}<div><strong>${b.name}</strong><small>Level ${b.level} / 5 · Tier ${b.level}</small></div></div>
    <p>${b.description}</p><div class="selection-progress wow-statusbar wow-statusbar--success"><span class="wow-statusbar__fill" style="--wow-value:${b.level*20}%"></span><span class="wow-statusbar__text">Level ${b.level} / 5</span></div>
    <div class="selection-upgrade"><strong>${up.next?'Next: Level '+up.next.level+' · Tier '+up.next.tier:'Maximum level reached'}</strong><small>Unlocked: ${(current.capabilities||[]).join(', ')}</small>${up.reason&&up.next?'<small class="building-requirement">'+up.reason+'</small>':''}</div>`;
  bindResolvedIcons(detail);
}

function questBoardBuilding(){return buildings.find(b=>b.id==="questboard");}
function compatibleLoadouts(size){return Roster.getState().loadouts.filter(l=>l.size===size&&Roster.validateLoadout(l,true).valid);}
function renderQuestBoard(){
  const board=questBoardBuilding(), levelNode=$('#questBoardLevel'), root=$('#questTierList');
  if(!board||!levelNode||!root)return;
  levelNode.textContent='Level '+board.level+' / 5';root.innerHTML='';
  Roster.getState().quests.forEach(quest=>{const unlocked=board.level>=quest.tier,active=quest.status==='active',card=document.createElement('article');card.className='quest-tier-card'+(!unlocked?' is-locked':'')+(active?' is-active':'')+(quest.status==='completed'?' is-completed':'');
    const loadouts=quest.tier>1?compatibleLoadouts(quest.requiredHeroes):[];const available=Roster.getState().heroes.filter(h=>h.availability==='available');
    card.innerHTML='<div class="quest-tier-head"><strong>Tier '+quest.tier+'</strong><span>'+quest.requiredHeroes+' hero'+(quest.requiredHeroes===1?'':'es')+'</span><em>'+(!unlocked?'LOCKED · Quest Board level '+quest.tier:active?'ACTIVE':quest.status==='completed'?'COMPLETED · Ready again':'AVAILABLE')+'</em></div><div class="quest-selection"></div><small class="quest-reward">Reward hook · '+quest.reward.gold+' gold · '+quest.reward.amount+' quest mark'+(quest.reward.amount===1?'':'s')+'</small>';
    const selection=card.querySelector('.quest-selection');
    if(active){selection.innerHTML='<span>Dispatched: '+quest.heroIds.map(id=>{const h=Roster.hero(id);return h?h.name:id;}).join(', ')+'</span><button class="wow-button" type="button">Complete Quest</button>';selection.querySelector('button').addEventListener('click',()=>{Roster.completeQuest(quest.tier);renderQuestBoard();toast('Tier '+quest.tier+' quest completed. Heroes are available again.');});}
    else if(unlocked){const select=document.createElement('select');select.className='wow-select quest-source';select.innerHTML='<option value="">Choose '+(quest.tier===1?'hero':'party source')+'</option>'+(quest.tier===1?available.map(h=>'<option value="hero:'+h.id+'">'+h.name+' · '+h.classLabel+'</option>').join(''):loadouts.map(l=>'<option value="loadout:'+l.id+'">Saved · '+l.name+'</option>').join(''))+'<option value="adhoc">Ad-hoc roster</option>';if(quest.tier===1)select.querySelector('option[value="adhoc"]').remove();selection.appendChild(select);const adhoc=document.createElement('div');adhoc.className='quest-adhoc';selection.appendChild(adhoc);const dispatch=document.createElement('button');dispatch.type='button';dispatch.className='wow-button wow-button--primary';dispatch.textContent='Dispatch';dispatch.disabled=true;selection.appendChild(dispatch);let ids=[];
      function sync(){dispatch.disabled=ids.length!==quest.requiredHeroes||ids.some(id=>{const h=Roster.hero(id);return !h||h.availability!=='available';});}
      select.addEventListener('change',()=>{ids=[];adhoc.innerHTML='';if(select.value.startsWith('hero:'))ids=[select.value.slice(5)];else if(select.value.startsWith('loadout:')){const l=Roster.getState().loadouts.find(x=>x.id===select.value.slice(8));ids=l?l.heroIds.slice():[];}else if(select.value==='adhoc'){available.forEach(h=>{const label=document.createElement('label');label.className='quest-hero-choice';label.innerHTML='<input type="checkbox" value="'+h.id+'"><span>'+h.name+'<small>'+h.classLabel+'</small></span>';label.querySelector('input').addEventListener('change',e=>{ids=e.target.checked?ids.concat(h.id):ids.filter(id=>id!==h.id);if(ids.length>quest.requiredHeroes){e.target.checked=false;ids=ids.filter(id=>id!==h.id);}sync();});adhoc.appendChild(label);});}sync();});
      dispatch.addEventListener('click',()=>{try{Roster.dispatchQuest(quest.tier,ids);renderQuestBoard();toast('Tier '+quest.tier+' quest dispatched.');}catch(error){toast(error.message);}});
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

function selectBuilding(id) {
  state.selected = id;
  renderBuildings();
}

function upgradeBuilding(id) {
  const b=buildings.find(item=>item.id===id); if(!b) return; const up=upgradeState(b);
  if(!up.next){ toast(b.name+' is already level 5.'); return; }
  if(!up.canUpgrade){ toast(up.reason); return; }
  Object.entries(up.next.cost).forEach(([key,value])=>{ state.resources[key]-=value; });
  if(up.next.level!==b.level+1||up.next.level>5) throw new Error('Invalid building level transition');
  b.level=up.next.level; state.selected=id; syncResourceBar(); renderBuildings(); renderQuestBoard(); toast(b.name+' upgraded to level '+b.level+' (Tier '+b.level+').');
}

$('#baseMap').addEventListener('click', event => {
  const plot = event.target.closest('[data-building]');
  if (plot) selectBuilding(plot.dataset.building);
});

async function initBase() {
  try {
    const response=await fetch(BUILDING_DATA_ROOT); if(!response.ok) throw new Error('Could not load '+BUILDING_DATA_ROOT);
    const payload=await response.json(); buildings=payload.buildings.map(normalizeBuilding);
    Icons.hydrate(document); Tooltips.hydrate(document); bindResolvedIcons(document);
    all('[data-building]').forEach(plot=>{ const building=buildings.find(entry=>entry.id===plot.dataset.building); if(building) Tooltips.attach(plot,()=>buildingTooltipModel(building)); });
    all('[data-resource]').forEach(element=>Tooltips.attach(element,()=>resourceTooltipModel(element.dataset.resource,element),{anchor:'target'}));
    all('[data-currency]').forEach(element=>Tooltips.attach(element,()=>currencyTooltipModel(element.dataset.currency,element),{anchor:'target'}));
    syncResourceBar(); renderBuildings(); renderQuestBoard();
  } catch(error) { toast(error.message); }
}
initBase();
