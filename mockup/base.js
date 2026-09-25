const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const buildings = [
  { id: 'keep', name: 'Headquarters (Keep)', short: 'Keep', category: 'core', level: 10, max: 20, description: 'The heart of your base. Unlocks buildings, tiers, and roster capacity.', costs: [3000, 2000, 500] },
  { id: 'barracks', name: 'Barracks', category: 'core', level: 6, max: 20, description: 'Trains footmen and basic military units.', costs: [1200, 800, 200] },
  { id: 'training', name: 'Training Grounds', category: 'core', level: 5, max: 20, description: 'Improves hero training speed and raises training capacity.', costs: [900, 600, 150] },
  { id: 'recruitment', name: 'Recruitment Hall', category: 'core', level: 4, max: 20, description: 'Adds recruitment capacity and improves hero discovery.', costs: [1000, 700, 250] },
  { id: 'command', name: 'Command Hall', category: 'core', level: 4, max: 20, description: 'Provides global mission and roster bonuses.', costs: [800, 600, 200] },
  { id: 'storehouse', name: 'Storehouse', category: 'core', level: 5, max: 20, description: 'Increases persistent resource and crafted-item storage.', costs: [700, 500, 200] },
  { id: 'blacksmith', name: 'Blacksmith', category: 'profession', level: 4, max: 20, description: 'Crafts and upgrades metal weapons and armor.', costs: [800, 600, 200] },
  { id: 'alchemy', name: 'Alchemy Lab', category: 'profession', level: 3, max: 20, description: 'Produces potions, reagents, and consumable combat boosts.', costs: [600, 400, 150] },
  { id: 'enchanter', name: "Enchanter's Study", category: 'profession', level: 3, max: 20, description: 'Creates magical enhancements for equipment.', costs: [650, 450, 175] },
  { id: 'tailor', name: 'Tailor', category: 'profession', level: 3, max: 20, description: 'Crafts cloth equipment and caster-focused gear.', costs: [520, 350, 130] },
  { id: 'leather', name: 'Leatherworker', category: 'profession', level: 3, max: 20, description: 'Crafts leather equipment and flexible armor sets.', costs: [520, 350, 130] },
  { id: 'engineer', name: 'Engineer Workshop', category: 'profession', level: 4, max: 20, description: 'Builds devices, utility equipment, and mechanical upgrades.', costs: [850, 650, 260] }
];

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
  blacksmith:['profession','blacksmith'],
  alchemy:['profession','alchemist'],
  enchanter:['profession','enchanter'],
  tailor:['profession','tailor'],
  leather:['profession','leatherworker'],
  engineer:['profession','engineer']
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
  return {
    variant:building.category === 'profession' ? 'profession' : 'building',
    title:building.name,
    type:building.category === 'profession' ? 'Profession building' : 'Base building',
    icon:{category:icon[0], key:icon[1]},
    description:building.description,
    stats:[
      {label:'Level', value:building.level + ' / ' + building.max},
      {label:'Gold', value:fmt(building.costs[0])},
      {label:'Lumber', value:fmt(building.costs[1])},
      {label:'Stone', value:fmt(building.costs[2])}
    ],
    meta:{label:'Category', value:building.category === 'profession' ? 'Profession' : 'Core'},
    locked:building.level >= building.max ? ['Maximum level reached'] : []
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
  const list = $('#buildingList');
  const filtered = buildings.filter(b => state.filter === 'all' || b.category === state.filter);
  list.innerHTML = filtered.map(b => `
    <article class="building-row ${state.selected === b.id ? 'selected' : ''}" data-building-row="${b.id}">
      <button class="building-thumb" type="button" data-select-building="${b.id}" aria-label="Select ${b.name}">
        ${buildingIconMarkup(b, 'lg', 'building-thumb-icon')}
      </button>
      <div class="building-copy">
        <div class="building-title"><strong>${b.name}</strong><span class="wow-tier-label">Lv. ${b.level} / ${b.max}</span></div>
        <p>${b.description}</p>
        <div class="building-costs">
          ${costMarkup('gold', b.costs[0])}
          ${costMarkup('lumber', b.costs[1])}
          ${costMarkup('stone', b.costs[2])}
        </div>
      </div>
      <button class="building-upgrade wow-button wow-button--primary" type="button" data-upgrade="${b.id}" ${b.level >= b.max ? 'disabled aria-label="Maximum level reached"' : ''}>${b.level >= b.max ? 'MAX LEVEL' : 'Upgrade'}</button>
    </article>`).join('');

  bindResolvedIcons(list);
  bindBuildingTooltips(list);
  renderSelection();
}

function renderSelection() {
  const b = buildings.find(item => item.id === state.selected) || buildings[0];
  $('#selectionDetail').innerHTML = `
    <span class="wow-kicker">SELECTED BUILDING</span>
    <div class="selection-title">
      ${buildingIconMarkup(b, 'md', 'selection-building-icon')}
      <div><strong>${b.name}</strong><small>Level ${b.level} / ${b.max}</small></div>
    </div>
    <p>${b.description}</p>
    <div class="selection-progress wow-statusbar wow-statusbar--success">
      <span class="wow-statusbar__fill" style="--wow-value:${Math.round((b.level / b.max) * 100)}%"></span>
      <span class="wow-statusbar__text">${b.level} / ${b.max}</span>
    </div>`;

  bindResolvedIcons($('#selectionDetail'));
  all('.base-plot').forEach(plot => {
    plot.classList.toggle('selected', plot.dataset.building === b.id);
    plot.setAttribute('aria-pressed', plot.dataset.building === b.id ? 'true' : 'false');
    const level = plot.querySelector('.plot-label b');
    const item = buildings.find(entry => entry.id === plot.dataset.building);
    if (level && item) level.textContent = item.level;
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
  const b = buildings.find(item => item.id === id);
  if (!b || b.level >= b.max) return;
  const [gold, lumber, stone] = b.costs;
  if (state.resources.gold < gold || state.resources.lumber < lumber || state.resources.stone < stone) {
    toast(`Not enough resources to upgrade ${b.name}.`);
    return;
  }

  state.resources.gold -= gold;
  state.resources.lumber -= lumber;
  state.resources.stone -= stone;
  b.level += 1;
  b.costs = b.costs.map(value => Math.ceil(value * 1.22 / 10) * 10);
  state.selected = id;
  syncResourceBar();
  renderBuildings();
  toast(`${b.name} upgraded to level ${b.level}.`);
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

Icons.hydrate(document);
Tooltips.hydrate(document);
bindResolvedIcons(document);
all('[data-building]').forEach(plot => {
  const building = buildings.find(entry => entry.id === plot.dataset.building);
  if (building) Tooltips.attach(plot, () => buildingTooltipModel(building));
});
all('[data-resource]').forEach(element => {
  Tooltips.attach(element, () => resourceTooltipModel(element.dataset.resource, element), {anchor:'target'});
});
all('[data-currency]').forEach(element => {
  Tooltips.attach(element, () => currencyTooltipModel(element.dataset.currency, element), {anchor:'target'});
});

syncResourceBar();
renderBuildings();
