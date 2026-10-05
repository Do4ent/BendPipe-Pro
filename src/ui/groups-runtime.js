(()=>{
  const GROUPS_URL="__TB_GROUPS_MODULE_URL__";
  const RIGID_URL="__TB_GROUP_RIGID_MODULE_URL__";
  let installed=false,groups=null,rigid=null,panel=null,toggle=null,observer=null,treeScheduled=false;
  const ctx=()=>window.TubeBenderObjectContext??null;
  const eng=()=>window.TubeBenderEngineering??null;
  const refApi=()=>window.TubeBenderReferenceSceneUi??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const toast=(m)=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const tubeById=(id)=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  const meshById=(id)=>refApi()?.meshInstanceById?.(project(),id)??null;
  const groupById=(id)=>groups?.groupById?.(project(),id)??null;
  const makeId=(prefix)=>{
    const uuid=globalThis.crypto?.randomUUID?.();
    return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  };
  function command(label,mutate){
    const fn=eng()?.modelCommand;
    let ok;
    try{ok=typeof fn==="function"?fn(label,mutate):mutate();}catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    try{window.refreshProjectTree?.();}catch{}
    renderTree();applyVisibility();renderPanel();
    try{window.dispatchEvent(new CustomEvent("tubebender-group-change",{detail:{project_id:String(project()?.id??"")}}));}catch{}
    return true;
  }
  function selectionEntryToRef(entry){
    if(!entry)return null;
    if(["tube","row","origin","end"].includes(entry.kind))return {kind:"tube",id:String(entry.tubeId)};
    if(entry.kind==="mesh-instance")return {kind:"mesh-instance",id:String(entry.instanceId)};
    if(entry.kind==="ref")return {kind:"ref",scene_id:String(entry.sceneId),node_id:String(entry.nodeId)};
    if(entry.kind==="group")return {kind:"group",id:String(entry.groupId)};
    if(entry.kind==="assembly")return {kind:"assembly",tube_id:String(entry.tubeId),assembly_id:String(entry.assemblyId)};
    if(entry.kind==="assembly-part")return {kind:"assembly-part",tube_id:String(entry.tubeId),assembly_id:String(entry.assemblyId??entry.partId)};
    if(entry.kind==="dimension")return {kind:"dimension",id:String(entry.dimensionId??entry.id)};
    if(entry.kind==="construction")return {kind:"construction",id:String(entry.constructionId??entry.id)};
    return null;
  }
  function selectionRefs(){
    const map=new Map();
    for(const entry of entries()){
      const ref=selectionEntryToRef(entry);if(!ref)continue;
      map.set(groups.groupMemberKey(ref),ref);
    }
    return [...map.values()];
  }
  function entryFromRef(ref){
    if(ref.kind==="tube")return {kind:"tube",tubeId:String(ref.id)};
    if(ref.kind==="mesh-instance")return {kind:"mesh-instance",instanceId:String(ref.id)};
    if(ref.kind==="ref")return {kind:"ref",sceneId:String(ref.scene_id),nodeId:String(ref.node_id)};
    if(ref.kind==="group")return {kind:"group",groupId:String(ref.id)};
    if(ref.kind==="assembly")return {kind:"assembly",tubeId:String(ref.tube_id),assemblyId:String(ref.assembly_id)};
    if(ref.kind==="assembly-part")return {kind:"assembly-part",tubeId:String(ref.tube_id),assemblyId:String(ref.assembly_id)};
    if(ref.kind==="dimension")return {kind:"dimension",dimensionId:String(ref.id)};
    if(ref.kind==="construction")return {kind:"construction",constructionId:String(ref.id)};
    return null;
  }
  function memberSelectionKey(ref){
    if(ref.kind==="tube")return "tube:"+encodeURIComponent(ref.id);
    if(ref.kind==="mesh-instance")return "mesh:"+encodeURIComponent(ref.id);
    if(ref.kind==="ref")return "ref:"+encodeURIComponent(ref.scene_id)+":"+encodeURIComponent(ref.node_id);
    if(ref.kind==="group")return "group:"+encodeURIComponent(ref.id);
    return "";
  }
  function directGroupsForEntry(entry){
    const ref=selectionEntryToRef(entry);if(!ref||!groups)return [];
    return groups.groupsContainingMember(project(),ref,{includeAncestors:false});
  }
  function containingGroupsForEntry(entry){
    const ref=selectionEntryToRef(entry);if(!ref||!groups)return [];
    return groups.groupsContainingMember(project(),ref,{includeAncestors:true});
  }
  function primaryGroupForEntry(entry){
    const direct=directGroupsForEntry(entry);
    return direct[0]??null;
  }
  function permissionForEntry(entry,action){
    const list=entry?.kind==="group"
      ?[groupById(entry.groupId),...groups.groupDescendantIds(project(),entry.groupId).map(groupById)].filter(Boolean)
      :containingGroupsForEntry(entry);
    const policy=window.TubeBenderObjectLocks?.policy;
    if(!policy)return {allowed:true,code:"GROUP_ALLOWED",reason:null};
    for(const group of list){
      const permission=policy.lockPermission(group,action);
      if(!permission.allowed)return {...permission,group_id:String(group.id)};
    }
    return {allowed:true,code:"GROUP_ALLOWED",reason:null};
  }
  function canSelection(action,{notify=true}={}){
    for(const entry of entries()){
      const permission=permissionForEntry(entry,action);
      if(!permission.allowed){if(notify)toast(permission.reason);return false;}
    }
    return true;
  }
  function createFromSelection(name="Group"){
    const refs=selectionRefs();if(!refs.length){toast("Выберите объекты для Group");return false;}
    return command("Создать Group",()=>{groups.createGroup(project(),{name,members:refs});return true;});
  }
  function rename(groupId,name){
    return command("Переименовать Group",()=>{groups.renameGroup(project(),groupId,name);return true;});
  }
  function addSelection(groupId){
    const refs=selectionRefs().filter(ref=>!(ref.kind==="group"&&String(ref.id)===String(groupId)));
    if(!refs.length){toast("Нет объектов для добавления");return false;}
    return command("Добавить объекты в Group",()=>{groups.addGroupMembers(project(),groupId,refs);return true;});
  }
  function removeSelection(groupId){
    const refs=selectionRefs();if(!refs.length){toast("Нет объектов для удаления из Group");return false;}
    return command("Удалить объекты из Group",()=>{groups.removeGroupMembers(project(),groupId,refs);return true;});
  }
  function ungroup(groupId){
    return command("Ungroup",()=>groups.ungroup(project(),groupId)!==false);
  }
  function setVisible(groupId,visible){
    return command(visible?"Показать Group":"Скрыть Group",()=>{groups.setGroupVisibility(project(),groupId,visible);return true;});
  }
  function setLock(groupId,mode){
    return command(mode==="Unlocked"?"Разблокировать Group":mode==="Object"?"Lock Object Group":"Lock Position Group",()=>{groups.setGroupLock(project(),groupId,mode);return true;});
  }
  function leafRefs(groupId){return groups.leafGroupMembers(project(),groupId);}
  function replaceGroupMemberRef(oldRef,newRef){
    const oldKey=groups.groupMemberKey(oldRef);
    for(const group of groups.ensureGroupState(project())){
      group.members=(group.members??[]).map(ref=>groups.groupMemberKey(ref)===oldKey?clone(newRef):ref);
    }
  }
  function convertRefToMesh(ref){
    const created=refApi()?.ensureEditableMeshInstanceByRef?.(project(),ref.scene_id,ref.node_id);
    if(!created)throw new Error("Не удалось создать Editable Mesh Instance для Source");
    const next={kind:"mesh-instance",id:String(created.id)};
    replaceGroupMemberRef(ref,next);
    return next;
  }
  function applyTubeResult(tube,result){
    if(result?.status!=="exact"||!result.tube)throw new Error(result?.reason??"Group transform failed");
    for(const key of Object.keys(tube))delete tube[key];
    Object.assign(tube,clone(result.tube));
  }
  function moveLeaf(ref,delta){
    if(ref.kind==="ref")ref=convertRefToMesh(ref);
    if(ref.kind==="tube"){
      const tube=tubeById(ref.id);if(!tube)return;
      applyTubeResult(tube,rigid.translateLegacyTubeRigid(tube,delta));return;
    }
    if(ref.kind==="mesh-instance"){refApi()?.moveEditableMeshInstance?.(project(),ref.id,delta);return;}
    if(ref.kind==="construction"){
      const item=(project()?.construction_geometry??[]).find(x=>String(x?.id)===String(ref.id));if(!item)return;
      const key=item.position_mm?"position_mm":item.origin?"origin":null;
      if(key){
        const p=item[key]??{};item[key]={x:Number(p.x||0)+delta.x,y:Number(p.y||0)+delta.y,z:Number(p.z||0)+delta.z};
      }
    }
  }
  function memberPoint(ref){
    if(ref.kind==="ref")return null;
    if(ref.kind==="tube")return clone(tubeById(ref.id)?.origin??null);
    if(ref.kind==="mesh-instance")return clone(meshById(ref.id)?.transform?.position_mm??null);
    if(ref.kind==="construction"){
      const item=(project()?.construction_geometry??[]).find(x=>String(x?.id)===String(ref.id));
      return clone(item?.position_mm??item?.origin??null);
    }
    return null;
  }
  function groupPivot(groupId){
    const points=leafRefs(groupId).map(memberPoint).filter(p=>p&&[p.x,p.y,p.z].every(Number.isFinite));
    if(!points.length)return {x:0,y:0,z:0};
    return points.reduce((a,p)=>({x:a.x+p.x/points.length,y:a.y+p.y/points.length,z:a.z+p.z/points.length}),{x:0,y:0,z:0});
  }
  function rotatePoint(point,axis,center,angleDeg){
    const x=Number(axis.x)||0,y=Number(axis.y)||0,z=Number(axis.z)||0,len=Math.hypot(x,y,z);
    if(!(len>1e-12))throw new Error("Rotation axis is invalid");
    const u={x:x/len,y:y/len,z:z/len},a=angleDeg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const p={x:point.x-center.x,y:point.y-center.y,z:point.z-center.z};
    const dot=u.x*p.x+u.y*p.y+u.z*p.z;
    const cross={x:u.y*p.z-u.z*p.y,y:u.z*p.x-u.x*p.z,z:u.x*p.y-u.y*p.x};
    return {
      x:center.x+p.x*c+cross.x*s+u.x*dot*(1-c),
      y:center.y+p.y*c+cross.y*s+u.y*dot*(1-c),
      z:center.z+p.z*c+cross.z*s+u.z*dot*(1-c)
    };
  }
  function rotateLeaf(ref,axis,center,angleDeg){
    if(ref.kind==="ref")ref=convertRefToMesh(ref);
    if(ref.kind==="tube"){
      const tube=tubeById(ref.id);if(!tube)return;
      applyTubeResult(tube,rigid.rotateLegacyTubeRigid(tube,{axis,center,angle_deg:angleDeg}));return;
    }
    if(ref.kind==="mesh-instance"){
      const instance=meshById(ref.id);if(!instance)return;
      const p=instance.transform?.position_mm??{x:0,y:0,z:0};
      const next=rotatePoint(p,axis,center,angleDeg);
      refApi()?.moveEditableMeshInstance?.(project(),ref.id,{x:next.x-p.x,y:next.y-p.y,z:next.z-p.z});
      refApi()?.rotateEditableMeshInstanceAxis?.(project(),ref.id,{axis,angle_deg:angleDeg});
    }
  }
  function moveGroup(groupId,delta){
    if(permissionForEntry({kind:"group",groupId},"move").allowed===false){toast("Объект заблокирован");return false;}
    const d={x:Number(delta?.x)||0,y:Number(delta?.y)||0,z:Number(delta?.z)||0};
    return command("Move Group",()=>{for(const ref of leafRefs(groupId))moveLeaf(ref,d);return true;});
  }
  function rotateGroup(groupId,{axis={x:0,y:0,z:1},angle_deg=0,center=null}={}){
    if(permissionForEntry({kind:"group",groupId},"rotate").allowed===false){toast("Объект заблокирован");return false;}
    const pivot=center??groupPivot(groupId),angle=Number(angle_deg);
    if(!Number.isFinite(angle))return false;
    return command("Rotate Group",()=>{for(const ref of leafRefs(groupId))rotateLeaf(ref,axis,pivot,angle);return true;});
  }
  function uniqueTubeName(base){
    const used=new Set((project()?.tubes??[]).map(t=>String(t?.name??"")));
    let name=String(base||"Tube")+" Copy",n=2;
    while(used.has(name))name=String(base||"Tube")+" Copy "+n++;
    return name;
  }
  function cloneTubeForGroup(source,offset,idMap){
    let copy=clone(source);
    const moved=rigid.translateLegacyTubeRigid(copy,offset);
    if(moved.status!=="exact")throw new Error(moved.reason??"Group Copy failed");
    copy=clone(moved.tube);
    const oldId=String(source.id),newId=makeId("tube");
    copy.id=newId;idMap.set(oldId,newId);copy.name=uniqueTubeName(source.name);copy.partNumber="";
    if(Array.isArray(copy.rows))copy.rows=copy.rows.map(row=>({...row,elementId:row?.elementId?makeId("element"):row?.elementId}));
    delete copy.array_member;delete copy.mirror_member;delete copy.transform_stack_member;delete copy.lock_state;
    return copy;
  }
  function remapTubeDependencies(tube,idMap){
    if(tube?.engineering?.ports){
      for(const port of Object.values(tube.engineering.ports)){
        const old=String(port?.ownerObjectId??port?.externalRefId??"");
        if(old&&idMap.has(old)){
          const next=idMap.get(old);
          if(port.ownerObjectId)port.ownerObjectId=next;
          if(port.externalRefId)port.externalRefId=next;
        }
      }
    }
  }
  function cloneDimension(dim,idMap){
    const copy=clone(dim);copy.id=makeId("dimension");
    if(Array.isArray(copy.references))copy.references=copy.references.map(ref=>({...ref,object_id:idMap.get(String(ref.object_id))??ref.object_id}));
    return copy;
  }
  function copyGroup(groupId,{offset_mm={x:0,y:0,z:0},name=null}={}){
    const source=groupById(groupId);if(!source)return false;
    if(permissionForEntry({kind:"group",groupId},"copy").allowed===false){toast("Объект заблокирован");return false;}
    const offset={x:Number(offset_mm.x)||0,y:Number(offset_mm.y)||0,z:Number(offset_mm.z)||0};
    let newTopId=null;
    const mutate=()=>{
      const idMap=new Map(),memberMap=new Map();
      const leaves=leafRefs(groupId);
      for(const ref of leaves){
        if(ref.kind==="tube"){
          const tube=tubeById(ref.id);if(!tube)continue;
          const copy=cloneTubeForGroup(tube,offset,idMap);project().tubes.push(copy);
          memberMap.set(groups.groupMemberKey(ref),{kind:"tube",id:String(copy.id)});
        }else if(ref.kind==="mesh-instance"){
          const copy=refApi()?.copyEditableMeshInstance?.(project(),ref.id,{offset_mm:offset});
          if(copy)memberMap.set(groups.groupMemberKey(ref),{kind:"mesh-instance",id:String(copy.id)});
        }else if(ref.kind==="ref"){
          const copy=refApi()?.createEditableMeshInstanceByRef?.(project(),ref.scene_id,ref.node_id,{position_mm:offset});
          if(copy)memberMap.set(groups.groupMemberKey(ref),{kind:"mesh-instance",id:String(copy.id)});
        }else if(ref.kind==="dimension"){
          const dim=(project().engineering_dimensions??[]).find(x=>String(x?.id)===String(ref.id));
          if(dim){
            const copied=cloneDimension(dim,idMap);
            project().engineering_dimensions=[...(project().engineering_dimensions??[]),copied];
            memberMap.set(groups.groupMemberKey(ref),{kind:"dimension",id:String(copied.id)});
          }
        }
      }
      for(const newId of idMap.values()){const tube=tubeById(newId);if(tube)remapTubeDependencies(tube,idMap);}
      const copyRecursive=(oldId,isTop=false)=>{
        const old=groupById(oldId);if(!old)throw new Error("Group not found");
        const newGroup=groups.createGroup(project(),{name:isTop?(name??old.name+" Copy"):old.name+" Copy",members:[]});
        for(const ref of old.members??[]){
          if(ref.kind==="group"){
            const child=copyRecursive(ref.id,false);groups.addGroupMembers(project(),newGroup.id,[{kind:"group",id:child.id}]);
          }else{
            const mapped=memberMap.get(groups.groupMemberKey(ref));
            if(mapped)groups.addGroupMembers(project(),newGroup.id,[mapped]);
          }
        }
        return newGroup;
      };
      newTopId=copyRecursive(groupId,true).id;return true;
    };
    const ok=command("Copy Group",mutate);
    if(ok&&newTopId)ctx()?.replaceSelectionKeys?.(["group:"+encodeURIComponent(newTopId)]);
    return ok?newTopId:false;
  }
  function arrayGroup(groupId,{count=2,step_mm={x:100,y:0,z:0}}={}){
    const n=Math.trunc(Number(count));if(!(n>=2)){toast("Count должен быть ≥ 2");return false;}
    const created=[];
    for(let index=1;index<n;index++){
      const id=copyGroup(groupId,{offset_mm:{x:(Number(step_mm.x)||0)*index,y:(Number(step_mm.y)||0)*index,z:(Number(step_mm.z)||0)*index},name:(groupById(groupId)?.name??"Group")+" ["+(index+1)+"]"});
      if(id)created.push(id);
    }
    return created;
  }
  function hiddenLeafKeys(){
    const hidden=new Set();
    for(const group of groups.ensureGroupState(project())){
      if(group.visible!==false)continue;
      for(const ref of groups.leafGroupMembers(project(),group.id))hidden.add(groups.groupMemberKey(ref));
    }
    return hidden;
  }
  function objectMemberKey(object){
    let item=object,active=String(eng()?.activeTube?.()?.id??"");
    while(item){
      const data=item.userData??{};
      if(data.referenceEditableInstanceId)return "mesh-instance:"+String(data.referenceEditableInstanceId);
      if(data.referenceNodeId&&data.referenceSceneId)return "ref:"+String(data.referenceSceneId)+"|"+String(data.referenceNodeId);
      if(data.tubeId)return "tube:"+String(data.tubeId);
      if(active&&(data.pipe===true||data.originPoint===true||data.tubeEnd===true||Number.isInteger(Number(data.rowIndex))))return "tube:"+active;
      item=item.parent;
    }
    return null;
  }
  function applyVisibility(){
    if(typeof pipeGroup==="undefined"||!pipeGroup||!groups)return;
    const hidden=hiddenLeafKeys();
    pipeGroup.traverse(object=>{
      if(object===pipeGroup||object.userData?.helper)return;
      const key=objectMemberKey(object);if(!key)return;
      object.userData={...(object.userData??{}),tbGroupHidden:hidden.has(key)};
      if(hidden.has(key))object.visible=false;
    });
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function groupTreeHtml(groupId,depth=0,seen=new Set()){
    const group=groupById(groupId);if(!group||seen.has(String(groupId)))return "";
    seen.add(String(groupId));
    const pad=30+depth*18,lock=String(group.lock_state?.mode??"Unlocked");
    let html='<div class="tb-tree-node clickable tb-project-group" style="padding-left:'+pad+'px" data-project-group="'+esc(group.id)+'"><span class="tb-tree-icon">▣</span><span class="tb-tree-label">'+esc(group.name)+' <small>· '+(group.members?.length??0)+' · '+(group.visible===false?'hidden':'visible')+(lock!=="Unlocked"?' · '+esc(lock):'')+'</small></span></div>';
    for(const ref of group.members??[]){
      if(ref.kind==="group"){html+=groupTreeHtml(ref.id,depth+1,seen);continue;}
      const selectionKey=memberSelectionKey(ref);
      html+='<div class="tb-tree-node clickable tb-group-member" style="padding-left:'+(pad+18)+'px" data-group-member-key="'+esc(selectionKey)+'" data-group-owner="'+esc(group.id)+'"><span class="tb-tree-icon">·</span><span class="tb-tree-label">'+esc(groups.groupMemberKey(ref))+'</span></div>';
    }
    seen.delete(String(groupId));return html;
  }
  function renderTree(){
    const host=document.getElementById("tbProjectTree");if(!host||!groups)return;
    const signature=JSON.stringify(groups.ensureGroupState(project()).map(group=>({id:group.id,name:group.name,members:group.members,visible:group.visible,lock_state:group.lock_state})));
    let section=host.querySelector("[data-groups-tree-root]");
    if(section?.dataset.signature===signature)return;
    if(!section){section=document.createElement("div");section.dataset.groupsTreeRoot="1";host.appendChild(section);}
    section.dataset.signature=signature;
    const all=groups.ensureGroupState(project()),nested=new Set(all.flatMap(group=>(group.members??[]).filter(ref=>ref.kind==="group").map(ref=>String(ref.id))));
    const roots=all.filter(group=>!nested.has(String(group.id)));
    section.innerHTML='<div class="tb-tree-node level1"><span class="tb-tree-icon">▾</span><span class="tb-tree-label">▣ Groups <small>· '+all.length+'</small></span></div>'+roots.map(group=>groupTreeHtml(group.id)).join("");
    try{ctx()?.decorateProjectTreeAsTreeView?.();}catch{}
    try{window.TubeBenderObjectLocks?.decorateTree?.();}catch{}
    try{window.TubeBenderLayers?.decorateTree?.();}catch{}
  }
  function scheduleTree(){if(treeScheduled)return;treeScheduled=true;queueMicrotask(()=>{treeScheduled=false;renderTree();});}
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbGroupsStyles";style.textContent='#tbGroupsToggle{position:fixed;right:160px;top:54px;z-index:120364;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbGroupsPanel{position:fixed;right:14px;top:88px;width:min(400px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120357;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbGroupsPanel.open{display:flex}.tb-group-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-group-head .grow{flex:1}.tb-group-body{overflow:auto;padding:8px}.tb-group-grid{display:grid;grid-template-columns:120px 1fr;gap:6px 8px;align-items:center}.tb-group-grid input,.tb-group-grid select{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-group-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.tb-group-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 7px;cursor:pointer}.tb-group-note{color:#8396aa;line-height:1.35;margin-top:6px}';document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbGroupsToggle";toggle.textContent="Groups";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbGroupsPanel";panel.innerHTML='<div class="tb-group-head"><b>Groups</b><span class="grow"></span><button data-group-close>×</button></div><div class="tb-group-body" data-group-body></div>';document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderPanel();};
    panel.querySelector("[data-group-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function renderPanel(){
    if(!groups)return;const p=project();if(!p)return;const root=ensurePanel(),body=root.querySelector("[data-group-body]");
    const list=groups.ensureGroupState(p),selected=entries().find(entry=>entry.kind==="group"),selectedId=selected?.groupId??list[0]?.id??"",g=selectedId?groupById(selectedId):null;
    const opts='<option value="">—</option>'+list.map(item=>'<option value="'+esc(item.id)+'" '+(String(item.id)===String(selectedId)?'selected':'')+'>'+esc(item.name)+'</option>').join("");
    body.innerHTML='<div class="tb-group-grid"><label>Group</label><select data-group-select>'+opts+'</select><label>Name</label><input data-group-name value="'+esc(g?.name??"Group")+'"><label>Visible</label><input data-group-visible type="checkbox" '+(g?.visible!==false?'checked':'')+'><label>Lock</label><select data-group-lock><option>Unlocked</option><option '+(g?.lock_state?.mode==="Position"?'selected':'')+'>Position</option><option '+(g?.lock_state?.mode==="Object"?'selected':'')+'>Object</option></select><label>Move XYZ</label><input data-group-move value="0;0;0"><label>Rotate Z°</label><input data-group-angle value="0"><label>Array count</label><input data-group-count value="3"><label>Array step XYZ</label><input data-group-step value="100;0;0"></div>'+
      '<div class="tb-group-actions"><button data-group-create>Создать из выбора</button><button data-group-rename '+(!g?'disabled':'')+'>Rename</button><button data-group-add '+(!g?'disabled':'')+'>Add selection</button><button data-group-remove '+(!g?'disabled':'')+'>Remove selection</button><button data-group-ungroup '+(!g?'disabled':'')+'>Ungroup</button></div>'+
      '<div class="tb-group-actions"><button data-group-move-run '+(!g?'disabled':'')+'>Move</button><button data-group-rotate-run '+(!g?'disabled':'')+'>Rotate</button><button data-group-copy-run '+(!g?'disabled':'')+'>Copy</button><button data-group-array-run '+(!g?'disabled':'')+'>Array</button></div><div class="tb-group-note">Group — логическая структура: геометрия и внутренние зависимости объектов не объединяются и не теряются.</div>';
    body.querySelector("[data-group-select]").onchange=e=>{ctx()?.replaceSelectionKeys?.(e.target.value?["group:"+encodeURIComponent(e.target.value)]:[]);renderPanel();};
    body.querySelector("[data-group-create]").onclick=()=>createFromSelection(body.querySelector("[data-group-name]").value);
    if(!g)return;
    body.querySelector("[data-group-rename]").onclick=()=>rename(g.id,body.querySelector("[data-group-name]").value);
    body.querySelector("[data-group-add]").onclick=()=>addSelection(g.id);
    body.querySelector("[data-group-remove]").onclick=()=>removeSelection(g.id);
    body.querySelector("[data-group-ungroup]").onclick=()=>ungroup(g.id);
    body.querySelector("[data-group-visible]").onchange=e=>setVisible(g.id,e.target.checked);
    body.querySelector("[data-group-lock]").onchange=e=>setLock(g.id,e.target.value);
    const vec=(selector)=>{const parts=body.querySelector(selector).value.replace(/,/g,".").split(";").map(Number);return {x:parts[0]||0,y:parts[1]||0,z:parts[2]||0};};
    body.querySelector("[data-group-move-run]").onclick=()=>moveGroup(g.id,vec("[data-group-move]"));
    body.querySelector("[data-group-rotate-run]").onclick=()=>rotateGroup(g.id,{axis:{x:0,y:0,z:1},angle_deg:Number(body.querySelector("[data-group-angle]").value.replace(",","."))||0});
    body.querySelector("[data-group-copy-run]").onclick=()=>copyGroup(g.id,{offset_mm:vec("[data-group-step]")});
    body.querySelector("[data-group-array-run]").onclick=()=>arrayGroup(g.id,{count:Number(body.querySelector("[data-group-count]").value),step_mm:vec("[data-group-step]")});
  }
  function observe(){
    observer?.disconnect?.();observer=new MutationObserver(()=>scheduleTree());observer.observe(document.body,{childList:true,subtree:true});
  }
  async function install(){
    if(installed)return;installed=true;
    try{[groups,rigid]=await Promise.all([import(GROUPS_URL),import(RIGID_URL)]);}catch(error){console.error("Groups runtime failed",error);return;}
    groups.ensureGroupState(project());ensurePanel();renderTree();renderPanel();applyVisibility();observe();
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))renderPanel();});
    window.addEventListener("tubebender-layer-change",()=>applyVisibility());
    window.TubeBenderGroups=Object.freeze({
      createFromSelection,rename,addSelection,removeSelection,ungroup,setVisible,setLock,
      moveGroup,rotateGroup,copyGroup,arrayGroup,renderTree,renderPanel,applyVisibility,
      groupById,leafRefs,directGroupsForEntry,containingGroupsForEntry,primaryGroupForEntry,permissionForEntry,canSelection,
      domain:groups
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();