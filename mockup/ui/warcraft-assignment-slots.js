(function(global){
"use strict";
const Campaign=global.WarcraftCampaign;
const Roster=global.WarcraftRoster;
if(!Campaign||!Roster)throw new Error("WarcraftCampaign and WarcraftRoster must load before WarcraftAssignmentSlots.");
const BUILDING_IDS=Object.freeze(["artisans","gathering-camp","survival-lodge","classhall"]);
const SLOT_COUNT=3;
const DURATION_PHASES=2;
const completionHandlers=new Map();
const processingBuildings=new Set();
function clone(value){return value==null?value:JSON.parse(JSON.stringify(value));}
function buildingId(value){const id=String(value||"");if(!BUILDING_IDS.includes(id))throw new Error("Unsupported assignment building "+id+".");return id;}
function slotIndex(value){const index=Number(value);if(!Number.isInteger(index)||index<0||index>=SLOT_COUNT)throw new Error("Assignment slot must be 0, 1, or 2.");return index;}
function blankState(id){return{buildingId:id,slots:Array.from({length:SLOT_COUNT},()=>null)};}
function normalizeAssignment(id,index,value){
  if(!value||!value.heroId)return null;
  const status=["assigned","training","blocked"].includes(value.status)?value.status:"assigned";
  return Object.assign({
    buildingId:id,slotIndex:index,heroId:String(value.heroId),status,
    selectedAction:value.selectedAction?String(value.selectedAction):null,
    selectedTrainerId:value.selectedTrainerId||value.trainerId||null,
    selectedProfessionId:value.selectedProfessionId||value.professionId||null,
    startDay:value.startDay==null?null:Math.max(1,Number(value.startDay)||1),
    startPhase:value.startPhase==="night"?"night":value.startPhase==="day"?"day":null,
    startPhaseAdvance:value.startPhaseAdvance==null?null:Math.max(0,Number(value.startPhaseAdvance)||0),
    remainingCampaignPhases:value.remainingCampaignPhases==null?null:Math.max(0,Number(value.remainingCampaignPhases)||0)
  },clone(value),{buildingId:id,slotIndex:index,heroId:String(value.heroId),status});
}
function normalizeState(id,raw){
  const key=buildingId(id),source=raw&&typeof raw==="object"?raw:{},slots=Array.isArray(source.slots)?source.slots:[];
  return{buildingId:key,slots:Array.from({length:SLOT_COUNT},(_,index)=>normalizeAssignment(key,index,slots[index]))};
}
function getBuildingState(id){const key=buildingId(id);return normalizeState(key,Campaign.getBuildingAssignments()[key]||blankState(key));}
function persist(id,state){const key=buildingId(id),next=normalizeState(key,state);Campaign.setBuildingAssignment(key,next);emit("persist",{buildingId:key,state:next});return getBuildingState(key);}
function emit(reason,detail){
  if(typeof global.dispatchEvent!=="function"||typeof global.CustomEvent!=="function")return;
  global.dispatchEvent(new global.CustomEvent("warcraft:assignments-changed",{detail:Object.assign({reason},detail||{})}));
}
function allAssignments(){
  const out=[];
  BUILDING_IDS.forEach(id=>getBuildingState(id).slots.forEach(assignment=>{if(assignment)out.push(assignment);}));
  return out;
}
function assignmentForHero(heroId){const id=String(heroId);return allAssignments().find(assignment=>assignment.heroId===id)||null;}
function assignmentAt(id,index){return getBuildingState(id).slots[slotIndex(index)]||null;}
function assign(id,indexValue,heroId,details={}){
  const key=buildingId(id),index=slotIndex(indexValue),hero=Roster.hero(String(heroId));
  if(!hero)throw new Error("Unknown hero "+heroId+".");
  Campaign.validateHeroIds([hero.id]);
  const existing=assignmentForHero(hero.id);
  if(existing&&(existing.buildingId!==key||existing.slotIndex!==index))throw new Error(hero.name+" is already assigned to "+existing.buildingId+" slot "+(existing.slotIndex+1)+".");
  const state=getBuildingState(key),target=state.slots[index];
  if(target&&target.status==="training")throw new Error("An active assignment cannot be replaced.");
  if(hero.availability!=="available"&&!(target&&target.heroId===hero.id))throw new Error(hero.name+" is not available for assignment.");
  state.slots[index]=normalizeAssignment(key,index,Object.assign({},details,{heroId:hero.id,status:"assigned",startDay:null,startPhase:null,startPhaseAdvance:null,remainingCampaignPhases:null}));
  return persist(key,state).slots[index];
}
function updateSelection(id,indexValue,patch={}){
  const key=buildingId(id),index=slotIndex(indexValue),state=getBuildingState(key),current=state.slots[index];
  if(!current)throw new Error("Assign a hero before selecting an action.");
  if(current.status==="training")throw new Error("An active assignment cannot be edited.");
  state.slots[index]=normalizeAssignment(key,index,Object.assign({},current,clone(patch),{status:"assigned"}));
  return persist(key,state).slots[index];
}
function remove(id,indexValue){
  const key=buildingId(id),index=slotIndex(indexValue),state=getBuildingState(key),current=state.slots[index];
  if(current&&current.status==="training")throw new Error("An active assignment cannot be removed.");
  state.slots[index]=null;persist(key,state);return null;
}
function start(id,indexValue,patch={}){
  const key=buildingId(id),index=slotIndex(indexValue),state=getBuildingState(key),current=state.slots[index];
  if(!current)throw new Error("Assign a hero before starting.");
  if(current.status==="training")throw new Error("Assignment is already in progress.");
  const hero=Roster.hero(current.heroId);if(!hero)throw new Error("Assigned hero is missing.");
  if(hero.availability!=="available")throw new Error(hero.name+" is not available to begin training.");
  const clock=Campaign.getClock();
  state.slots[index]=normalizeAssignment(key,index,Object.assign({},current,clone(patch),{
    status:"training",startDay:clock.day,startPhase:clock.phase,startPhaseAdvance:clock.phaseAdvances,remainingCampaignPhases:DURATION_PHASES,error:null
  }));
  persist(key,state);
  Roster.updateHero(hero.id,{availability:"training"});
  emit("start",{buildingId:key,slotIndex:index,heroId:hero.id});
  return assignmentAt(key,index);
}
function remainingPhases(assignment){
  if(!assignment||assignment.status!=="training")return null;
  const start=Math.max(0,Number(assignment.startPhaseAdvance)||0),elapsed=Math.max(0,Campaign.getClock().phaseAdvances-start);
  return Math.max(0,DURATION_PHASES-elapsed);
}
function registerCompletionHandler(id,handler){
  const key=buildingId(id);
  if(typeof handler!=="function")throw new Error("Completion handler must be a function.");
  completionHandlers.set(key,handler);
  return processBuilding(key);
}
function processBuilding(id){
  const key=buildingId(id),handler=completionHandlers.get(key);
  if(!handler||processingBuildings.has(key))return[];
  processingBuildings.add(key);
  try{
    const state=getBuildingState(key),events=[];let changed=false;
    state.slots.forEach((assignment,index)=>{
      if(!assignment||assignment.status!=="training")return;
      const remaining=remainingPhases(assignment);
      if(assignment.remainingCampaignPhases!==remaining){assignment.remainingCampaignPhases=remaining;changed=true;}
      if(remaining>0)return;
      const hero=Roster.hero(assignment.heroId);
      if(!hero){state.slots[index]=null;changed=true;return;}
      try{
        const result=handler(clone(assignment),hero)||{};
        if(hero.availability==="training")Roster.updateHero(hero.id,{availability:"available"});
        state.slots[index]=null;changed=true;
        events.push(Object.assign({type:"building_assignment_complete",buildingId:key,slotIndex:index,heroId:hero.id,heroName:hero.name},result));
      }catch(error){
        assignment.status="blocked";assignment.error=error.message;assignment.remainingCampaignPhases=0;changed=true;
        if(hero.availability==="training")Roster.updateHero(hero.id,{availability:"available"});
      }
    });
    if(changed)persist(key,state);
    if(events.length)emit("complete",{buildingId:key,events:clone(events)});
    return events;
  }finally{processingBuildings.delete(key);}
}
function processAll(){return BUILDING_IDS.flatMap(processBuilding);}
function heroDragPayload(event,heroId){event.dataTransfer.setData("text/warcraft-hero-id",String(heroId));event.dataTransfer.setData("text/plain",String(heroId));event.dataTransfer.effectAllowed="move";}
function draggedHeroId(event){return event.dataTransfer.getData("text/warcraft-hero-id")||event.dataTransfer.getData("text/plain")||"";}
function mount(root,options={}){
  if(!root)throw new Error("Assignment slot root is required.");
  const id=buildingId(options.buildingId),roster=Array.isArray(options.heroes)?options.heroes:Roster.getState().heroes;
  const state=getBuildingState(id),assignedByHero=new Map(allAssignments().map(entry=>[entry.heroId,entry]));
  root.innerHTML='<div class="assignment-board__roster" aria-label="Draggable active-faction roster"></div><div class="assignment-board__slots" aria-label="'+String(options.label||id)+' assignment slots"></div>';
  const rosterRoot=root.querySelector(".assignment-board__roster"),slotsRoot=root.querySelector(".assignment-board__slots");
  roster.forEach(hero=>{
    const occupied=assignedByHero.get(hero.id),available=hero.availability==="available"&&!occupied;
    const card=document.createElement("div");
    card.className="assignment-hero"+(available?"":" is-unavailable");
    card.draggable=available;
    card.dataset.heroId=hero.id;
    card.setAttribute("aria-disabled",available?"false":"true");
    card.innerHTML=typeof options.heroMarkup==="function"?options.heroMarkup(hero,occupied):'<strong>'+hero.name+'</strong><small>'+hero.classLabel+'</small>';
    if(available)card.addEventListener("dragstart",event=>{card.classList.add("is-dragging");heroDragPayload(event,hero.id);});
    card.addEventListener("dragend",()=>card.classList.remove("is-dragging"));
    rosterRoot.appendChild(card);
  });
  state.slots.forEach((assignment,index)=>{
    const slot=document.createElement("article"),hero=assignment?Roster.hero(assignment.heroId):null,training=Boolean(assignment&&assignment.status==="training");
    slot.className="assignment-slot"+(assignment?" is-filled":" is-empty")+(training?" is-training":"");
    slot.dataset.assignmentSlot=String(index);
    slot.innerHTML='<div class="assignment-slot__label"><span>SLOT '+(index+1)+'</span><small>'+(training?"Training":assignment?"Assigned":"Drop hero")+'</small></div><div class="assignment-slot__body"></div>';
    slot.addEventListener("dragover",event=>{if(training)return;event.preventDefault();event.dataTransfer.dropEffect="move";slot.classList.add("is-dragover");});
    slot.addEventListener("dragleave",()=>slot.classList.remove("is-dragover"));
    slot.addEventListener("drop",event=>{
      if(training)return;
      event.preventDefault();slot.classList.remove("is-dragover");
      const heroId=draggedHeroId(event);if(!heroId)return;
      try{const dropped=Roster.hero(heroId);const details=typeof options.assignmentData==="function"?options.assignmentData(dropped,index):{};assign(id,index,heroId,details);if(typeof options.onChange==="function")options.onChange({type:"assign",buildingId:id,slotIndex:index,heroId});}
      catch(error){if(typeof options.onError==="function")options.onError(error);else throw error;}
    });
    const body=slot.querySelector(".assignment-slot__body");
    if(!assignment||!hero){
      body.innerHTML='<div class="assignment-slot__empty"><strong>Empty assignment slot</strong><small>Drag an available hero here.</small></div>';
    }else{
      const remaining=training?remainingPhases(assignment):null;
      body.innerHTML='<div class="assignment-slot__hero">'+(typeof options.heroMarkup==="function"?options.heroMarkup(hero,assignment):'<strong>'+hero.name+'</strong><small>'+hero.classLabel+'</small>')+'</div><div class="assignment-slot__config"></div><div class="assignment-slot__status"></div><div class="assignment-slot__actions"></div>';
      const config=body.querySelector(".assignment-slot__config"),status=body.querySelector(".assignment-slot__status"),actions=body.querySelector(".assignment-slot__actions");
      const actionOptions=typeof options.actionOptions==="function"?options.actionOptions(hero,assignment):[];
      if(!training&&actionOptions.length){
        const select=document.createElement("select");select.className="wow-select assignment-slot__select";
        actionOptions.forEach(option=>{const node=document.createElement("option");node.value=option.value;node.textContent=option.label;if(String(option.value)===String(assignment.selectedProfessionId||assignment.selectedAction||""))node.selected=true;select.appendChild(node);});
        select.addEventListener("change",()=>{try{const patch=typeof options.selectionPatch==="function"?options.selectionPatch(select.value,hero,assignment):{selectedAction:select.value};updateSelection(id,index,patch);if(typeof options.onChange==="function")options.onChange({type:"selection",buildingId:id,slotIndex:index,heroId:hero.id});}catch(error){if(typeof options.onError==="function")options.onError(error);}});
        config.appendChild(select);
      }
      const descriptor=typeof options.describe==="function"?options.describe(hero,assignment):null;
      status.innerHTML='<strong>'+(training?"TRAINING":descriptor&&descriptor.label||"READY")+'</strong><small>'+(training?(remaining+" campaign phase"+(remaining===1?"":"s")+" remaining"):descriptor&&descriptor.detail||"Ready to begin")+'</small>';
      if(training){actions.innerHTML='<span class="assignment-slot__duration">1 day assignment in progress</span>';}
      else{
        const startButton=document.createElement("button"),removeButton=document.createElement("button");
        startButton.type="button";startButton.className="wow-button wow-button--primary";startButton.textContent=options.startLabel||"Begin Assignment";
        const canStart=typeof options.canStart==="function"?options.canStart(hero,assignment):{enabled:true};startButton.disabled=canStart===false||Boolean(canStart&&canStart.enabled===false);
        startButton.addEventListener("click",()=>{try{if(typeof options.start==="function")options.start(index,assignment);else start(id,index);if(typeof options.onChange==="function")options.onChange({type:"start",buildingId:id,slotIndex:index,heroId:hero.id});}catch(error){if(typeof options.onError==="function")options.onError(error);}});
        removeButton.type="button";removeButton.className="wow-button";removeButton.textContent="Remove";removeButton.addEventListener("click",()=>{try{remove(id,index);if(typeof options.onChange==="function")options.onChange({type:"remove",buildingId:id,slotIndex:index,heroId:hero.id});}catch(error){if(typeof options.onError==="function")options.onError(error);}});
        actions.append(startButton,removeButton);
        if(typeof options.href==="function"){const href=options.href(hero,assignment);if(href){const link=document.createElement("a");link.className="wow-button assignment-slot__link";link.href=href;link.textContent=options.hrefLabel||"Open";actions.prepend(link);}}
      }
    }
    slotsRoot.appendChild(slot);
  });
  return root;
}
if(typeof global.addEventListener==="function")global.addEventListener("warcraft:campaign-changed",event=>{if(event&&event.detail&&event.detail.reason==="clock")processAll();});
global.WarcraftAssignmentSlots=Object.freeze({BUILDING_IDS,SLOT_COUNT,DURATION_PHASES,getBuildingState,allAssignments,assignmentForHero,assignmentAt,assign,updateSelection,remove,start,remainingPhases,registerCompletionHandler,processBuilding,processAll,mount});
})(window);
