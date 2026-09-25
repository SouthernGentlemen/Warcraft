const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;

const STATUS_GROUPS = Object.freeze([
  Object.freeze({status:"available", listId:"availableQuestList", countId:"availableQuestCount"}),
  Object.freeze({status:"active", listId:"activeQuestList", countId:"activeQuestCount"}),
  Object.freeze({status:"completed", listId:"completedQuestList", countId:"completedQuestCount"})
]);

const $ = id => document.getElementById(id);
const fmt = value => Number(value || 0).toLocaleString("en-US");

function questTitle(quest) {
  return "Quest Board Assignment · Tier " + quest.tier;
}

function rewardText(quest) {
  return fmt(quest.reward?.gold) + " gold · " + fmt(quest.reward?.amount) + " quest mark" + (Number(quest.reward?.amount) === 1 ? "" : "s");
}

function assignedHeroNames(quest) {
  return (quest.heroIds || []).map(id => Roster.hero(id)).filter(Boolean).map(hero => hero.name);
}

function statusLabel(quest) {
  if (quest.status === "active") return "Active";
  if (quest.status === "completed") return "Completed";
  return "Available";
}

function questTooltipModel(quest) {
  const heroes = assignedHeroNames(quest);
  return {
    variant:"control",
    title:questTitle(quest),
    type:statusLabel(quest) + " quest",
    icon:{category:"quest", key:quest.status === "active" ? "active" : quest.status === "completed" ? "completed" : "available"},
    description:quest.status === "active"
      ? "This assignment is currently dispatched from the Quest Board."
      : quest.status === "completed"
        ? "This assignment has been completed and remains in your quest history."
        : "This assignment is currently available from the Quest Board.",
    stats:[
      {label:"Party size", value:String(quest.requiredHeroes)},
      {label:"Reward", value:rewardText(quest)}
    ].concat(heroes.length ? [{label:"Heroes", value:heroes.join(", ")}] : []),
    meta:quest.status === "completed"
      ? [{label:"Completions", value:String(quest.completedCount || 1)}]
      : [{label:"Tier", value:String(quest.tier)}]
  };
}

function emptyState(status) {
  const copy = status === "available"
    ? "No quests are currently available."
    : status === "active"
      ? "No heroes are currently dispatched on quests."
      : "No quests have been completed yet.";
  return '<div class="quest-journal__empty"><span class="wow-kicker">EMPTY</span><p>' + copy + '</p></div>';
}

function questRow(quest) {
  const article = document.createElement("article");
  const heroes = assignedHeroNames(quest);
  const status = quest.status === "active" ? "active" : quest.status === "completed" ? "completed" : "available";
  article.className = "quest-journal__row is-" + status;
  article.tabIndex = 0;
  article.dataset.questId = quest.id;
  article.setAttribute("aria-label", questTitle(quest) + ", " + statusLabel(quest));

  const statusCopy = status === "active"
    ? (heroes.length ? heroes.join(", ") : quest.requiredHeroes + " heroes dispatched")
    : status === "completed"
      ? "Completed " + (quest.completedCount || 1) + " time" + ((quest.completedCount || 1) === 1 ? "" : "s")
      : quest.requiredHeroes + " hero" + (quest.requiredHeroes === 1 ? "" : "es") + " required";

  article.innerHTML =
    '<span class="quest-journal__row-icon wow-icon-frame wow-icon-frame--sm"><img src="' +
      Icons.resolve("quest", status) + '" alt=""></span>' +
    '<span class="quest-journal__row-copy">' +
      '<strong>' + questTitle(quest) + '</strong>' +
      '<small>' + statusCopy + '</small>' +
    '</span>' +
    '<span class="quest-journal__reward">' +
      '<span class="wow-icon-frame wow-icon-frame--xs"><img src="' + Icons.resolve("currency", "gold") + '" alt=""></span>' +
      '<span><strong>' + fmt(quest.reward?.gold) + '</strong><small>Gold</small></span>' +
    '</span>' +
    '<span class="quest-journal__marks">' +
      '<span class="wow-icon-frame wow-icon-frame--xs"><img src="' + Icons.resolve("quest", "marks") + '" alt=""></span>' +
      '<span><strong>' + fmt(quest.reward?.amount) + '</strong><small>Marks</small></span>' +
    '</span>';

  article.querySelectorAll("img").forEach(Icons.bindFallback);
  Tooltips.attach(article, () => questTooltipModel(quest), {anchor:"target"});
  return article;
}

function renderGroup(group, quests) {
  const root = $(group.listId);
  const matching = quests.filter(quest => quest.status === group.status);
  $(group.countId).textContent = String(matching.length);
  root.innerHTML = "";
  if (!matching.length) {
    root.innerHTML = emptyState(group.status);
    return;
  }
  matching.sort((a,b) => a.tier - b.tier).forEach(quest => root.appendChild(questRow(quest)));
}

function renderJournal() {
  const snapshot = Roster.getState();
  const quests = Array.isArray(snapshot.quests) ? snapshot.quests.slice() : [];
  const faction = typeof Roster.getFaction === "function" ? Roster.getFaction() : snapshot.faction || "alliance";

  $("questJournalFaction").textContent = faction === "horde" ? "Horde" : "Alliance";
  $("questJournalFaction").className = "quest-journal__faction is-" + faction;

  STATUS_GROUPS.forEach(group => renderGroup(group, quests));
}

function initQuestJournal() {
  Icons.hydrate(document);
  Tooltips.hydrate(document);
  renderJournal();
  window.addEventListener("warcraft:roster-changed", renderJournal);
}

initQuestJournal();
