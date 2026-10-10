(()=>{
  const LOCK_POLICY_URL="__TB_OBJECT_LOCKS_MODULE_URL__";
  let installed=false,policy=null,observer=null;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const eng=()=>window.TubeBenderEngineering??null;
  const refApi=()=>window.TubeBenderReferenceSceneUi??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const toast=(message)=>{try{eng()?.toast?.(String(message??""));}catch{try{if(typeof ptToast==="function")ptToast(String(message??""));}catch{}}};
  const tubeById=(id)=>(project()?.tubes??[]).find((tube)=>String(tube?.id)===String(id))??null;
  const arrayDefinitions=()=>Array.isArray(project()?.associative_arrays)?project().associative_arrays:[];
  const arrayById=(id)=>arrayDefinitions().find((def)=>String(def?.id)===String(id))??null;
  const meshById=(id)=>refApi()?.meshInstanceById?.(project(),id)??null;
  const modeLabel=(mode)=>mode==="Object"?"Lock Object":mode==="Position"?"Lock Position":"Unlocked";

  function baseTargetForEntry(entry){
    if(!entry)return null;
    if(["tube","row","origin","end"].includes(entry.kind)){
      const tube=tubeById(entry.tubeId);
      if(!tube)return null;
      const arrayId=tube?.array_member?.array_id;
      if(arrayId){
        const def=arrayById(arrayId);
        if(def)return {kind:"array",id:String(def.id),object:def,label:def.name??"Array",entry};
      }
      return {kind:"tube",id:String(tube.id),object:tube,label:tube.name??tube.id,entry};
    }
    if(entry.kind==="mesh-instance"){
      const instance=meshById(entry.instanceId);
      return instance?{kind:"mesh-instance",id:String(instance.id),object:instance,label:instance.name??instance.id,entry}:null;
    }
    if(entry.kind==="group"){
      const group=window.TubeBenderGroups?.groupById?.(entry.groupId);
      return group?{kind:"group",id:String(group.id),object:group,label:group.name??group.id,entry}:null;
    }
    if(entry.kind==="project-assembly"){
      const assembly=window.TubeBenderAssemblies?.assemblyById?.(entry.assemblyId);
      return assembly?{kind:"project-assembly",id:String(assembly.id),object:assembly,label:assembly.name??assembly.id,entry}:null;
    }
    return null;
  }

  function effectiveLockTargets(entry){
    const target=baseTargetForEntry(entry);
    if(!target)return [];
    if(target.kind==="array"){
      const out=[target];
      for(const tube of project()?.tubes??[]){
        if(String(tube?.array_member?.array_id??"")===target.id){
          out.push({kind:"tube",id:String(tube.id),object:tube,label:tube.name??tube.id,entry});
        }
      }
      return out;
    }
    return [target];
  }

  function selectionTargets(){
    const out=[],seen=new Set();
    for(const entry of entries()){
      const target=baseTargetForEntry(entry);
      if(!target)continue;
      const key=target.kind+":"+target.id;
      if(seen.has(key))continue;
      seen.add(key);out.push(target);
    }
    return out;
  }

  function entryLockMode(entry){
    const targets=effectiveLockTargets(entry);
    return policy?.mostRestrictiveLockMode?.(targets.map((target)=>target.object))??"Unlocked";
  }

  function permissionForEntry(entry,action){
    const assemblyPermission=window.TubeBenderAssemblies?.permissionForEntry?.(entry,action);
    if(assemblyPermission&&assemblyPermission.allowed===false)return assemblyPermission;
    const groupPermission=window.TubeBenderGroups?.permissionForEntry?.(entry,action);
    if(groupPermission&&groupPermission.allowed===false)return groupPermission;
    const layerPermission=window.TubeBenderLayers?.permissionForEntry?.(entry,action);
    if(layerPermission&&layerPermission.allowed===false)return layerPermission;
    const targets=effectiveLockTargets(entry);
    if(!targets.length)return layerPermission??{allowed:true,mode:"Unlocked",code:"LOCK_ALLOWED",reason:null};
    let result=layerPermission??{allowed:true,mode:"Unlocked",code:"LOCK_ALLOWED",reason:null};
    for(const target of targets){
      const permission=policy.lockPermission(target.object,action);
      if(!permission.allowed)return permission;
      if(permission.mode==="Object"||permission.mode==="Position")result=permission;
    }
    return result;
  }

  function permissionForSelection(action){
    for(const entry of entries()){
      const permission=permissionForEntry(entry,action);
      if(!permission.allowed)return permission;
    }
    return {allowed:true,mode:"Unlocked",code:"LOCK_ALLOWED",reason:null};
  }

  function canSelection(action,{notify=true}={}){
    const permission=permissionForSelection(action);
    if(!permission.allowed&&notify)toast(permission.reason||"Объект заблокирован");
    return permission.allowed;
  }

  function setSelectionMode(mode){
    const normalized=policy.normalizeLockMode(mode);
    const targets=selectionTargets();
    if(!targets.length){toast("Нет выбранного редактируемого объекта");return false;}
    const mutate=()=>{
      for(const target of targets){
        policy.setLockMode(target.object,normalized);
        if(target.kind==="array"){
          for(const tube of project()?.tubes??[]){
            if(String(tube?.array_member?.array_id??"")===target.id){
              if(normalized==="Object")policy.setLockMode(tube,"Object");
              else if(policy.lockStateOf(tube).mode==="Object")policy.setLockMode(tube,"Unlocked");
            }
          }
        }
      }
      return true;
    };
    const label=normalized==="Unlocked"
      ?"Разблокировать объект"
      :normalized==="Position"
        ?"Lock Position"
        :"Lock Object";
    const command=eng()?.modelCommand;
    const ok=typeof command==="function"?command(label,mutate):mutate();
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    try{window.refreshProjectTree?.();}catch{}
    decorateTree();dispatch();
    toast(normalized==="Unlocked"?"Объект разблокирован":modeLabel(normalized));
    return true;
  }

  function statusForEntry(entry){
    const mode=entryLockMode(entry);
    return Object.freeze({mode,locked:mode!=="Unlocked",label:modeLabel(mode)});
  }

  function lockIcon(mode){
    return mode==="Object"?"🔒":mode==="Position"?"📍":"";
  }

  function ensureBadge(row){
    let badge=row.querySelector(":scope > .tb-lock-badge");
    if(!badge){
      badge=document.createElement("span");
      badge.className="tb-lock-badge";
      badge.style.cssText="margin-left:5px;font-size:11px;line-height:1;vertical-align:middle";
      const label=row.querySelector(".tb-tree-label");
      if(label)label.appendChild(badge);else row.appendChild(badge);
    }
    return badge;
  }

  function treeEntry(row){
    if(row.matches("[data-project-assembly]"))return {kind:"project-assembly",assemblyId:String(row.dataset.projectAssembly)};
    if(row.matches("[data-project-group]"))return {kind:"group",groupId:String(row.dataset.projectGroup)};
    if(row.matches("[data-import-mesh-instance]"))return {kind:"mesh-instance",instanceId:String(row.dataset.importMeshInstance)};
    if(row.matches("[data-tree-tube]"))return {kind:"tube",tubeId:String(row.dataset.treeTube)};
    const active=String(eng()?.activeTube?.()?.id??"");
    if(!active)return null;
    if(row.matches("[data-tree-row]"))return {kind:"row",tubeId:active,rowIndex:Number(row.dataset.treeRow)};
    if(row.matches("[data-tree-origin]"))return {kind:"origin",tubeId:active};
    if(row.matches("[data-tree-end]"))return {kind:"end",tubeId:active};
    return null;
  }

  function decorateTree(){
    if(typeof document==="undefined"||!policy)return;
    const root=document.getElementById("tbProjectTree")??document;
    for(const row of root.querySelectorAll("[data-project-assembly],[data-project-group],[data-tree-tube],[data-tree-row],[data-tree-origin],[data-tree-end],[data-import-mesh-instance]")){
      const entry=treeEntry(row),badge=ensureBadge(row);
      const mode=entry?entryLockMode(entry):"Unlocked";
      badge.textContent=lockIcon(mode);
      badge.title=mode==="Object"?"Lock Object":mode==="Position"?"Lock Position":"";
      badge.hidden=mode==="Unlocked";
      row.dataset.lockMode=mode;
      row.classList.toggle("tb-object-locked",mode!=="Unlocked");
    }
  }

  function dispatch(){
    try{window.dispatchEvent(new CustomEvent("tubebender-lock-change",{detail:{targets:selectionTargets().map((target)=>({kind:target.kind,id:target.id,mode:policy.lockStateOf(target.object).mode}))}}));}catch{}
  }

  function observeTree(){
    const root=document.getElementById("tbProjectTree")??document.body;
    observer?.disconnect?.();
    observer=new MutationObserver(()=>decorateTree());
    observer.observe(root,{childList:true,subtree:true});
  }

  async function install(){
    if(installed)return;installed=true;
    try{policy=await import(LOCK_POLICY_URL);}catch(error){console.error("Object Lock runtime failed to load",error);return;}
    const style=document.createElement("style");
    style.id="tbObjectLockStyles";
    style.textContent=".tb-object-locked .tb-tree-label{position:relative}.tb-lock-badge{filter:none!important}";
    document.head.appendChild(style);
    observeTree();decorateTree();
    window.addEventListener("tubebender-selection-change",()=>{decorateTree();dispatch();});
    window.TubeBenderObjectLocks=Object.freeze({
      setSelectionMode,
      unlockSelection:()=>setSelectionMode("Unlocked"),
      lockObject:()=>setSelectionMode("Object"),
      lockPosition:()=>setSelectionMode("Position"),
      canSelection,
      permissionForSelection,
      permissionForEntry,
      statusForEntry,
      entryLockMode,
      selectionTargets:()=>selectionTargets().map((target)=>({kind:target.kind,id:target.id,label:target.label,mode:policy.lockStateOf(target.object).mode})),
      decorateTree,
      policy
    });
    dispatch();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();