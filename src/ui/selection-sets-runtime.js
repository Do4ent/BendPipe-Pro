(()=>{
  const SETS_URL="__TB_SELECTION_SETS_MODULE_URL__";
  let domain=null,installed=false,panel=null,toggle=null,observer=null,treeScheduled=false,providerUnregister=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const clone=v=>v==null?v:structuredClone(v);
  const toast=m=>{try{eng()?.toast?.(String(m??""));}catch{}};
  function command(label,mutate){
    const fn=eng()?.modelCommand;let ok;
    try{ok=typeof fn==="function"?fn(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    try{window.refreshProjectTree?.();window.TubeBenderGroups?.applyVisibility?.();window.TubeBenderAssemblies?.applyVisibility?.();window.TubeBenderLayers?.applyAll?.();}catch{}
    renderTree();renderPanel();dispatch();return true;
  }
  function entryRef(entry){
    if(!entry)return null;
    if(entry.kind==="tube")return {kind:"tube",id:String(entry.tubeId)};
    if(entry.kind==="row")return {kind:"row",tube_id:String(entry.tubeId),row_index:Number(entry.rowIndex)};
    if(entry.kind==="mesh-instance")return {kind:"mesh-instance",id:String(entry.instanceId)};
    if(entry.kind==="ref")return {kind:"ref",scene_id:String(entry.sceneId),node_id:String(entry.nodeId)};
    if(entry.kind==="group")return {kind:"group",id:String(entry.groupId)};
    if(entry.kind==="project-assembly")return {kind:"project-assembly",id:String(entry.assemblyId)};
    if(entry.kind==="dimension")return {kind:"dimension",id:String(entry.dimensionId??entry.id)};
    if(entry.kind==="construction")return {kind:"construction",id:String(entry.constructionId??entry.id)};
    return null;
  }
  function currentRefs(){
    const map=new Map();
    for(const entry of entries()){
      const ref=entryRef(entry);if(!ref)continue;
      map.set(domain.selectionRefKey(ref),ref);
    }
    return [...map.values()];
  }
  function selectionKey(ref){
    if(ref.kind==="tube")return "tube:"+encodeURIComponent(ref.id);
    if(ref.kind==="row")return "row:"+encodeURIComponent(ref.tube_id)+":"+String(ref.row_index);
    if(ref.kind==="mesh-instance")return "mesh:"+encodeURIComponent(ref.id);
    if(ref.kind==="ref")return "ref:"+encodeURIComponent(ref.scene_id)+":"+encodeURIComponent(ref.node_id);
    if(ref.kind==="group")return "group:"+encodeURIComponent(ref.id);
    if(ref.kind==="project-assembly")return "project-assembly:"+encodeURIComponent(ref.id);
    if(ref.kind==="dimension")return "dimension:"+encodeURIComponent(ref.id);
    if(ref.kind==="construction")return "construction:"+encodeURIComponent(ref.id);
    return "";
  }
  function setById(id){return domain.selectionSetById(project(),id);}
  function findScene(id){return (project()?.referenceScenes??[]).find(scene=>String(scene?.id)===String(id))??null;}
  function findNode(nodes,id){
    for(const node of nodes??[]){
      if(String(node?.id)===String(id))return node;
      const child=findNode(node?.children,id);if(child)return child;
    }
    return null;
  }
  function objectForRef(ref){
    const p=project();if(!p)return null;
    if(ref.kind==="tube")return (p.tubes??[]).find(x=>String(x?.id)===String(ref.id))??null;
    if(ref.kind==="row"){
      const tube=(p.tubes??[]).find(x=>String(x?.id)===String(ref.tube_id));
      return tube?.rows?.[Number(ref.row_index)]??null;
    }
    if(ref.kind==="mesh-instance")return (p.editable_mesh_instances??[]).find(x=>String(x?.id)===String(ref.id))??null;
    if(ref.kind==="ref"){const scene=findScene(ref.scene_id);return findNode(scene?.tree,ref.node_id);}
    if(ref.kind==="group")return window.TubeBenderGroups?.groupById?.(ref.id)??null;
    if(ref.kind==="project-assembly")return window.TubeBenderAssemblies?.assemblyById?.(ref.id)??null;
    if(ref.kind==="dimension")return [...(p.engineering_dimensions??[]),...(p.dimensions??[])].find(x=>String(x?.id)===String(ref.id))??null;
    if(ref.kind==="construction")return (p.construction_geometry??[]).find(x=>String(x?.id)===String(ref.id))??null;
    return null;
  }
  function refExists(ref){return !!objectForRef(ref);}
  function pruneMissing({recordHistory=false}={}){
    const p=project();if(!p)return [];
    const mutate=()=>domain.pruneSelectionSetMembers(p,refExists);
    if(recordHistory){
      let removed=[];command("Очистить Selection Sets",()=>{removed=mutate();return removed.length>0;});return removed;
    }
    const removed=mutate();if(removed.length){renderTree();renderPanel();dispatch();}return removed;
  }
  function createFromSelection(name="Selection Set"){
    const refs=currentRefs();if(!refs.length){toast("Выберите объекты для Selection Set");return false;}
    let created=null;
    const ok=command("Создать Selection Set",()=>{created=domain.createSelectionSet(project(),{name,members:refs});return true;});
    return ok?created:false;
  }
  function rename(setId,name){return command("Переименовать Selection Set",()=>{domain.renameSelectionSet(project(),setId,name);return true;});}
  function addSelection(setId){
    const refs=currentRefs();if(!refs.length){toast("Нет выбранных объектов для добавления");return false;}
    return command("Добавить объекты в Selection Set",()=>{domain.addSelectionSetMembers(project(),setId,refs);return true;});
  }
  function removeSelection(setId){
    const refs=currentRefs();if(!refs.length){toast("Нет выбранных объектов для удаления из набора");return false;}
    return command("Удалить объекты из Selection Set",()=>{domain.removeSelectionSetMembers(project(),setId,refs);return true;});
  }
  function deleteSet(setId){return command("Удалить Selection Set",()=>domain.deleteSelectionSet(project(),setId));}
  function selectSet(setId,{announce=true}={}){
    pruneMissing();
    const set=setById(setId);if(!set)return false;
    const keys=(set.members??[]).map(selectionKey).filter(Boolean);
    ctx()?.replaceSelectionKeys?.(keys,{announce});
    toast("Выбрано из "+set.name+": "+keys.length);return keys.length>0;
  }
  function setVisibleForRef(ref,visible){
    const object=objectForRef(ref);if(!object)return;
    if(ref.kind==="tube"){object.uiHiddenIn3D=!visible;object.visible=visible;return;}
    if(ref.kind==="row"){object.uiHiddenIn3D=!visible;return;}
    if(ref.kind==="mesh-instance"){object.visible=visible;return;}
    if(ref.kind==="ref"){object.visible=visible;object.hidden=visible?false:true;return;}
    if(ref.kind==="group"||ref.kind==="project-assembly"||ref.kind==="dimension"||ref.kind==="construction"){object.visible=visible;}
  }
  function showHide(setId,visible){
    pruneMissing();const set=setById(setId);if(!set)return false;
    return command(visible?"Показать Selection Set":"Скрыть Selection Set",()=>{for(const ref of set.members??[])setVisibleForRef(ref,visible);return true;});
  }
  function setLockForRef(ref,mode){
    const object=objectForRef(ref);if(!object)return;
    const policy=window.TubeBenderObjectLocks?.policy;
    if(policy?.setLockMode)policy.setLockMode(object,mode);
    else if(mode==="Unlocked")delete object.lock_state;
    else object.lock_state={mode};
  }
  function lockSet(setId,mode="Object"){
    pruneMissing();const set=setById(setId);if(!set)return false;
    return command(mode==="Unlocked"?"Разблокировать Selection Set":"Заблокировать Selection Set",()=>{for(const ref of set.members??[])setLockForRef(ref,mode);return true;});
  }
  function useWith(setId,tool){
    if(!selectSet(setId))return false;
    if(["move","copy","rotate","array"].includes(String(tool))){window.TubeBenderEditing?.open?.(String(tool));return true;}
    return false;
  }
  function setLabel(set){return String(set?.name??set?.id??"Selection Set");}
  function renderTree(){
    const host=document.getElementById("tbProjectTree");if(!host||!domain)return;
    pruneMissing();
    const all=domain.ensureSelectionSetState(project());
    const signature=JSON.stringify(all.map(set=>({id:set.id,name:set.name,members:set.members})));
    let section=host.querySelector("[data-selection-sets-tree-root]");
    if(section?.dataset.signature===signature)return;
    if(!section){section=document.createElement("div");section.dataset.selectionSetsTreeRoot="1";host.appendChild(section);}
    section.dataset.signature=signature;
    section.innerHTML='<div class="tb-tree-node level1"><span class="tb-tree-icon">▾</span><span class="tb-tree-label">⌑ Наборы выбора <small>· '+all.length+'</small></span></div>'+
      all.map(set=>'<div class="tb-tree-node clickable tb-selection-set-row" style="padding-left:30px" data-selection-set="'+esc(set.id)+'"><span class="tb-tree-icon">⌑</span><span class="tb-tree-label">'+esc(set.name)+' <small>· '+(set.members?.length??0)+'</small></span></div>').join("");
    section.querySelectorAll("[data-selection-set]").forEach(row=>row.onclick=event=>{event.preventDefault();event.stopPropagation();selectSet(row.dataset.selectionSet);renderPanel(row.dataset.selectionSet);});
    try{ctx()?.decorateProjectTreeAsTreeView?.();}catch{}
  }
  function scheduleTree(){if(treeScheduled)return;treeScheduled=true;queueMicrotask(()=>{treeScheduled=false;renderTree();});}
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbSelectionSetStyles";style.textContent=
      '#tbSelectionSetsToggle{position:fixed;right:492px;top:54px;z-index:120370;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbSelectionSetsPanel{position:fixed;right:14px;top:88px;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120363;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbSelectionSetsPanel.open{display:flex}.tb-set-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-set-head .grow{flex:1}.tb-set-body{overflow:auto;padding:8px}.tb-set-grid{display:grid;grid-template-columns:120px 1fr;gap:7px;align-items:center}.tb-set-grid input,.tb-set-grid select{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-set-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.tb-set-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 7px;cursor:pointer}.tb-set-note{color:#8396aa;margin-top:7px;line-height:1.35}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbSelectionSetsToggle";toggle.type="button";toggle.textContent="Sets";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbSelectionSetsPanel";panel.innerHTML='<div class="tb-set-head"><b>Наборы выбора</b><span class="grow"></span><button data-set-close>×</button></div><div class="tb-set-body" data-set-body></div>';document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderPanel();};panel.querySelector("[data-set-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function renderPanel(selectedId=null){
    if(!domain)return;const p=project();if(!p)return;const root=ensurePanel(),body=root.querySelector("[data-set-body]");
    pruneMissing();const sets=domain.ensureSelectionSetState(p),id=selectedId??body.dataset.activeSet??sets[0]?.id??"",set=id?setById(id):null;
    body.dataset.activeSet=set?.id??"";
    const options='<option value="">—</option>'+sets.map(item=>'<option value="'+esc(item.id)+'" '+(String(item.id)===String(set?.id)?"selected":"")+'>'+esc(item.name)+'</option>').join("");
    body.innerHTML='<div class="tb-set-grid"><label>Selection Set</label><select data-set-select>'+options+'</select><label>Name</label><input data-set-name value="'+esc(set?.name??"Selection Set")+'"><label>Members</label><span>'+(set?.members?.length??0)+'</span></div>'+
      '<div class="tb-set-actions"><button data-set-create>Create from selection</button><button data-set-select-now '+(!set?"disabled":"")+'>Select</button><button data-set-rename '+(!set?"disabled":"")+'>Rename</button><button data-set-add '+(!set?"disabled":"")+'>Add selection</button><button data-set-remove '+(!set?"disabled":"")+'>Remove selection</button><button data-set-delete '+(!set?"disabled":"")+'>Delete set</button></div>'+
      '<div class="tb-set-actions"><button data-set-show '+(!set?"disabled":"")+'>Show</button><button data-set-hide '+(!set?"disabled":"")+'>Hide</button><button data-set-lock '+(!set?"disabled":"")+'>Lock</button><button data-set-unlock '+(!set?"disabled":"")+'>Unlock</button></div>'+
      '<div class="tb-set-actions"><button data-set-tool="move" '+(!set?"disabled":"")+'>Move</button><button data-set-tool="copy" '+(!set?"disabled":"")+'>Copy</button><button data-set-tool="rotate" '+(!set?"disabled":"")+'>Rotate</button><button data-set-tool="array" '+(!set?"disabled":"")+'>Array</button></div>'+
      '<div class="tb-set-note">Static Selection Set хранит только ссылки на конкретные объекты и не меняет TreeView/Assembly/Group иерархию. Один объект может входить в несколько наборов.</div>';
    body.querySelector("[data-set-select]").onchange=e=>renderPanel(e.target.value||null);
    body.querySelector("[data-set-create]").onclick=()=>{const created=createFromSelection(body.querySelector("[data-set-name]").value);if(created)renderPanel(created.id);};
    if(!set)return;
    body.querySelector("[data-set-select-now]").onclick=()=>selectSet(set.id);
    body.querySelector("[data-set-rename]").onclick=()=>rename(set.id,body.querySelector("[data-set-name]").value);
    body.querySelector("[data-set-add]").onclick=()=>addSelection(set.id);
    body.querySelector("[data-set-remove]").onclick=()=>removeSelection(set.id);
    body.querySelector("[data-set-delete]").onclick=()=>deleteSet(set.id);
    body.querySelector("[data-set-show]").onclick=()=>showHide(set.id,true);
    body.querySelector("[data-set-hide]").onclick=()=>showHide(set.id,false);
    body.querySelector("[data-set-lock]").onclick=()=>lockSet(set.id,"Object");
    body.querySelector("[data-set-unlock]").onclick=()=>lockSet(set.id,"Unlocked");
    body.querySelectorAll("[data-set-tool]").forEach(button=>button.onclick=()=>useWith(set.id,button.dataset.setTool));
  }
  function provider({query=""}={}){
    const q=String(query??"").trim().toLowerCase(),sets=domain.ensureSelectionSetState(project());
    return sets.map(set=>{
      const name=String(set.name),lower=name.toLowerCase(),match=!q?true:lower.includes(q)||("set "+lower).includes(q);
      if(!match)return null;
      const exact=lower===q;
      return {command:{id:"selection-set:"+set.id,name_en:"Selection Set: "+name,name_ru:"Набор выбора: "+name,run:()=>selectSet(set.id)},aliases:[name],score:exact?500:220-(lower.indexOf(q)>=0?lower.indexOf(q):0)};
    }).filter(Boolean);
  }
  function registerProvider(){
    providerUnregister?.();providerUnregister=window.TubeBenderCommandLine?.registerProvider?.(provider)??null;
  }
  function dispatch(){try{window.dispatchEvent(new CustomEvent("tubebender-selection-set-change",{detail:{sets:clone(project()?.selection_sets??[])}}));}catch{}}
  function observe(){observer?.disconnect?.();observer=new MutationObserver(()=>scheduleTree());observer.observe(document.body,{childList:true,subtree:true});}
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(SETS_URL);}catch(error){console.error("Selection Sets failed",error);return;}
    domain.ensureSelectionSetState(project());ensurePanel();renderTree();renderPanel();observe();registerProvider();
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))renderPanel();});
    window.addEventListener("tubebender-command-line-ready",registerProvider);
    window.TubeBenderSelectionSets=Object.freeze({
      createFromSelection,rename,addSelection,removeSelection,deleteSet,selectSet,show:(id)=>showHide(id,true),hide:(id)=>showHide(id,false),lock:(id)=>lockSet(id,"Object"),unlock:(id)=>lockSet(id,"Unlocked"),useWith,pruneMissing,
      sets:()=>clone(domain.ensureSelectionSetState(project())),byId:(id)=>clone(setById(id)),openPanel:()=>{ensurePanel().classList.add("open");renderPanel();},renderTree,renderPanel,domain
    });
    registerProvider();dispatch();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();