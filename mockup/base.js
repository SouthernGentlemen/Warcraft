const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
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
  engineer:['profession','engineering']
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

function renderBuildings() {
  const list=$('#buildingList'); const filtered=buildings.filter(b=>state.filter==='all'||b.category===state.filter);
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
  const b=buildings.find(item=>item.id===state.selected)||buildings[0]; const current=currentProgression(b); const up=upgradeState(b);
  $('#selectionDetail').innerHTML=`
    <span class="wow-kicker">SELECTED BUILDING</span><div class="selection-title">${buildingIconMarkup(b,'md','selection-building-icon')}<div><strong>${b.name}</strong><small>Level ${b.level} / 5 · Tier ${b.level}</small></div></div>
    <p>${b.description}</p><div class="selection-progress wow-statusbar wow-statusbar--success"><span class="wow-statusbar__fill" style="--wow-value:${b.level*20}%"></span><span class="wow-statusbar__text">Level ${b.level} / 5</span></div>
    <div class="selection-upgrade"><strong>${up.next?'Next: Level '+up.next.level+' · Tier '+up.next.tier:'Maximum level reached'}</strong><small>Unlocked: ${(current.capabilities||[]).join(', ')}</small>${up.reason&&up.next?'<small class="building-requirement">'+up.reason+'</small>':''}</div>`;
  bindResolvedIcons($('#selectionDetail')); all('.base-plot').forEach(plot=>{ plot.classList.toggle('selected',plot.dataset.building===b.id); plot.setAttribute('aria-pressed',plot.dataset.building===b.id?'true':'false'); const level=plot.querySelector('.plot-label b'); const item=buildings.find(entry=>entry.id===plot.dataset.building); if(level&&item) level.textContent=item.level; });
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
  b.level=up.next.level; state.selected=id; syncResourceBar(); renderBuildings(); toast(b.name+' upgraded to level '+b.level+' (Tier '+b.level+').');
}

$('#buildingFilter').addEventListener('change', event => {
  state.filter = event.target.value;
  renderBuildings();
});

$('.building-tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-building-tab]');
  if (!button) return;
  state.tab = button.dataset.buildingTab;
  all('.building-tabs button').forEach(node => {
    const selected = node === button;
    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  toast(state.tab === 'upgrades' ? 'Upgrade queue mockup selected.' : 'Building list selected.');
});

$('#buildingList').addEventListener('click', event => {
  const upgrade = event.target.closest('[data-upgrade]');
  if (upgrade) {
    upgradeBuilding(upgrade.dataset.upgrade);
    return;
  }
  const select = event.target.closest('[data-building-row], [data-select-building]');
  if (select) selectBuilding(select.dataset.buildingRow || select.dataset.selectBuilding);
});

$('#baseMap').addEventListener('click', event => {
  const plot = event.target.closest('[data-building]');
  if (plot) selectBuilding(plot.dataset.building);
});

$('.base-action-bar').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const labels = {
    keep: 'Keep selected for upgrade review.',
    train: 'Training flow hook ready for hero progression.',
    recruit: 'Recruitment flow hook ready for roster expansion.',
    mission: 'Mission launch hook ready for content selection.'
  };
  if (button.dataset.action === 'keep') selectBuilding('keep');
  toast(labels[button.dataset.action]);
});

$('.base-game-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-panel]');
  if (!button) return;
  all('.base-game-nav [data-panel]').forEach(node => {
    const selected = node === button;
    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  if (button.dataset.panel === 'base') return;
  const label = button.querySelector('.base-rail-label');
  toast(`${label ? label.textContent : button.dataset.panel} is a navigation hook in this base mockup.`);
});

async function initBase() {
  try {
    const response=await fetch(BUILDING_DATA_ROOT); if(!response.ok) throw new Error('Could not load '+BUILDING_DATA_ROOT);
    const payload=await response.json(); buildings=payload.buildings.map(normalizeBuilding);
    Icons.hydrate(document); Tooltips.hydrate(document); bindResolvedIcons(document);
    all('[data-building]').forEach(plot=>{ const building=buildings.find(entry=>entry.id===plot.dataset.building); if(building) Tooltips.attach(plot,()=>buildingTooltipModel(building)); });
    all('[data-resource]').forEach(element=>Tooltips.attach(element,()=>resourceTooltipModel(element.dataset.resource,element),{anchor:'target'}));
    all('[data-currency]').forEach(element=>Tooltips.attach(element,()=>currencyTooltipModel(element.dataset.currency,element),{anchor:'target'}));
    syncResourceBar(); renderBuildings();
  } catch(error) { toast(error.message); }
}
initBase();
