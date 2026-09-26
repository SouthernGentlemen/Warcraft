const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;
const Campaign = window.WarcraftCampaign;
const Progression = window.WarcraftContentProgression;
const ContentAssignments = window.WarcraftContentAssignments;

const STATUS_GROUPS = Object.freeze([
  Object.freeze({status:"available", listId:"availableQuestList", countId:"availableQuestCount"}),
  Object.freeze({status:"active", listId:"activeQuestList", countId:"activeQuestCount"}),
  Object.freeze({status:"completed", listId:"completedQuestList", countId:"completedQuestCount"})
]);

const $ = id => document.getElementById(id);
const fmt = value => Number(value || 0).toLocaleString("en-US");

function questTitle(quest) {
  return quest.title || ("Quest Board Assignment · Difficulty " + (quest.difficulty || 1));
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
      {label:"Round", value:String(quest.round || "Legacy")},
      {label:"Reward", value:rewardText(quest)}
    ].concat(heroes.length ? [{label:"Heroes", value:heroes.join(", ")}] : []),
    meta:quest.status === "completed"
      ? [{label:"Completions", value:String(quest.completedCount || 1)}]
      : [{label:"Difficulty", value:String(quest.difficulty || 1)}]
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
  matching.sort((a,b) => (b.round || 0) - (a.round || 0) || (a.difficulty || 1) - (b.difficulty || 1)).forEach(quest => root.appendChild(questRow(quest)));
}

function renderJournal() {
  const snapshot = Roster.getState();
  const quests = Array.isArray(snapshot.quests) ? snapshot.quests.slice() : [];
  const faction = typeof Roster.getFaction === "function" ? Roster.getFaction() : snapshot.faction || "alliance";

  $("questJournalFaction").textContent = faction === "horde" ? "Horde" : "Alliance";
  $("questJournalFaction").className = "quest-journal__faction is-" + faction;

  STATUS_GROUPS.forEach(group => renderGroup(group, quests));
}

async function renderAutomation() {
  const root=$("questAutomation"),board=$("questAutomationBoard");
  if(Campaign.getBaseLevel()<2){root.hidden=true;board.innerHTML="";return;}
  root.hidden=false;
  if(!Progression.getCatalog()){const data=await fetch("../data/content/progression.json").then(r=>r.json());Progression.configure(data);ContentAssignments.configure(data);}
  const offers=Roster.getState().quests.filter(q=>q.status==="available");const state=ContentAssignments.state("quest");board.innerHTML="";
  state.slots.forEach((assignment,index)=>{const slot=document.createElement("article");slot.className="assignment-slot "+(assignment?"is-filled":"is-empty");slot.dataset.assignmentSlot=String(index);const hero=assignment&&Roster.hero(assignment.heroId);slot.innerHTML="<div class=\"assignment-slot__label\"><span>AUTO QUEST "+(index+1)+"</span><small>"+(assignment?"Assigned":"Drop hero")+"</small></div><div class=\"assignment-slot__body\">"+(hero?"<strong>"+hero.name+"</strong><small>"+assignment.contentId+"</small>":"<div class=\"assignment-slot__empty\"><strong>Empty assignment slot</strong><small>Drag an available hero here.</small></div>")+"</div>";slot.addEventListener("dragover",e=>{e.preventDefault()});slot.addEventListener("drop",e=>{e.preventDefault();const heroId=e.dataTransfer.getData("text/warcraft-hero-id")||e.dataTransfer.getData("text/plain"),quest=offers[index%Math.max(1,offers.length)];if(heroId&&quest){ContentAssignments.assign("quest",index,heroId,quest.id);renderAutomation();renderJournal();}});board.appendChild(slot);});
  const roster=document.createElement("div");roster.className="assignment-board__roster";Roster.getState().heroes.forEach(hero=>{const card=document.createElement("div"),available=hero.availability==="available"&&!ContentAssignments.assignmentForHero(hero.id);card.className="assignment-hero"+(available?"":" is-unavailable");card.draggable=available;card.innerHTML="<strong>"+hero.name+"</strong><small>"+hero.classLabel+"</small>";if(available)card.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/warcraft-hero-id",hero.id)});roster.appendChild(card);});board.prepend(roster);
}

async function initQuestJournal() {
  Icons.hydrate(document);
  Tooltips.hydrate(document);
  renderJournal();
  await renderAutomation();
  window.addEventListener("warcraft:roster-changed", ()=>{renderJournal();renderAutomation();});
  window.addEventListener("warcraft:campaign-changed", ()=>renderAutomation());
}

initQuestJournal();
