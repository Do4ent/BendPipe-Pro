(()=>{
  const NORMALIZE_URL="__TB_NORMALIZE_FITTED_GEOMETRY_MODULE_URL__";
  let installed=false,domain=null,panel=null,toggle=null;
  const eng=()=>window.TubeBenderEngineering??null;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const refApi=()=>window.TubeBenderReferenceSceneUi??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const clone=(v)=>v==null?v:structuredClone(v);
  const toast=(m)=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const makeId=(prefix)=>{
    const uuid=globalThis.crypto?.randomUUID?.();
    return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  };
  const tubeById=(id)=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  const meshById=(id)=>refApi()?.meshInstanceById?.(project(),id)??null;
  function findScene(id){return (project()?.referenceScenes??[]).find(scene=>String(scene?.id)===String(id))??null;}
  function findNode(tree,id){
    for(const node of tree??[]){
      if(String(node?.id)===String(id))return node;
      const nested=findNode(node?.children,id);if(nested)return nested;
    }
    return null;
  }
  function uniqueTubeName(base){
    const used=new Set((project()?.tubes??[]).map(t=>String(t?.name??"")));
    let name=String(base||"Tube")+" Exact",n=2;
    while(used.has(name))name=String(base||"Tube")+" Exact "+n++;
    return name;
  }
  function sourceChain(value,entry){
    const out=[];
    if(value?.currentProjectImport?.source_file)out.push({kind:"source_file",value:String(value.currentProjectImport.source_file)});
    if(value?.currentProjectImport?.source_link)out.push({kind:"source_link",value:clone(value.currentProjectImport.source_link)});
    if(value?.importEvidence?.source)out.push({kind:"import_source",value:clone(value.importEvidence.source)});
    if(entry?.kind==="ref")out.push({kind:"reference_node",scene_id:String(entry.sceneId),node_id:String(entry.nodeId)});
    if(value?.source)out.push({kind:"mesh_source",value:clone(value.source)});
    return out;
  }
  function targetFromEntry(entry){
    if(!entry)return null;
    if(["tube","row","origin","end","assembly","assembly-part"].includes(entry.kind)){
      const tube=tubeById(entry.tubeId);return tube?{kind:"tube",entry,object:tube,id:String(tube.id)}:null;
    }
    if(entry.kind==="mesh-instance"){
      const mesh=meshById(entry.instanceId);return mesh?{kind:"mesh-instance",entry,object:mesh,id:String(mesh.id)}:null;
    }
    if(entry.kind==="ref"){
      const scene=findScene(entry.sceneId),node=findNode(scene?.tree,entry.nodeId);
      return node?{kind:"ref",entry,object:node,id:String(node.id),scene}:null;
    }
    return null;
  }
  function selectedTargets(){
    const out=[],seen=new Set();
    for(const entry of entries()){
      const target=targetFromEntry(entry);if(!target)continue;
      const key=target.kind+":"+target.id;
      if(seen.has(key))continue;seen.add(key);out.push(target);
    }
    return out;
  }
  function canNormalizeTarget(target){return !!target&&domain?.isFittedGeometry?.(target.object)===true;}
  function normalizedTargets(){return selectedTargets().filter(canNormalizeTarget);}

  function prepareTubeExact(source){
    const exact=clone(source);
    exact.id=makeId("tube");
    exact.name=uniqueTubeName(source.name);
    exact.geometry_status="Exact";
    exact.fitted=false;
    exact.normalized_from_fitted_id=String(source.id);
    exact.normalization_compare={fitted_object_id:String(source.id),enabled:true};
    delete exact.array_member;
    delete exact.mirror_member;
    delete exact.transform_stack_member;
    delete exact.derived_readonly;
    delete exact.readonly;
    if(Array.isArray(exact.rows)){
      exact.rows=exact.rows.map(row=>({...row,elementId:row?.elementId?makeId("element"):row?.elementId}));
    }
    return exact;
  }
  function applyNormalizedPayload(live,result,{fittedId=null}={}){
    const exact=clone(result.exact_geometry);
    for(const key of Object.keys(live))delete live[key];
    Object.assign(live,exact);
    live.geometry_status="Exact";
    live.fitted=false;
    live.normalized_exact=true;
    if(fittedId!=null){
      live.normalized_from_fitted_id=String(fittedId);
      live.normalization_compare={fitted_object_id:String(fittedId),enabled:true};
    }
    return live;
  }
  function normalizeTube(target,{note=null,patch=null}={}){
    const source=target.object;
    let exact=prepareTubeExact(source);
    if(patch&&typeof patch==="object")exact={...exact,...clone(patch),id:exact.id,name:exact.name};
    const result=domain.createExactNormalizedGeometry({
      fitted_geometry:source,
      exact_geometry:exact,
      source_chain:sourceChain(source,target.entry),
      method:"Normalize Geometry",
      note,
      fitted_object_id:source.id,
      source_object_id:source.currentProjectImport?.source_link?.node_id??null
    });
    project().tubes.push(clone(result.exact_geometry));
    return {kind:"tube",id:String(result.exact_geometry.id),result};
  }
  function normalizeMesh(target,{note=null,patch=null}={}){
    const source=target.object;
    const created=refApi()?.copyEditableMeshInstance?.(project(),source.id,{offset_mm:{x:0,y:0,z:0},name:String(source.name??"Mesh")+" Exact"});
    if(!created)throw new Error("Не удалось создать Exact mesh instance");
    let exact=clone(created);
    if(patch&&typeof patch==="object")exact={...exact,...clone(patch),id:created.id};
    const result=domain.createExactNormalizedGeometry({
      fitted_geometry:source,
      exact_geometry:exact,
      source_chain:sourceChain(source,target.entry),
      method:"Normalize Geometry",
      note,
      fitted_object_id:source.id,
      source_object_id:source.source?.node_id??null
    });
    applyNormalizedPayload(created,result,{fittedId:source.id});
    return {kind:"mesh-instance",id:String(created.id),result};
  }
  function normalizeReference(target,{note=null,patch=null}={}){
    const source=target.object;
    const created=refApi()?.createEditableMeshInstanceByRef?.(project(),target.entry.sceneId,target.entry.nodeId,{name:String(source.label??"Reference")+" Exact"});
    if(!created)throw new Error("Не удалось создать Editable Exact instance из Reference");
    let exact=clone(created);
    if(patch&&typeof patch==="object")exact={...exact,...clone(patch),id:created.id};
    const fittedCarrier={...clone(source),geometry_status:String(source.geometry_status??"Fitted")};
    const result=domain.createExactNormalizedGeometry({
      fitted_geometry:fittedCarrier,
      exact_geometry:exact,
      source_chain:sourceChain(source,target.entry),
      method:"Normalize Geometry",
      note,
      fitted_object_id:source.id,
      source_object_id:source.id
    });
    applyNormalizedPayload(created,result,{fittedId:source.id});
    return {kind:"mesh-instance",id:String(created.id),result};
  }
  function normalizeTarget(target,options={}){
    if(!canNormalizeTarget(target))throw new Error("Выбранная геометрия не имеет статуса Fitted");
    if(target.kind==="tube")return normalizeTube(target,options);
    if(target.kind==="mesh-instance")return normalizeMesh(target,options);
    if(target.kind==="ref")return normalizeReference(target,options);
    throw new Error("Normalize Geometry не поддерживает этот тип объекта");
  }
  function normalizeSelected(options={}){
    const targets=normalizedTargets();
    if(!targets.length){toast("Нет выбранной Fitted-геометрии для Normalize Geometry");return false;}
    const created=[];
    const mutate=()=>{
      for(const target of targets)created.push(normalizeTarget(target,options));
      return true;
    };
    const command=eng()?.modelCommand;
    let ok;
    try{ok=typeof command==="function"?command("Fitted → Exact / Normalize Geometry",mutate):mutate();}
    catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();window.refreshProjectTree?.();}catch{}
    const keys=created.map(item=>item.kind==="tube"
      ?"tube:"+encodeURIComponent(item.id)
      :"mesh:"+encodeURIComponent(item.id));
    if(keys.length)ctx()?.replaceSelectionKeys?.(keys);
    toast("Создано Exact объектов: "+created.length);
    render();
    try{window.dispatchEvent(new CustomEvent("tubebender-normalize-geometry",{detail:{created:created.map(item=>({kind:item.kind,id:item.id,correction:item.result.correction}))}}));}catch{}
    return Object.freeze(created.map(item=>Object.freeze({kind:item.kind,id:item.id,correction:clone(item.result.correction)})));
  }
  function normalizedObjectById(id){
    const tube=tubeById(id);if(tube?.normalization_provenance?.operation==="FittedToExact")return tube;
    const mesh=meshById(id);if(mesh?.normalization_provenance?.operation==="FittedToExact")return mesh;
    return null;
  }
  function fittedOriginalFor(normalized){
    const id=normalized?.normalized_from_fitted_id??normalized?.normalization_provenance?.fitted_object_id;
    if(!id)return null;
    return tubeById(id)??meshById(id)??null;
  }
  function compareNormalized(id,{visible=true}={}){
    const exact=normalizedObjectById(id);if(!exact)return false;
    const fitted=fittedOriginalFor(exact);
    if(!fitted)return false;
    if(fitted.kind==="EditableMeshInstance"){
      fitted.visible=visible!==false;
    }else{
      fitted.uiHiddenIn3D=visible===false;
      fitted.visible=true;
    }
    if(exact.kind==="EditableMeshInstance")exact.visible=true;
    else{exact.uiHiddenIn3D=false;exact.visible=true;}
    exact.normalization_compare={...(exact.normalization_compare??{}),fitted_object_id:String(fitted.id),enabled:visible!==false};
    try{eng()?.save?.();eng()?.renderAll?.();window.refreshProjectTree?.();}catch{}
    return true;
  }
  function correctionFor(id){
    const exact=normalizedObjectById(id);return clone(exact?.normalization_provenance?.correction??null);
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbNormalizeGeometryStyles";
    style.textContent='#tbNormalizeGeometryToggle{position:fixed;right:344px;top:54px;z-index:120368;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbNormalizeGeometryPanel{position:fixed;right:14px;top:88px;width:min(390px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120361;display:none;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbNormalizeGeometryPanel.open{display:block}.tb-norm-head{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid #304154}.tb-norm-head .grow{flex:1}.tb-norm-body{padding:9px}.tb-norm-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.tb-norm-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 8px;cursor:pointer}.tb-norm-note{color:#93a7bb;line-height:1.4}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbNormalizeGeometryToggle";toggle.textContent="Normalize";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbNormalizeGeometryPanel";
    panel.innerHTML='<div class="tb-norm-head"><b>Fitted → Exact</b><span class="grow"></span><button data-norm-close>×</button></div><div class="tb-norm-body" data-norm-body></div>';
    document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");render();};
    panel.querySelector("[data-norm-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function render(){
    if(!domain)return;
    const root=ensurePanel(),body=root.querySelector("[data-norm-body]");
    const targets=selectedTargets(),fitted=targets.filter(canNormalizeTarget);
    const normalized=targets.map(t=>t.object).filter(o=>o?.normalization_provenance?.operation==="FittedToExact");
    body.innerHTML='<div class="tb-norm-note">Normalize создаёт новый Exact editable object. Source и Fitted остаются неизменными; correction и Fitted snapshot сохраняются в provenance.</div>'+
      '<div style="margin-top:8px">Selected: '+targets.length+' · Fitted: '+fitted.length+' · Exact normalized: '+normalized.length+'</div>'+
      '<div class="tb-norm-actions"><button data-norm-run '+(!fitted.length?'disabled':'')+'>Сделать точной / Normalize Geometry</button>'+
      (normalized.length===1?'<button data-norm-compare>Compare with Fitted</button>':'')+'</div>';
    body.querySelector("[data-norm-run]")?.addEventListener("click",()=>normalizeSelected());
    body.querySelector("[data-norm-compare]")?.addEventListener("click",()=>{
      const obj=normalized[0];compareNormalized(obj.id,{visible:!(obj.normalization_compare?.enabled===true)});
      render();
    });
  }
  async function install(){
    if(installed)return;installed=true;
    try{domain=await import(NORMALIZE_URL);}catch(error){console.error("Normalize Geometry runtime failed",error);return;}
    ensurePanel();render();
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))render();});
    window.TubeBenderNormalizeGeometry=Object.freeze({
      normalizeSelected,normalizeTarget,compareNormalized,correctionFor,
      canNormalizeTarget,selectedTargets,normalizedTargets,render,domain
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();