const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;
const Equipment = window.WarcraftEquipment;

const $ = id => document.getElementById(id);
const state = {items:[]};

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
}

function equippedBy(itemId) {
  return Roster.getState().heroes.filter(hero =>
    Object.values(hero.equipment || {}).includes(itemId)
  );
}

function qualityClass(item) {
  return "wow-quality--" + item.qualityKey;
}

function qualityFrameClass(item) {
  return "wow-icon-frame--quality-" + item.qualityKey;
}

function itemTooltipModel(item) {
  const holders = equippedBy(item.id);
  const primary = (item.stats || []).filter(line => ["Strength","Agility","Intellect","Stamina"].includes(line.stat));
  const secondary = (item.stats || []).filter(line => !["Strength","Agility","Intellect","Stamina"].includes(line.stat));
  const stats = primary.concat(secondary).map(line => ({label:line.stat,value:"+"+line.value}));
  if (!stats.length) stats.push({label:"Bonus stats",value:"None"});

  return {
    variant:"item",
    title:item.name,
    type:item.slot,
    quality:item.qualityKey,
    icon:{slug:item.icon, quality:item.qualityKey},
    requirements:[
      {label:"Tier",value:"T"+item.tier},
      {label:item.slot === "Weapon" ? "Weapon family" : item.slot === "Trinket" ? "Item family" : "Armor family",value:item.family}
    ],
    description:holders.length
      ? "Owned item currently equipped by " + holders.map(hero=>hero.name).join(", ") + "."
      : "Owned item currently stored in global inventory.",
    stats,
    meta:[
      {label:"Quality",value:item.quality},
      {label:"Ownership",value:"Owned"},
      {label:"Equipped",value:holders.length ? holders.map(hero=>hero.name).join(", ") : "No"}
    ]
  };
}

function populateSlotFilter() {
  const select = $("inventorySlotFilter");
  Equipment.SLOTS.forEach(slot => {
    const option = document.createElement("option");
    option.value = slot;
    option.textContent = slot;
    select.appendChild(option);
  });
}

function filteredItems() {
  const slot = $("inventorySlotFilter").value;
  const tier = $("inventoryTierFilter").value;
  const query = $("inventorySearch").value.trim().toLowerCase();
  const unequippedOnly = $("inventoryUnequippedOnly").checked;

  return state.items.filter(item => {
    if (slot !== "all" && item.slot !== slot) return false;
    if (tier !== "all" && item.tier !== Number(tier)) return false;
    if (unequippedOnly && equippedBy(item.id).length) return false;
    if (query && ![item.name,item.family,item.slot,item.quality].join(" ").toLowerCase().includes(query)) return false;
    return true;
  }).sort((a,b) =>
    b.tier - a.tier ||
    Equipment.SLOTS.indexOf(a.slot) - Equipment.SLOTS.indexOf(b.slot) ||
    a.name.localeCompare(b.name)
  );
}

function renderItem(item) {
  const holders = equippedBy(item.id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inventory-item " + qualityClass(item) + (holders.length ? " is-equipped" : "");
  button.dataset.itemId = item.id;
  button.setAttribute("aria-label", item.name + ", Tier " + item.tier + ", " + item.quality + (holders.length ? ", equipped by " + holders.map(hero=>hero.name).join(", ") : ", unequipped"));
  button.innerHTML =
    '<span class="inventory-item__icon wow-icon-frame wow-icon-frame--md ' + qualityFrameClass(item) + '">' +
      '<img src="' + Icons.iconUrl(item.icon) + '" alt="">' +
      '<span class="inventory-item__tier">T' + item.tier + '</span>' +
    '</span>' +
    '<span class="inventory-item__copy">' +
      '<strong>' + escapeHtml(item.name) + '</strong>' +
      '<small>' + escapeHtml(item.slot) + ' · ' + escapeHtml(item.family) + '</small>' +
    '</span>' +
    '<span class="inventory-item__state">' +
      (holders.length ? '<strong>Equipped</strong><small>' + escapeHtml(holders.map(hero=>hero.name).join(", ")) + '</small>' : '<strong>Stored</strong><small>Unequipped</small>') +
    '</span>';

  button.querySelectorAll("img").forEach(Icons.bindFallback);
  Tooltips.attach(button, () => itemTooltipModel(item), {anchor:"target"});
  return button;
}

function renderInventory() {
  const items = filteredItems();
  const root = $("inventoryGrid");
  root.innerHTML = "";
  items.forEach(item => root.appendChild(renderItem(item)));

  $("inventoryCount").textContent = String(state.items.length);
  $("inventorySummary").textContent = items.length + " / " + state.items.length + " owned items";
  $("inventoryEmpty").hidden = items.length !== 0;
}

function bindControls() {
  ["inventorySlotFilter","inventoryTierFilter","inventorySearch","inventoryUnequippedOnly"].forEach(id => {
    const node = $(id);
    node.addEventListener(node.tagName === "INPUT" && node.type === "search" ? "input" : "change", renderInventory);
  });
}

function initInventory() {
  state.items = Equipment.owned();
  populateSlotFilter();
  Icons.hydrate(document);
  Tooltips.hydrate(document);
  bindControls();
  renderInventory();
  window.addEventListener("warcraft:roster-changed", renderInventory);
}

initInventory();
