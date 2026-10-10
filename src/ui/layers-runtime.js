(()=>{
  const LAYERS_URL="__TB_LAYERS_MODULE_URL__";
  let installed=false,layers=null,panel=null,toggle=null,observer=null,applyingScene=false;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const eng=()=>window.TubeBenderEngineering??null;
  const refApi=()=>window.TubeBenderReferenceSceneUi??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const toast=(message)=>{try{eng()?.toast?.(String(message??""));}catch{}};
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const tubeById=(id)=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  const meshById=(id)=>refApi()?.meshInstanceById?.(project(),id)??null;
  const findScene=(id)=>(project()?.referenceScenes??[]).find(scene=>String(scene?.id)===String(id))??null;
  function findNode(tree,id){
    for(const node of tree??[]){
      if(String(node?.id)===String(id))return node;
      const nested=findNode(node?.children,id);if(nested)return nested;
    }
    return null;
  }
  function command(label,mutate){
    const fn=eng()?.modelCommand;
    let ok;
    try{ok=typeof fn==="function"?fn(label,mutate):mutate();}
    catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    try{window.refreshProjectTree?.();}catch{}
    ensureAssignments();applyAll();render();
    try{window.dispatchEvent(new CustomEvent("tubebender-layer-change",{detail:{project_id:String(project()?.id??"")}}));}catch{}
    return true;
  }

  function kindForTube(tube){
    return tube?.currentProjectImport?.source_format||tube?.importEvidence?"editable-imported":"tube";
  }
  function ensureAssignments(){
    const p=project();if(!p||!layers)return;
    const firstInit=p.layers_initialized!==true;
    layers.ensureLayerState(p);
    for(const tube of p.tubes??[]){
      if(!tube?.layer_id){
        const kind=kindForTube(tube);
        tube.layer_id=firstInit
          ?layers.defaultLayerIdForKind(kind)
          :(kind==="editable-imported"?layers.SYSTEM_LAYER_IDS.editableImported:String(p.active_layer_id));
      }
    }
    for(const instance of p.editable_mesh_instances??[]){
      if(!instance?.layer_id)instance.layer_id=layers.SYSTEM_LAYER_IDS.editableImported;
    }
    for(const scene of p.referenceScenes??[]){
      if(!scene.layer_id)scene.layer_id=layers.SYSTEM_LAYER_IDS.importedReference;
      const visit=(node)=>{
        if(!node.layer_id)node.layer_id=scene.layer_id;
        for(const child of node.children??[])visit(child);
      };
      for(const root of scene.tree??[])visit(root);
    }
    for(const dim of p.engineering_dimensions??[]){
      if(!dim?.layer_id)dim.layer_id=layers.SYSTEM_LAYER_IDS.dimensions;
    }
    for(const item of p.construction_geometry??[]){
      if(!item?.layer_id)item.layer_id=layers.SYSTEM_LAYER_IDS.construction;
    }
    p.layers_initialized=true;
  }

  function targetForEntry(entry){
    const p=project();if(!p||!entry)return null;
    if(["tube","row","origin","end","assembly","assembly-part"].includes(entry.kind)){
      const tube=tubeById(entry.tubeId);
      return tube?{kind:kindForTube(tube),object:tube,id:String(tube.id)}:null;
    }
    if(entry.kind==="mesh-instance"){
      const object=meshById(entry.instanceId);
      return object?{kind:"mesh-instance",object,id:String(object.id)}:null;
    }
    if(entry.kind==="ref"){
      const scene=findScene(entry.sceneId),node=findNode(scene?.tree,entry.nodeId);
      return node?{kind:"reference",object:node,id:String(node.id),scene}:null;
    }
    return null;
  }
  function entryLayer(entry){
    const target=targetForEntry(entry);if(!target)return null;
    const p=project();ensureAssignments();
    const id=layers.effectiveObjectLayerId(p,target.object,{kind:target.kind});
    return layers.layerById(p,id);
  }
  function entryVisibility(entry){
    const target=targetForEntry(entry);
    if(!target)return {visible:true,selectable:true,snappable:true,frozen:false,layer_id:null};
    return layers.layerVisibility(project(),target.object,{kind:target.kind});
  }
  function permissionForEntry(entry,action){
    const target=targetForEntry(entry);
    if(!target)return {allowed:true,code:"LAYER_ALLOWED",reason:null};
    return layers.layerPermission(project(),target.object,action,{kind:target.kind});
  }
  function permissionForSelection(action){
    for(const entry of entries()){
      const permission=permissionForEntry(entry,action);
      if(!permission.allowed)return permission;
    }
    return {allowed:true,code:"LAYER_ALLOWED",reason:null};
  }
  function canSelection(action,{notify=true}={}){
    const permission=permissionForSelection(action);
    if(!permission.allowed&&notify)toast(permission.reason);
    return permission.allowed;
  }

  function setLayerState(layerId,patch){
    const p=project();if(!p)return false;
    return command("Изменить слой",()=>{
      const layer=layers.layerById(p,layerId);if(!layer)throw new Error("Layer not found");
      const next={...layer,...patch,id:layer.id,system:layer.system};
      if(layer.system)next.name=layer.name;
      const normalized=layers.normalizeLayer(next);
      const index=p.layers.findIndex(item=>String(item.id)===String(layer.id));
      p.layers[index]={...normalized};
      if(p.layers[index].frozen&&String(p.active_layer_id)===String(layer.id)){
        const fallback=p.layers.find(item=>!item.frozen&&item.visible)??p.layers.find(item=>!item.frozen);
        if(fallback)p.active_layer_id=fallback.id;
      }
      return true;
    });
  }
  function createLayer(name){
    const p=project();if(!p)return false;
    return command("Создать слой",()=>{layers.createUserLayer(p,{name,color:"#dce8f5",linetype:"Continuous",lineweight_mm:.25});return true;});
  }
  function deleteLayer(layerId){
    const p=project();if(!p)return false;
    return command("Удалить слой",()=>{
      const replacement=layers.deleteUserLayer(p,layerId,{reassignTo:layers.SYSTEM_LAYER_IDS.tubes});
      const reassign=(object)=>{if(String(object?.layer_id??"")===String(layerId))object.layer_id=replacement.id;};
      for(const tube of p.tubes??[])reassign(tube);
      for(const instance of p.editable_mesh_instances??[])reassign(instance);
      for(const scene of p.referenceScenes??[]){
        reassign(scene);
        const visit=(node)=>{reassign(node);for(const child of node.children??[])visit(child);};
        for(const root of scene.tree??[])visit(root);
      }
      for(const dim of p.engineering_dimensions??[])reassign(dim);
      for(const item of p.construction_geometry??[])reassign(item);
      return true;
    });
  }
  function setActive(layerId){
    const p=project();if(!p)return false;
    return command("Изменить активный слой",()=>{layers.setActiveLayer(p,layerId);return true;});
  }
  function setTreeFilter(layerId){
    const p=project();if(!p)return false;
    p.layer_tree_filter_id=layerId||null;
    try{eng()?.save?.();}catch{}
    decorateTree();render();
    try{window.dispatchEvent(new CustomEvent("tubebender-layer-change",{detail:{project_id:String(p.id??""),filter:true}}));}catch{}
    return true;
  }
  function assignSelection(layerId){
    const p=project();if(!p)return false;
    const targets=[],seen=new Set();
    for(const entry of entries()){
      const target=targetForEntry(entry);if(!target)continue;
      const key=target.kind+":"+target.id;
      if(seen.has(key))continue;
      seen.add(key);targets.push(target);
    }
    if(!targets.length){toast("Нет выбранных объектов для назначения слоя");return false;}
    return command("Назначить слой выбранным объектам",()=>{
      for(const target of targets)layers.assignObjectLayer(p,target.object,layerId);
      return true;
    });
  }

  function currentStyleForEntry(entry){
    const target=targetForEntry(entry);if(!target)return null;
    return layers.resolveObjectStyle(project(),target.object,{kind:target.kind});
  }

  function objectFrom3D(object){
    let item=object;
    const active=String(eng()?.activeTube?.()?.id??"");
    while(item){
      const data=item.userData??{};
      if(data.referenceEditableInstanceId)return {kind:"mesh-instance",instanceId:String(data.referenceEditableInstanceId)};
      if(data.referenceNodeId&&data.referenceSceneId)return {kind:"ref",sceneId:String(data.referenceSceneId),nodeId:String(data.referenceNodeId)};
      if(data.tubeId)return {kind:"tube",tubeId:String(data.tubeId)};
      if(active&&(data.pipe===true||data.originPoint===true||data.tubeEnd===true||Number.isInteger(Number(data.rowIndex))))return {kind:"tube",tubeId:active};
      item=item.parent;
    }
    return null;
  }
  function is3DObjectInteractive(object){
    const entry=objectFrom3D(object);
    if(!entry)return true;
    const visibility=entryVisibility(entry);
    return visibility.selectable===true;
  }
  function cloneMaterialForLayer(object){
    if(!object?.material)return [];
    if(!object.__tbLayerOriginalMaterial){
      object.__tbLayerOriginalMaterial=Array.isArray(object.material)
        ?object.material.map(m=>m?.clone?.()??m)
        :(object.material?.clone?.()??object.material);
    }
    const source=object.__tbLayerOriginalMaterial;
    const clones=(Array.isArray(source)?source:[source]).map(m=>m?.clone?.()??m);
    object.material=Array.isArray(source)?clones:clones[0];
    return clones;
  }
  function applyMaterialStyle(object,style){
    if(!object?.material||!style)return;
    let mats=cloneMaterialForLayer(object);
    if(object.isLine&&style.linetype!=="Continuous"&&typeof THREE!=="undefined"&&THREE.LineDashedMaterial){
      const pattern=style.linetype==="Dotted"
        ?{dashSize:.012,gapSize:.045}
        :style.linetype==="Center"
          ?{dashSize:.11,gapSize:.035}
          :{dashSize:.075,gapSize:.045};
      const dashed=new THREE.LineDashedMaterial({
        color:style.color,
        linewidth:Math.max(1,Number(style.lineweight_mm||.25)*2),
        dashSize:pattern.dashSize,
        gapSize:pattern.gapSize
      });
      object.material=dashed;
      mats=[dashed];
      object.computeLineDistances?.();
    }
    for(const material of mats){
      if(material?.color?.set)material.color.set(style.color);
      if("linewidth" in (material??{}))material.linewidth=Math.max(1,Number(style.lineweight_mm||.25)*2);
      if(material){
        material.userData={...(material.userData??{}),tbLayerLineType:style.linetype,tbLayerLineWeightMm:style.lineweight_mm};
        material.needsUpdate=true;
      }
    }
    object.userData={...(object.userData??{}),tbLayerStyle:clone(style)};
  }
  function applySceneLayers(){
    if(applyingScene||typeof pipeGroup==="undefined"||!pipeGroup||!layers)return;
    applyingScene=true;
    try{
      ensureAssignments();
      pipeGroup.traverse((object)=>{
        if(object===pipeGroup||object.userData?.helper)return;
        const entry=objectFrom3D(object);if(!entry)return;
        const target=targetForEntry(entry);if(!target)return;
        const visibility=layers.layerVisibility(project(),target.object,{kind:target.kind});
        if(object.__tbLayerBaseVisible===undefined)object.__tbLayerBaseVisible=object.visible!==false;
        object.visible=object.__tbLayerBaseVisible&&visibility.visible;
        object.userData={...(object.userData??{}),tbLayerId:visibility.layer_id,tbLayerFrozen:visibility.frozen};
        const style=layers.resolveObjectStyle(project(),target.object,{kind:target.kind});
        applyMaterialStyle(object,style);
      });
      try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
    }finally{applyingScene=false;}
  }

  function treeEntry(row){
    if(row.matches("[data-ref-node]"))return {kind:"ref",sceneId:String(row.dataset.refScene),nodeId:String(row.dataset.refNode)};
    if(row.matches("[data-import-mesh-instance]"))return {kind:"mesh-instance",instanceId:String(row.dataset.importMeshInstance)};
    if(row.matches("[data-tree-tube]"))return {kind:"tube",tubeId:String(row.dataset.treeTube)};
    const active=String(eng()?.activeTube?.()?.id??"");
    if(!active)return null;
    if(row.matches("[data-tree-row]"))return {kind:"row",tubeId:active,rowIndex:Number(row.dataset.treeRow)};
    if(row.matches("[data-tree-origin]"))return {kind:"origin",tubeId:active};
    if(row.matches("[data-tree-end]"))return {kind:"end",tubeId:active};
    if(row.matches("[data-tree-assembly]"))return {kind:"assembly",tubeId:active,assemblyId:String(row.dataset.treeAssembly)};
    if(row.matches("[data-tree-assembly-part]"))return {kind:"assembly-part",tubeId:active,partId:String(row.dataset.treeAssemblyPart)};
    return null;
  }
  function ensureTreeSwatch(row){
    let swatch=row.querySelector(":scope > .tb-layer-swatch, .tb-tree-label > .tb-layer-swatch");
    if(!swatch){
      swatch=document.createElement("span");swatch.className="tb-layer-swatch";
      swatch.style.cssText="display:inline-block;width:8px;height:8px;border-radius:2px;margin-left:5px;vertical-align:middle;border:1px solid rgba(255,255,255,.35)";
      const label=row.querySelector(".tb-tree-label");
      if(label)label.appendChild(swatch);else row.appendChild(swatch);
    }
    return swatch;
  }
  function decorateTree(){
    if(typeof document==="undefined"||!layers)return;
    ensureAssignments();
    const p=project();if(!p)return;
    const filter=String(p.layer_tree_filter_id??"");
    const root=document.getElementById("tbProjectTree")??document;
    for(const row of root.querySelectorAll("[data-ref-node],[data-import-mesh-instance],[data-tree-tube],[data-tree-row],[data-tree-origin],[data-tree-end],[data-tree-assembly],[data-tree-assembly-part]")){
      const entry=treeEntry(row),layer=entry?entryLayer(entry):null,swatch=ensureTreeSwatch(row);
      if(layer){
        swatch.style.background=layer.color;
        swatch.title=layer.name+(layer.frozen?" · Freeze":"")+(layer.locked?" · Lock":"");
        row.dataset.layerId=layer.id;
        row.classList.toggle("tb-layer-frozen",layer.frozen);
        row.classList.toggle("tb-layer-locked",layer.locked);
        row.hidden=!!filter&&String(layer.id)!==filter;
      }else{
        swatch.hidden=true;
      }
    }
  }
  function sanitizeSelection(){
    const keys=ctx()?.selectionKeys?.()??[];
    const allowed=[];
    for(const key of keys){
      const parsed=ctx()?.parseSelectionKey?.(key);
      if(!parsed||entryVisibility(parsed).selectable)allowed.push(key);
    }
    if(allowed.length!==keys.length)ctx()?.replaceSelectionKeys?.(allowed);
  }

  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbLayersStyles";
    style.textContent=
      '#tbLayersToggle{position:fixed;right:92px;top:54px;z-index:120362;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}'+
      '#tbLayersPanel{position:fixed;right:14px;top:88px;width:min(520px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120355;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbLayersPanel.open{display:flex}.tb-layer-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-layer-head .grow{flex:1}.tb-layer-body{overflow:auto;padding:8px}.tb-layer-grid{display:grid;grid-template-columns:28px 28px 28px 28px minmax(120px,1fr) 54px 90px 64px;gap:4px;align-items:center}.tb-layer-grid>*{min-width:0}.tb-layer-row{display:contents}.tb-layer-grid input,.tb-layer-grid select,.tb-layer-tools input,.tb-layer-tools select{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:4px}.tb-layer-grid input[type=color]{padding:1px;width:48px;height:28px}.tb-layer-grid button,.tb-layer-tools button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:4px 6px;cursor:pointer}.tb-layer-tools{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.tb-layer-small{color:#8296aa;font-size:10px}.tb-layer-frozen{opacity:.55}';
    document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbLayersToggle";toggle.type="button";toggle.textContent="Layers";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbLayersPanel";
    panel.innerHTML='<div class="tb-layer-head"><b>Layers</b><span class="grow"></span><button data-layer-close>×</button></div><div class="tb-layer-body" data-layer-body></div>';
    document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");render();};
    panel.querySelector("[data-layer-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }

  function render(){
    const p=project();if(!p||!layers)return;
    ensureAssignments();const root=ensurePanel(),body=root.querySelector("[data-layer-body]");
    const list=p.layers??[];
    const options='<option value="">Все слои</option>'+list.map(layer=>'<option value="'+esc(layer.id)+'" '+(String(p.layer_tree_filter_id??"")===String(layer.id)?"selected":"")+'>'+esc(layer.name)+'</option>').join("");
    body.innerHTML=
      '<div class="tb-layer-tools"><button data-layer-new>+ Layer</button><input data-layer-new-name placeholder="Новый слой"><label>Active</label><select data-active-layer>'+list.map(layer=>'<option value="'+esc(layer.id)+'" '+(String(p.active_layer_id)===String(layer.id)?"selected":"")+'>'+esc(layer.name)+'</option>').join("")+'</select><label>Tree filter</label><select data-layer-filter>'+options+'</select><button data-layer-assign>Назначить выбранным</button></div>'+
      '<div class="tb-layer-grid"><span></span><span>👁</span><span>❄</span><span>🔒</span><b>Layer</b><b>Color</b><b>Line type</b><b>Weight</b>'+
      list.map(layer=>
        '<div class="tb-layer-row">'+
        '<input type="radio" name="tb-active-layer" data-layer-active="'+esc(layer.id)+'" '+(String(p.active_layer_id)===String(layer.id)?"checked":"")+' title="Active">'+
        '<input type="checkbox" data-layer-visible="'+esc(layer.id)+'" '+(layer.visible?"checked":"")+'>'+
        '<input type="checkbox" data-layer-frozen="'+esc(layer.id)+'" '+(layer.frozen?"checked":"")+'>'+
        '<input type="checkbox" data-layer-locked="'+esc(layer.id)+'" '+(layer.locked?"checked":"")+'>'+
        (layer.system?'<span title="System layer">'+esc(layer.name)+' <span class="tb-layer-small">system</span></span>':'<span><input data-layer-name="'+esc(layer.id)+'" value="'+esc(layer.name)+'"><button data-layer-delete="'+esc(layer.id)+'" title="Delete">×</button></span>')+
        '<input type="color" data-layer-color="'+esc(layer.id)+'" value="'+esc(layer.color)+'">'+
        '<select data-layer-linetype="'+esc(layer.id)+'">'+layers.LINETYPES.map(type=>'<option '+(type===layer.linetype?"selected":"")+'>'+type+'</option>').join("")+'</select>'+
        '<input type="number" min="0" max="5" step=".05" data-layer-weight="'+esc(layer.id)+'" value="'+esc(layer.lineweight_mm)+'">'+
        '</div>'
      ).join("")+'</div>';
    body.querySelector("[data-layer-new]").onclick=()=>{
      const name=body.querySelector("[data-layer-new-name]").value.trim()||"Layer";
      createLayer(name);
    };
    body.querySelector("[data-active-layer]").onchange=e=>setActive(e.target.value);
    body.querySelector("[data-layer-filter]").onchange=e=>setTreeFilter(e.target.value||null);
    body.querySelector("[data-layer-assign]").onclick=()=>assignSelection(body.querySelector("[data-active-layer]").value);
    body.querySelectorAll("[data-layer-active]").forEach(el=>el.onchange=()=>setActive(el.dataset.layerActive));
    body.querySelectorAll("[data-layer-visible]").forEach(el=>el.onchange=()=>setLayerState(el.dataset.layerVisible,{visible:el.checked}));
    body.querySelectorAll("[data-layer-frozen]").forEach(el=>el.onchange=()=>setLayerState(el.dataset.layerFrozen,{frozen:el.checked}));
    body.querySelectorAll("[data-layer-locked]").forEach(el=>el.onchange=()=>setLayerState(el.dataset.layerLocked,{locked:el.checked}));
    body.querySelectorAll("[data-layer-color]").forEach(el=>el.onchange=()=>setLayerState(el.dataset.layerColor,{color:el.value}));
    body.querySelectorAll("[data-layer-linetype]").forEach(el=>el.onchange=()=>setLayerState(el.dataset.layerLinetype,{linetype:el.value}));
    body.querySelectorAll("[data-layer-weight]").forEach(el=>el.onchange=()=>setLayerState(el.dataset.layerWeight,{lineweight_mm:Number(el.value)}));
    body.querySelectorAll("[data-layer-name]").forEach(el=>el.onchange=()=>setLayerState(el.dataset.layerName,{name:el.value.trim()}));
    body.querySelectorAll("[data-layer-delete]").forEach(el=>el.onclick=()=>deleteLayer(el.dataset.layerDelete));
  }

  function applyAll(){
    ensureAssignments();applySceneLayers();decorateTree();sanitizeSelection();
    try{window.TubeBenderObjectLocks?.decorateTree?.();}catch{}
    try{window.TubeBenderProperties?.refresh?.();}catch{}
  }
  function observe(){
    observer?.disconnect?.();
    observer=new MutationObserver(()=>{decorateTree();applySceneLayers();});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  async function install(){
    if(installed)return;installed=true;
    try{layers=await import(LAYERS_URL);}catch(error){console.error("Layers runtime failed to load",error);return;}
    ensurePanel();ensureAssignments();observe();applyAll();render();
    try{window.dispatchEvent(new CustomEvent("tubebender-layer-change",{detail:{project_id:String(project()?.id??""),initial:true}}));}catch{}
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))render();});
    window.addEventListener("tubebender-lock-change",()=>applyAll());
    window.TubeBenderLayers=Object.freeze({
      ensure:ensureAssignments,render,applyAll,applySceneLayers,decorateTree,
      entryLayer,entryVisibility,permissionForEntry,permissionForSelection,canSelection,
      is3DObjectInteractive,assignSelection,setActive,setTreeFilter,setLayerState,createLayer,deleteLayer,
      currentStyleForEntry,
      layers:()=>clone(project()?.layers??[]),
      activeLayer:()=>layers.layerById(project(),project()?.active_layer_id),
      layerById:(id)=>layers.layerById(project(),id),
      resolveObjectStyle:(object,kind="tube")=>layers.resolveObjectStyle(project(),object,{kind}),
      domain:layers
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();