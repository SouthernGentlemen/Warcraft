const Icons = window.WowUIIcons;
const Tooltips = window.WowUITooltips;
const Roster = window.WarcraftRoster;

const state = {
  runtime:null,
  resolved:null,
  encounter:null,
  playerSide:"alliance",
  enemySide:"horde",
  paused:false,
  speed:1,
  timer:null,
  log:[],
  completion:null
};

const $ = id => document.getElementById(id);

function sideOpposite(side){return side==="alliance"?"horde":"alliance";}
function slug(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g,"-");}
function actorName(index){return state.resolved&&state.resolved.actors[index]?state.resolved.actors[index].name:"—";}
function actorSide(definition){return definition.team===0?state.playerSide:state.enemySide;}
function formatNumber(value){return Number(value||0).toLocaleString("en-US");}

function fallbackEncounter() {
  const faction=Roster.getFaction();
  const available=Roster.getState().heroes.filter(hero=>
    String(hero.faction||"").toLowerCase()===faction && hero.availability==="available"
  );
  if(!available.length)throw new Error("No available heroes can enter Battle.");
  const partySize=available.length>=3?3:1;
  const horde=faction==="horde";
  return {
    kind:"dungeon",
    dungeonId:horde?"ragefire-chasm":"the-stockade",
    dungeonName:horde?"Ragefire Chasm":"The Stockade",
    npcPoolId:horde?"dungeon-ragefire-chasm":"dungeon-the-stockade",
    partySize,
    heroIds:available.slice(0,partySize).map(hero=>hero.id),
    faction,
    seed:0x470047,
    source:"battle-direct"
  };
}

function selectedEncounter() {
  const params=new URLSearchParams(location.search);
  const pending=Roster&&typeof Roster.getPendingEncounter==="function"?Roster.getPendingEncounter():null;
  const requested=params.get("encounter");
  if(pending&&requested===pending.kind){
    if(requested==="dungeon"&&params.get("dungeon")&&params.get("dungeon")!==pending.dungeonId)return fallbackEncounter();
    if(requested==="quest"&&params.get("quest")&&params.get("quest")!==pending.questAssignmentId)return fallbackEncounter();
    return pending;
  }
  return fallbackEncounter();
}

function actorTooltipModel(actor) {
  const def=actor.definition;
  const live=actor.state;
  const hero=def.kind==="hero";
  return {
    variant:"unit",
    title:def.name,
    type:hero ? ((def.race||"Hero")+" "+def.className) : ((def.family||"NPC")+" "+(def.npcType||"enemy")),
    classId:hero?def.classId:"",
    icon:hero?{category:"class",key:def.classId}:{category:"battle",key:"combat"},
    description:hero
      ? "Roster hero · "+def.specName+"."
      : "Authored dungeon NPC · "+(def.poolIds&&def.poolIds[0]||state.encounter.npcPoolId)+".",
    stats:[
      {label:"Health",value:formatNumber(live.hp)+" / "+formatNumber(def.derived.maxHealth)},
      {label:"Level",value:String(def.level)},
      {label:"Auto",value:def.auto.name}
    ].concat(def.maxResource?[{label:def.resourceType,value:formatNumber(live.resource)+" / "+formatNumber(def.maxResource)}]:[]),
    meta:[
      {label:"Source",value:hero?"WarcraftRoster":"NPC Catalog"},
      {label:"Team",value:hero?"Player":"Enemy"}
    ],
    locked:live.alive?[]:["Defeated"]
  };
}

function portraitMarkup(def) {
  if(def.kind==="hero"){
    return '<img src="'+Icons.resolve("race",def.race||"Human")+'" alt="" loading="lazy">'+
      '<span class="unit-class-icon wow-icon-frame wow-icon-frame--xs wow-icon-frame--class-'+def.classId+'">'+
        '<img src="'+Icons.resolve("class",def.classId)+'" alt="" loading="lazy">'+
      '</span>';
  }
  return '<img src="'+Icons.resolve("battle","combat")+'" alt="" loading="lazy">'+
    '<span class="unit-class-icon wow-icon-frame wow-icon-frame--xs">'+
      '<img src="'+Icons.resolve("battle","combat")+'" alt="" loading="lazy">'+
    '</span>';
}

function actorCard(actor) {
  const def=actor.definition;
  const live=actor.state;
  const side=actorSide(def);
  const classId=def.kind==="hero"?def.classId:"npc";
  const article=document.createElement("article");
  article.className="combatant unit-frame "+side+"-combatant "+(def.kind==="hero"?"wow-class--"+def.classId:"npc-combatant");
  article.dataset.actorIndex=String(actor.index);
  article.dataset.actorKind=def.kind;
  article.innerHTML=
    '<div class="unit-portrait wow-icon-frame">'+portraitMarkup(def)+'<span class="unit-level">'+def.level+'</span></div>'+
    '<div class="unit-frame-body">'+
      '<div class="unit-heading">'+
        '<div class="unit-identity"><strong class="combatant-name">'+def.name+'</strong>'+
          '<span class="combatant-meta">'+(def.kind==="hero"?(def.className+" · "+def.specName):(def.family+" · "+def.npcType).toUpperCase())+'</span></div>'+
        '<div class="unit-action" data-action-kind="ready">'+
          '<span class="unit-action-icon wow-icon-frame wow-icon-frame--sm '+(def.kind==="hero"?"wow-icon-frame--class-"+classId:"")+'">'+
            '<img src="'+(def.kind==="hero"?Icons.resolve("class",def.classId):Icons.resolve("battle","combat"))+'" alt="" loading="lazy">'+
          '</span>'+
          '<span class="unit-action-copy"><small>ACTION</small><strong>'+def.auto.name+'</strong></span>'+
        '</div>'+
      '</div>'+
      '<div class="unit-bar hp-stat"><span class="unit-bar-label">Health</span><span class="mini-fill"></span><b></b></div>'+
      (def.maxResource?'<div class="unit-bar resource-stat" tabindex="0"><span class="unit-bar-label">'+def.resourceType+'</span><span class="mini-fill"></span><b></b></div>':'')+
      '<div class="unit-status-row" aria-label="Combat status"><div class="unit-status-hooks buff-hooks"><span class="unit-status-slot" data-status-slot="buff-1"></span></div><div class="unit-status-hooks debuff-hooks"><span class="unit-status-slot" data-status-slot="debuff-1"></span></div></div>'+
    '</div>';
  article.querySelectorAll("img").forEach(Icons.bindFallback);
  Tooltips.attach(article,()=>actorTooltipModel(state.runtime.snapshot().actors[actor.index]),{anchor:"target"});
  return article;
}

function renderTeams(snapshot) {
  const roots={alliance:$("allianceTeam"),horde:$("hordeTeam")};
  roots.alliance.innerHTML="";
  roots.horde.innerHTML="";
  snapshot.actors.forEach(actor=>roots[actorSide(actor.definition)].appendChild(actorCard(actor)));
  updateSnapshot(snapshot);
}

function updateActor(actor) {
  const card=document.querySelector('[data-actor-index="'+actor.index+'"]');
  if(!card)return;
  const def=actor.definition,live=actor.state;
  card.classList.toggle("defeated",!live.alive);
  const hpFill=card.querySelector(".hp-stat .mini-fill");
  const hpText=card.querySelector(".hp-stat b");
  const hpPct=def.derived.maxHealth?Math.max(0,Math.min(100,live.hp/def.derived.maxHealth*100)):0;
  if(hpFill)hpFill.style.width=hpPct+"%";
  if(hpText)hpText.textContent=formatNumber(live.hp)+" / "+formatNumber(def.derived.maxHealth);
  const resourceFill=card.querySelector(".resource-stat .mini-fill");
  const resourceText=card.querySelector(".resource-stat b");
  if(resourceFill&&def.maxResource)resourceFill.style.width=Math.max(0,Math.min(100,live.resource/def.maxResource*100))+"%";
  if(resourceText)resourceText.textContent=formatNumber(live.resource)+" / "+formatNumber(def.maxResource);
}

function teamTotals(snapshot,team) {
  return snapshot.actors.filter(actor=>actor.definition.team===team).reduce((sum,actor)=>{
    sum.current+=actor.state.hp;
    sum.max+=actor.definition.derived.maxHealth;
    sum.total+=1;
    if(actor.state.alive)sum.alive+=1;
    return sum;
  },{current:0,max:0,alive:0,total:0});
}

function updateSideSummary(side,totals) {
  const text=$(side+"HpText"),fill=$(side+"HpFill"),alive=$(side+"AliveText");
  if(text)text.textContent=formatNumber(totals.current)+" / "+formatNumber(totals.max);
  if(alive)alive.textContent=totals.alive+" / "+totals.total+" alive";
  if(fill)fill.style.width=(totals.max?Math.max(0,Math.min(100,totals.current/totals.max*100)):0)+"%";
}

function updateSnapshot(snapshot) {
  snapshot.actors.forEach(updateActor);
  updateSideSummary(state.playerSide,teamTotals(snapshot,0));
  updateSideSummary(state.enemySide,teamTotals(snapshot,1));
}

function applyEncounterLabels() {
  const encounter=state.encounter;
  state.playerSide=encounter.faction==="horde"?"horde":"alliance";
  state.enemySide=sideOpposite(state.playerSide);
  const playerLabel=$(state.playerSide+"TeamLabel");
  const playerName=$(state.playerSide+"TeamName");
  const enemyLabel=$(state.enemySide+"TeamLabel");
  const enemyName=$(state.enemySide+"TeamName");
  if(playerLabel)playerLabel.textContent=state.playerSide.toUpperCase();
  if(playerName)playerName.textContent="Quest Board Party";
  if(enemyLabel)enemyLabel.textContent="NPC ENEMIES";
  if(enemyName)enemyName.textContent=encounter.dungeonName||"NPC Encounter";
  $(state.playerSide+"Team").setAttribute("aria-label",encounter.partySize+" player hero"+(encounter.partySize===1?"":"es"));
  $(state.enemySide+"Team").setAttribute("aria-label",(encounter.dungeonName||"Encounter")+" NPC enemies");
  $("battleEncounterType").textContent=encounter.kind==="quest"?"QUEST":"DUNGEON";
  $("battleEncounterName").textContent=encounter.encounterName||encounter.dungeonName||encounter.dungeonId||"Encounter";
  $("battleEncounterParty").textContent=encounter.partySize+" hero"+(encounter.partySize===1?"":"es")+" · seed "+encounter.seed;
  const frame=document.querySelector(".battle-frame");
  const field=document.querySelector(".battlefield");
  if(frame)frame.dataset.partySize=String(encounter.partySize);
  if(field)field.dataset.partySize=String(encounter.partySize);
}

function eventDetail(event) {
  if(event.type==="action_start")return event.action+" · "+event.source;
  if(event.type==="damage")return event.action+(event.critical?" · CRIT":"")+(event.absorbed?" · absorbed "+event.absorbed:"");
  if(event.type==="heal")return event.action+(event.critical?" · CRIT":"");
  if(event.type==="shield")return event.action+" · shield";
  if(event.type==="death")return "Defeated by "+actorName(event.sourceActor)+" · "+event.action;
  if(event.type==="round_end")return "Winner: "+(event.winnerTeam===0?"Heroes":"NPCs");
  if(event.type==="resource_spend"||event.type==="resource_gain"||event.type==="resource_regen")return event.resource+" → "+event.value;
  if(event.type==="cooldown_start")return event.action+" · "+event.ticks+" ticks";
  if(event.type==="cooldown_ready")return event.action;
  if(event.type==="ultimate_gain"||event.type==="ultimate_spend")return event.action||event.reason||"Ultimate";
  if(event.type==="critical")return event.action+" · critical";
  return event.action||event.reason||"";
}

function eventAmount(event) {
  if(event.type==="damage")return "−"+event.amount;
  if(event.type==="heal"||event.type==="shield")return "+"+event.amount;
  if(event.amount!=null&&["resource_spend","resource_gain","resource_regen","ultimate_gain","ultimate_spend"].includes(event.type))return String(event.amount);
  return "";
}

function appendLogEvent(event) {
  const entry={
    frame:event.frame,
    actor:actorName(event.actor),
    type:event.type,
    detail:eventDetail(event),
    target:actorName(event.target),
    amount:eventAmount(event)
  };
  state.log.push(entry);
  const row=document.createElement("tr");
  [entry.frame,entry.actor,entry.type,entry.detail,entry.target,entry.amount].forEach((value,index)=>{
    const cell=document.createElement("td");
    cell.textContent=value==null?"":String(value);
    if(index===2)cell.className="event-"+entry.type;
    row.appendChild(cell);
  });
  const body=$("combatLogBody");
  if(body)body.prepend(row);
  $("combatLogMeta").textContent=state.log.length+" events";
}

function showActionEvent(event) {
  if(event.actor==null)return;
  const card=document.querySelector('[data-actor-index="'+event.actor+'"]');
  if(!card)return;
  const action=card.querySelector(".unit-action");
  const label=action&&action.querySelector("strong");
  if(action){
    action.dataset.actionKind=event.source||event.type;
    action.classList.add("is-active");
  }
  if(label&&event.action)label.textContent=event.action;
}

function processEvents(events) {
  events.forEach(event=>{
    appendLogEvent(event);
    if(event.type==="action_start")showActionEvent(event);
    if(event.type==="death"){
      const card=document.querySelector('[data-actor-index="'+event.actor+'"]');
      if(card)card.classList.add("defeated");
    }
  });
  const notable=[...events].reverse().find(event=>["damage","heal","death","round_end","miss","critical"].includes(event.type));
  if(notable){
    if(notable.type==="damage")$("battleEvent").textContent=actorName(notable.actor)+" hits "+actorName(notable.target)+" for "+notable.amount+".";
    else if(notable.type==="heal")$("battleEvent").textContent=actorName(notable.actor)+" heals "+actorName(notable.target)+" for "+notable.amount+".";
    else if(notable.type==="death")$("battleEvent").textContent=actorName(notable.actor)+" is defeated.";
    else if(notable.type==="round_end")$("battleEvent").textContent=(notable.winnerTeam===0?"Heroes":"NPC enemies")+" win the encounter.";
    else $("battleEvent").textContent=actorName(notable.actor)+" · "+notable.type+".";
  }
}

function completionHook(result) {
  state.completion=result;
  clearTimeout(state.timer);
  const heroesWin=result.winnerTeam===0;
  const resolved=Roster&&typeof Roster.resolvePendingEncounterResult==="function"
    ? Roster.resolvePendingEncounterResult(result)
    : null;
  const banner=$("resultBanner");
  const questResult=state.encounter&&state.encounter.kind==="quest";
  const reward=questResult&&state.encounter&&state.encounter.reward||null;
  const rewardCopy=heroesWin&&reward
    ? " · Reward: "+formatNumber(reward.gold)+" gold · "+formatNumber(reward.meta_amount)+" quest mark"+(Number(reward.meta_amount)===1?"":"s")
    : "";
  const detail=questResult
    ? (heroesWin?"Quest completed · heroes returned to available status"+rewardCopy:"Quest failed · heroes released and offer can be retried")
    : "Encounter result saved · reset to replay the same seed";
  const returnMode=questResult?"offers":"dungeons";
  banner.innerHTML='<span>'+(heroesWin?"VICTORY":"DEFEAT")+'</span><strong>'+(heroesWin?"Heroes":"NPC Enemies")+'</strong><small>'+detail+'</small>'+
    '<div class="result-banner__actions"><a class="wow-button wow-button--primary" href="./base.html?building=questboard&mode='+returnMode+'">Return to Quest Board</a><a class="wow-button" href="./base.html">Return to Base</a></div>';
  banner.hidden=false;
  $("battleStatus").textContent="Encounter complete";
  if(resolved&&resolved.result)$("battleEvent").textContent=(heroesWin?"Victory":"Defeat")+" recorded for "+(state.encounter.encounterName||state.encounter.dungeonName||"encounter")+".";
  document.querySelector(".status-dot")?.classList.add("stopped");
}

function ticksPerPulse(){return Math.max(1,state.speed*6);}
function scheduleNext(){
  clearTimeout(state.timer);
  if(state.paused||!state.runtime||state.runtime.completed)return;
  state.timer=setTimeout(runPulse,100);
}

function runPulse(){
  if(state.paused||!state.runtime||state.runtime.completed)return;
  const report=state.runtime.step(ticksPerPulse());
  processEvents(report.events);
  updateSnapshot(report.snapshot);
  if(!report.completed)scheduleNext();
}

function setPaused(paused){
  state.paused=Boolean(paused);
  state.runtime&&state.runtime.setPaused(state.paused);
  $("pauseBattle").textContent=state.paused?"▶":"Ⅱ";
  $("pauseBattle").classList.toggle("is-selected",state.paused);
  $("pauseBattle").setAttribute("aria-pressed",state.paused?"true":"false");
  $("pauseBattle").setAttribute("aria-label",state.paused?"Resume battle":"Pause battle");
  $("battleStatus").textContent=state.paused?"Battle paused":"Auto battle running";
  document.querySelector(".status-dot")?.classList.toggle("stopped",state.paused);
  if(state.paused)clearTimeout(state.timer);else scheduleNext();
}

function setSpeed(speed){
  state.speed=Number(speed)||1;
  document.querySelectorAll("#speedButtons button").forEach(button=>{
    const active=Number(button.dataset.speed)===state.speed;
    button.classList.toggle("is-selected",active);
    button.setAttribute("aria-pressed",active?"true":"false");
  });
  $("fastForward").classList.toggle("is-selected",state.speed>1);
}

function nextSpeed(){
  const speeds=[1,2,4];
  const index=speeds.indexOf(state.speed);
  setSpeed(speeds[(index+1)%speeds.length]);
}

function resetBattle(){
  clearTimeout(state.timer);
  state.runtime.reset();
  state.paused=false;
  state.speed=1;
  state.log=[];
  state.completion=null;
  $("combatLogBody").innerHTML="";
  $("combatLogMeta").textContent="0 events";
  $("resultBanner").hidden=true;
  $("resultBanner").innerHTML="";
  $("battleStatus").textContent="Auto battle running";
  $("battleEvent").textContent="Deterministic encounter started.";
  document.querySelector(".status-dot")?.classList.remove("stopped");
  setSpeed(1);
  renderTeams(state.runtime.snapshot());
  scheduleNext();
}

async function init(){
  Icons.hydrate(document);
  Tooltips.hydrate(document);
  $("battleStatus").textContent="Loading encounter…";
  try{
    const module=await import("./battle/encounter-runtime.js");
    state.encounter=selectedEncounter();
    state.resolved=await module.resolveEncounter({encounter:state.encounter,roster:Roster});
    state.encounter=state.resolved.config;
    state.runtime=new module.BattleEncounterRuntime({
      actors:state.resolved.actors,
      config:state.resolved.config,
      onComplete:completionHook
    });
    applyEncounterLabels();
    renderTeams(state.runtime.snapshot());
    $("battleStatus").textContent="Auto battle running";
    $("battleEvent").textContent="Heroes engage "+state.resolved.enemies.map(enemy=>enemy.name).join(", ")+".";
  }catch(error){
    $("battleStatus").textContent="Encounter unavailable";
    $("battleEvent").textContent=error.message;
    console.error(error);
    return;
  }

  $("pauseBattle").addEventListener("click",()=>setPaused(!state.paused));
  $("fastForward").addEventListener("click",nextSpeed);
  $("resetBattle").addEventListener("click",resetBattle);
  document.querySelectorAll("#speedButtons button").forEach(button=>button.addEventListener("click",()=>setSpeed(Number(button.dataset.speed))));
  scheduleNext();
}

init();
