const DATA_ROOT = "../data/heroes/classes/";
const state = {
  index: null,
  classMeta: null,
  specs: new Map(),
  activeSpec: null,
  primarySpec: null,
  level: 5,
  picks: {}
};

const $ = id => document.getElementById(id);
const escapeHtml = (s="") => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

async function loadJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Could not load " + path);
  return res.json();
}
function showError(message) {
  $("error").textContent = message;
  $("error").classList.add("show");
}
function blankPicks() {
  const out = {};
  state.classMeta.specs.forEach(s => out[s.id] = {tier_1:null,tier_2:null,capstones:null});
  return out;
}
function pointCount() {
  return Object.values(state.picks).reduce((sum,p)=>sum + ["tier_1","tier_2","capstones"].filter(k=>p[k]).length,0);
}
function primaryComplete() {
  return !!(state.primarySpec && state.picks[state.primarySpec]?.capstones);
}
function specLocked(specId) {
  return !!(state.primarySpec && !primaryComplete() && specId !== state.primarySpec);
}
function canUseTier(specId,tier) {
  const p=state.picks[specId];
  if (specLocked(specId)) return false;
  if (pointCount() >= state.level && !p[tier]) return false;
  if (tier==="tier_1") {
    if (!state.primarySpec) return true;
    return primaryComplete() || specId===state.primarySpec;
  }
  if (tier==="tier_2") return state.level>=2 && !!p.tier_1;
  if (tier==="capstones") return state.level>=3 && !!p.tier_2;
  return false;
}
function choose(specId,tier,name) {
  if (!canUseTier(specId,tier)) return;
  const p=state.picks[specId];

  if (tier==="tier_1" && !state.primarySpec) state.primarySpec=specId;

  // A tier is a choice row: selecting another option replaces the current option.
  p[tier]=name;
  render();
}
function identityCell(label,value) {
  return '<div class="identity-cell"><span>'+escapeHtml(label)+'</span>'+escapeHtml(value||"—")+'</div>';
}
function renderIdentity(spec) {
  $("identity").innerHTML =
    identityCell("Role",spec.identity.role)+
    identityCell("Resource",spec.identity.resource)+
    identityCell("Primary Stat",spec.identity.primary_stat)+
    identityCell("Auto Attack",spec.identity.auto_attack);
}
function renderTabs() {
  $("specTabs").innerHTML="";
  state.classMeta.specs.forEach(meta=>{
    const spec=state.specs.get(meta.id);
    const locked=specLocked(meta.id);
    const b=document.createElement("button");
    b.className="spec-tab"+(meta.id===state.activeSpec?" active":"")+(locked?" locked":"");
    b.disabled=locked;
    const primary=meta.id===state.primarySpec ? " · PRIMARY" : "";
    b.innerHTML="<strong>"+escapeHtml(meta.label)+primary+"</strong><small>"+escapeHtml(spec?.identity?.role||"")+"</small>";
    b.addEventListener("click",()=>{state.activeSpec=meta.id;render();});
    $("specTabs").appendChild(b);
  });
}
function tierPanel(title,key,items,levelLabel) {
  const panel=document.createElement("div");
  const enabled=canUseTier(state.activeSpec,key);
  panel.className="panel tier"+(enabled||state.picks[state.activeSpec][key]?"":" locked-tier");
  panel.innerHTML='<div class="tier-header"><h3>'+escapeHtml(title)+'</h3><span>'+escapeHtml(levelLabel)+'</span></div>';
  items.forEach(item=>{
    const selected=state.picks[state.activeSpec][key]===item.name;
    const can=canUseTier(state.activeSpec,key) || selected;
    const btn=document.createElement("button");
    btn.className="talent"+(selected?" selected":"")+(can?"":" disabled");
    btn.disabled=!can;
    btn.innerHTML="<strong>"+escapeHtml(item.name)+"</strong><small>"+escapeHtml(item.effect)+"</small>";
    btn.addEventListener("click",()=>choose(state.activeSpec,key,item.name));
    panel.appendChild(btn);
  });
  return panel;
}
function renderTree() {
  const spec=state.specs.get(state.activeSpec);
  renderIdentity(spec);
  $("talentTree").innerHTML="";
  $("talentTree").appendChild(tierPanel("Tier 1","tier_1",spec.talents.tier_1,"LEVEL 1"));
  $("talentTree").appendChild(tierPanel("Tier 2","tier_2",spec.talents.tier_2,"LEVEL 2"));
  $("talentTree").appendChild(tierPanel("Capstone","capstones",spec.talents.capstones,"LEVEL 3"));
}
function renderStatus() {
  const used=pointCount();
  $("pointsUsed").textContent=used+" / "+state.level;
  let text="Choose a Tier 1 talent to select a specialization.";
  if(state.primarySpec && !state.picks[state.primarySpec].tier_2) text="Primary spec chosen. Select its Tier 2 talent.";
  else if(state.primarySpec && !state.picks[state.primarySpec].capstones) text="Select a capstone to complete the primary spec and unlock the other trees.";
  else if(primaryComplete() && used<state.level) text="Primary spec complete. Spend remaining points in any unlocked tree.";
  else if(used===state.level) text="All available talent points are spent.";
  $("buildStatus").textContent=text;
}
function render() {
  renderTabs();
  renderTree();
  renderStatus();
}
async function changeClass(classId) {
  state.classMeta=state.index.classes.find(c=>c.id===classId);
  state.specs=new Map();
  for(const meta of state.classMeta.specs) {
    const path=DATA_ROOT+meta.data_path.replace("./","");
    state.specs.set(meta.id,await loadJson(path));
  }
  state.activeSpec=state.classMeta.specs[0].id;
  state.primarySpec=null;
  state.picks=blankPicks();
  render();
}
function resetBuild() {
  state.primarySpec=null;
  state.picks=blankPicks();
  render();
}
async function init() {
  try {
    state.index=await loadJson(DATA_ROOT+"index.json");
    state.index.classes.forEach(c=>{
      const o=document.createElement("option");
      o.value=c.id;
      o.textContent=c.label+(c.faction?" · "+c.faction:"");
      $("classSelect").appendChild(o);
    });
    $("classSelect").addEventListener("change",e=>changeClass(e.target.value));
    $("levelRange").addEventListener("input",e=>{
      const next=Number(e.target.value);
      if(pointCount()>next) resetBuild();
      state.level=next;
      $("levelBadge").textContent="Level "+next;
      render();
    });
    $("resetBuild").addEventListener("click",resetBuild);
    await changeClass(state.index.classes[0].id);
  } catch(err) {
    showError(err.message+". Serve the repository over HTTP; see mockup/README.md.");
  }
}
init();
