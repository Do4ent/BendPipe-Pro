(()=>{
  const ASSEMBLIES_URL="__TB_ASSEMBLIES_MODULE_URL__";
  const RIGID_URL="__TB_ASSEMBLY_RIGID_MODULE_URL__";
  let installed=false,assemblies=null,rigid=null,panel=null,toggle=null,observer=null,treeScheduled=false,breadcrumbBar=null;
  const editPath=[];
  const ctx=()=>window.TubeBenderObjectContext??null;
  const eng=()=>window.TubeBenderEngineering??null;
  const refApi=()=>window.TubeBenderReferenceSceneUi??null;
  const layerApi=()=>window.TubeBenderLayers??null;
  const lockPolicy=()=>window.TubeBenderObjectLocks?.policy??null;
  const project=()=>{try{return eng()?.activeProject?.()??null;}catch{return null;}};
  const entries=()=>ctx()?.selectionEntries?.()??[];
  const clone=(v)=>v==null?v:structuredClone(v);
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const toast=(m)=>{try{eng()?.toast?.(String(m??""));}catch{}};
  const tubeById=(id)=>(project()?.tubes??[]).find(t=>String(t?.id)===String(id))??null;
  const meshById=(id)=>refApi()?.meshInstanceById?.(project(),id)??null;
  const assemblyById=(id)=>assemblies?.assemblyById?.(project(),id)??null;
  function command(label,mutate,{wholeObject=false}={}){
    const fn=wholeObject?(eng()?.wholeObjectCommand??eng()?.modelCommand):eng()?.modelCommand;let ok;
    try{ok=typeof fn==="function"?fn(label,mutate):mutate();}
    catch(error){toast(error?.message??error);return false;}
    if(ok===false)return false;
    try{eng()?.save?.();eng()?.renderAll?.();}catch{}
    try{window.refreshProjectTree?.();}catch{}
    renderTree();applyVisibility();applyEditContext();renderPanel();renderBreadcrumb();
    try{window.dispatchEvent(new CustomEvent("tubebender-assembly-change",{detail:{project_id:String(project()?.id??"")}}));}catch{}
    return true;
  }
  function refFromEntry(entry){
    if(!entry)return null;
    if(["tube","row","origin","end"].includes(entry.kind))return {kind:"tube",id:String(entry.tubeId)};
    if(entry.kind==="mesh-instance")return {kind:"mesh-instance",id:String(entry.instanceId)};
    if(entry.kind==="construction")return {kind:"construction",id:String(entry.constructionId??entry.id)};
    if(entry.kind==="dimension")return {kind:"dimension",id:String(entry.dimensionId??entry.id)};
    if(entry.kind==="project-assembly")return {kind:"assembly",id:String(entry.assemblyId)};
    if(entry.kind==="ref")return {kind:"source-ref",scene_id:String(entry.sceneId),node_id:String(entry.nodeId)};
    return null;
  }
  function entryFromRef(ref){
    if(ref.kind==="tube")return {kind:"tube",tubeId:String(ref.id)};
    if(ref.kind==="mesh-instance")return {kind:"mesh-instance",instanceId:String(ref.id)};
    if(ref.kind==="construction")return {kind:"construction",constructionId:String(ref.id)};
    if(ref.kind==="dimension")return {kind:"dimension",dimensionId:String(ref.id)};
    if(ref.kind==="assembly")return {kind:"project-assembly",assemblyId:String(ref.id)};
    return null;
  }
  function selectionKeyForRef(ref){
    if(ref.kind==="tube")return "tube:"+encodeURIComponent(ref.id);
    if(ref.kind==="mesh-instance")return "mesh:"+encodeURIComponent(ref.id);
    if(ref.kind==="assembly")return "project-assembly:"+encodeURIComponent(ref.id);
    return "";
  }
  function directAssembliesForRef(ref){
    if(!ref||ref.kind==="source-ref")return [];
    return assemblies.assembliesContainingMember(project(),ref,{includeAncestors:false});
  }
  function directTubeAssembly(tubeOrId){
    const id=String(typeof tubeOrId==="object"?tubeOrId?.id:tubeOrId??"");
    if(!id)return null;
    return directAssembliesForRef({kind:"tube",id})[0]??null;
  }
  function portWorldPosition(tube,portName){
    const port=tube?.engineering?.ports?.[portName];
    if(port?.position&&[port.position.x,port.position.y,port.position.z].every(Number.isFinite))return clone(port.position);
    if(portName==="P1"&&tube?.origin)return clone(tube.origin);
    return null;
  }
  function setPortAssemblyConstraint(tube,portName,parent,worldPosition){
    const port=tube?.engineering?.ports?.[portName];if(!port)return null;
    if(!parent||!worldPosition){delete port.assembly_constraint;return null;}
    const constraint={
      schema:"assembly_port_constraint_v1",
      assembly_id:String(parent.id),
      local_position_mm:{...assemblies.worldToLocalPoint(parent.frame,worldPosition)}
    };
    port.assembly_constraint=constraint;
    return constraint;
  }
  function syncTubePortConstraints(tubeOrId){
    const tube=typeof tubeOrId==="object"?tubeOrId:tubeById(tubeOrId);
    if(!tube?.engineering?.ports)return null;
    const parent=directTubeAssembly(tube);
    const p1=tube.engineering.ports.P1,p2=tube.engineering.ports.P2;
    if(p1){
      p1.locked=true;
      const world=portWorldPosition(tube,"P1")??clone(tube.origin??{x:0,y:0,z:0});
      p1.position=clone(world);
      setPortAssemblyConstraint(tube,"P1",parent,world);
    }
    if(p2){
      if(p2.locked===true)setPortAssemblyConstraint(tube,"P2",parent,portWorldPosition(tube,"P2"));
      else delete p2.assembly_constraint;
    }
    return {assembly_id:parent?String(parent.id):null,p1:clone(p1?.assembly_constraint??null),p2:clone(p2?.assembly_constraint??null)};
  }
  function captureTubeEndConstraint(tubeOrId){
    const tube=typeof tubeOrId==="object"?tubeOrId:tubeById(tubeOrId);
    const p2=tube?.engineering?.ports?.P2;
    if(!tube||p2?.locked!==true||!p2?.position)return null;
    const parent=directTubeAssembly(tube);if(!parent)return null;
    const stored=p2.assembly_constraint;
    return clone(stored&&String(stored.assembly_id)===String(parent.id)&&stored.local_position_mm
      ?stored
      :{schema:"assembly_port_constraint_v1",assembly_id:String(parent.id),local_position_mm:{...assemblies.worldToLocalPoint(parent.frame,p2.position)}});
  }
  function resolveTubeEndConstraintTarget(constraint,tubeOrId=null){
    if(!constraint?.assembly_id||!constraint?.local_position_mm)return null;
    const parent=assemblyById(constraint.assembly_id);if(!parent)return null;
    const tube=tubeOrId?(typeof tubeOrId==="object"?tubeOrId:tubeById(tubeOrId)):null;
    if(tube){
      const directParent=directTubeAssembly(tube);
      if(!directParent||String(directParent.id)!==String(parent.id))return null;
    }
    return {
      space:"assembly-local",
      assembly_id:String(parent.id),
      local_position_mm:clone(constraint.local_position_mm),
      position:{...assemblies.localToWorldPoint(parent.frame,constraint.local_position_mm)}
    };
  }
  function clearTubePortConstraint(tubeOrId,portName="P2"){
    const tube=typeof tubeOrId==="object"?tubeOrId:tubeById(tubeOrId),port=tube?.engineering?.ports?.[portName];
    if(port)delete port.assembly_constraint;
    return !!port;
  }
  function containingAssembliesForEntry(entry){
    const ref=refFromEntry(entry);if(!ref||ref.kind==="source-ref")return [];
    return assemblies.assembliesContainingMember(project(),ref,{includeAncestors:true});
  }
  function parentAssemblyForEntry(entry){
    const direct=containingAssembliesForEntry(entry).filter(parent=>{
      const ref=refFromEntry(entry);
      return (parent.members??[]).some(member=>assemblies.assemblyMemberKey(member.ref)===assemblies.assemblyMemberKey(ref));
    });
    return direct[0]??null;
  }
  function activeEditAssembly(){return editPath.length?assemblyById(editPath[editPath.length-1]):null;}
  function editing(){return !!activeEditAssembly();}
  function breadcrumb(){
    return ["Project",...editPath.map(id=>assemblyById(id)?.name??id)].join(" > ");
  }
  function topAssemblyForEntry(entry){
    const list=containingAssembliesForEntry(entry);
    return list.length?list[list.length-1]:null;
  }
  function directMemberEntry(active,entry){
    if(!active||!entry)return null;
    if(entry.kind==="project-assembly"&&String(entry.assemblyId)===String(active.id))return entry;
    const ref=refFromEntry(entry);
    if(!ref||ref.kind==="source-ref")return null;
    const key=assemblies.assemblyMemberKey(ref);
    for(const member of active.members??[]){
      if(assemblies.assemblyMemberKey(member.ref)===key)return entry;
      if(member.ref.kind!=="assembly")continue;
      if(ref.kind==="assembly"&&String(ref.id)===String(member.ref.id))return {kind:"project-assembly",assemblyId:String(member.ref.id)};
      const nested=assemblies.assembliesContainingMember(project(),ref,{includeAncestors:true});
      if(nested.some(item=>String(item.id)===String(member.ref.id))){
        return {kind:"project-assembly",assemblyId:String(member.ref.id)};
      }
    }
    return null;
  }
  function entryKey(entry,fallback=""){
    if(entry?.kind==="project-assembly")return "project-assembly:"+encodeURIComponent(entry.assemblyId);
    if(entry?.kind==="tube")return "tube:"+encodeURIComponent(entry.tubeId);
    if(entry?.kind==="mesh-instance")return "mesh:"+encodeURIComponent(entry.instanceId);
    return fallback;
  }
  function resolveInteraction(entry,originalKey=""){
    if(!entry)return {handled:false,key:originalKey,entry};
    const active=activeEditAssembly();
    if(!active){
      const top=entry.kind==="project-assembly"?assemblyById(entry.assemblyId):topAssemblyForEntry(entry);
      if(top)return {handled:true,key:"project-assembly:"+encodeURIComponent(top.id),entry:{kind:"project-assembly",assemblyId:String(top.id)}};
      return {handled:false,key:originalKey,entry};
    }
    const direct=directMemberEntry(active,entry);
    if(!direct)return {handled:true,blocked:true,key:null,entry:null};
    return {handled:true,key:entryKey(direct,originalKey),entry:direct};
  }
  function assemblyForEditEntry(entry){
    if(!entry)return null;
    if(entry.kind==="project-assembly")return assemblyById(entry.assemblyId);
    const active=activeEditAssembly();
    if(active){
      const direct=directMemberEntry(active,entry);
      return direct?.kind==="project-assembly"?assemblyById(direct.assemblyId):null;
    }
    return topAssemblyForEntry(entry);
  }
  function enterEdit(assemblyId){
    const target=assemblyById(assemblyId);if(!target)return false;
    const active=activeEditAssembly();
    if(active){
      const allowed=(active.members??[]).some(member=>member.ref.kind==="assembly"&&String(member.ref.id)===String(target.id));
      if(!allowed){toast("Вложенная Assembly не принадлежит текущему уровню");return false;}
      editPath.push(String(target.id));
    }else{
      const parents=assemblies.assembliesContainingMember(project(),{kind:"assembly",id:target.id},{includeAncestors:true});
      const chain=[...parents].reverse().map(item=>String(item.id));
      chain.push(String(target.id));
      editPath.length=0;
      for(let index=0;index<chain.length;index++){
        const id=chain[index],current=assemblyById(id);if(!current)continue;
        if(index>0){
          const parent=assemblyById(chain[index-1]);
          const direct=(parent?.members??[]).some(member=>member.ref.kind==="assembly"&&String(member.ref.id)===id);
          if(!direct)continue;
        }
        editPath.push(id);
      }
    }
    ctx()?.clearSelection?.();
    applyEditContext();renderTree();renderPanel();renderBreadcrumb();
    try{window.dispatchEvent(new CustomEvent("tubebender-assembly-edit-change",{detail:{path:[...editPath],breadcrumb:breadcrumb()}}));}catch{}
    return editPath.at(-1)===String(target.id);
  }
  function exitEdit(){
    if(!editPath.length)return false;
    editPath.pop();ctx()?.clearSelection?.();
    applyEditContext();renderTree();renderPanel();renderBreadcrumb();
    try{window.dispatchEvent(new CustomEvent("tubebender-assembly-edit-change",{detail:{path:[...editPath],breadcrumb:breadcrumb()}}));}catch{}
    return true;
  }
  function exitAllEdit(){
    if(!editPath.length)return false;
    editPath.length=0;ctx()?.clearSelection?.();
    applyEditContext();renderTree();renderPanel();renderBreadcrumb();
    try{window.dispatchEvent(new CustomEvent("tubebender-assembly-edit-change",{detail:{path:[],breadcrumb:breadcrumb()}}));}catch{}
    return true;
  }

  function objectForRef(ref){
    if(ref.kind==="tube")return tubeById(ref.id);
    if(ref.kind==="mesh-instance")return meshById(ref.id);
    if(ref.kind==="construction")return (project()?.construction_geometry??[]).find(x=>String(x?.id)===String(ref.id))??null;
    if(ref.kind==="dimension")return (project()?.engineering_dimensions??[]).find(x=>String(x?.id)===String(ref.id))??null;
    if(ref.kind==="assembly")return assemblyById(ref.id);
    return null;
  }
  function refForObjectId(objectId){
    const id=String(objectId??"");
    if(!id)return null;
    if(tubeById(id))return {kind:"tube",id};
    if(meshById(id))return {kind:"mesh-instance",id};
    if((project()?.construction_geometry??[]).some(item=>String(item?.id)===id))return {kind:"construction",id};
    if((project()?.engineering_dimensions??[]).some(item=>String(item?.id)===id))return {kind:"dimension",id};
    if(assemblyById(id))return {kind:"assembly",id};
    return null;
  }
  function contextForRef(ref,worldPoint=null){
    if(!ref)return assemblies.crossAssemblyMetadata([]).contexts?.[0]??{
      space:"project",assembly_id:null,assembly_path:[],local_point_mm:worldPoint?clone(worldPoint):null,world_point_mm:worldPoint?clone(worldPoint):null
    };
    return assemblies.assemblyContextForMember(project(),ref,{world_point:worldPoint});
  }
  function contextForObjectId(objectId,worldPoint=null){
    const ref=refForObjectId(objectId);
    if(ref)return contextForRef(ref,worldPoint);
    const point=worldPoint&&[worldPoint.x,worldPoint.y,worldPoint.z].every(Number.isFinite)?clone(worldPoint):null;
    return {space:"project",assembly_id:null,assembly_path:[],local_point_mm:point,world_point_mm:point};
  }
  function crossAssemblyForContexts(contexts){return assemblies.crossAssemblyMetadata(contexts);}
  function decorateAssociativeReferences(references=[]){
    const refs=(references??[]).map(ref=>{
      const point=ref?.point??ref?.world_point_mm??null;
      const context=ref?.assembly_context??contextForObjectId(ref?.object_id,point);
      return {...clone(ref),assembly_context:clone(context)};
    });
    const relation=assemblies.crossAssemblyMetadata(refs.map(ref=>ref.assembly_context));
    return {references:refs,cross_assembly:relation};
  }
  function registerCrossAssemblyLink({id=null,type="Associative",references=[],payload={}}={}){
    const p=project();if(!p)throw new Error("No active project");
    const decorated=decorateAssociativeReferences(references);
    const link={
      id:String(id??("cross-link-"+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36)))),
      type:String(type),
      references:decorated.references,
      cross_assembly:decorated.cross_assembly,
      payload:clone(payload),
      status:"Valid"
    };
    const mutate=()=>{
      if(!Array.isArray(p.cross_assembly_links))p.cross_assembly_links=[];
      const index=p.cross_assembly_links.findIndex(item=>String(item?.id)===String(link.id));
      if(index>=0)p.cross_assembly_links[index]=clone(link);else p.cross_assembly_links.push(clone(link));
      return true;
    };
    const ok=eng()?.modelCommand?eng().modelCommand("Сохранить межсборочную связь",mutate):mutate();
    if(ok===false)return false;
    try{eng()?.save?.();}catch{}
    return clone(link);
  }
  function decorateConstructionGeometry(object,references=[]){
    if(!object||typeof object!=="object")throw new TypeError("Construction object is required");
    const decorated=decorateAssociativeReferences(references);
    object.associative_references=decorated.references.map(clone);
    object.cross_assembly=clone(decorated.cross_assembly);
    return object;
  }

  function tubeDirection(tube){
    if(tube?.startVector&&[tube.startVector.x,tube.startVector.y,tube.startVector.z].every(Number.isFinite))return clone(tube.startVector);
    if(tube?.startAxis==="Y")return {x:0,y:1,z:0};
    if(tube?.startAxis==="Z")return {x:0,y:0,z:1};
    return {x:1,y:0,z:0};
  }
  function memberPose(ref){
    if(ref.kind==="tube"){
      const tube=tubeById(ref.id);if(!tube)return null;
      return {position_mm:clone(tube.origin??{x:0,y:0,z:0}),rotation_quaternion:null,direction:tubeDirection(tube)};
    }
    if(ref.kind==="mesh-instance"){
      const mesh=meshById(ref.id);if(!mesh)return null;
      return {
        position_mm:clone(mesh.transform?.position_mm??{x:0,y:0,z:0}),
        rotation_quaternion:clone(mesh.transform?.rotation_quaternion??{x:0,y:0,z:0,w:1}),
        direction:null
      };
    }
    if(ref.kind==="construction"){
      const item=objectForRef(ref);if(!item)return null;
      return {position_mm:clone(item.position_mm??item.origin??null),rotation_quaternion:clone(item.rotation_quaternion??null),direction:clone(item.direction??null)};
    }
    if(ref.kind==="dimension"){
      const dim=objectForRef(ref);if(!dim)return null;
      return {position_mm:clone(dim.text_position??null),rotation_quaternion:null,direction:null};
    }
    if(ref.kind==="assembly"){
      const child=assemblyById(ref.id);if(!child)return null;
      return {position_mm:clone(child.frame?.origin_mm),rotation_quaternion:clone(child.frame?.rotation_quaternion),direction:null};
    }
    return null;
  }
  function localFromPose(frame,pose){
    return {
      position_mm:pose?.position_mm==null?null:assemblies.worldToLocalPoint(frame,pose.position_mm),
      rotation_quaternion:pose?.rotation_quaternion==null?null:assemblies.worldToLocalQuaternion(frame,pose.rotation_quaternion),
      direction:pose?.direction==null?null:assemblies.rotateVectorByQuaternion(pose.direction,assemblies.conjugateQuaternion(frame.rotation_quaternion))
    };
  }
  function syncAssemblyLocals(assemblyId,visited=new Set()){
    const id=String(assemblyId);if(visited.has(id))return;
    visited.add(id);
    const assembly=assemblyById(id);if(!assembly)return;
    for(const member of [...(assembly.members??[])]){
      if(member.ref.kind==="assembly")syncAssemblyLocals(member.ref.id,visited);
      const pose=memberPose(member.ref);
      if(!pose)continue;
      assemblies.setAssemblyMemberLocal(project(),assembly.id,member.ref,localFromPose(assembly.frame,pose));
      if(member.ref.kind==="tube")syncTubePortConstraints(member.ref.id);
    }
  }
  function selectionRefs(){
    const refs=new Map();
    for(const entry of entries()){
      const ref=refFromEntry(entry);if(!ref)continue;
      if(ref.kind==="source-ref")throw new Error("Source / Reference нельзя включить напрямую: сначала создайте Editable Mesh Instance");
      refs.set(assemblies.assemblyMemberKey(ref),ref);
    }
    return [...refs.values()];
  }
  function assertSingleParent(ref,targetAssemblyId=null){
    const direct=directAssembliesForRef(ref).filter(item=>String(item.id)!==String(targetAssemblyId??""));
    if(direct.length)throw new Error("Компонент уже принадлежит Assembly: "+String(direct[0].name??direct[0].id));
  }
  function centroidForRefs(refs){
    const points=refs.map(memberPose).map(p=>p?.position_mm).filter(p=>p&&[p.x,p.y,p.z].every(Number.isFinite));
    if(!points.length)return {x:0,y:0,z:0};
    return points.reduce((a,p)=>({x:a.x+p.x/points.length,y:a.y+p.y/points.length,z:a.z+p.z/points.length}),{x:0,y:0,z:0});
  }
  function createFromSelection({name="Assembly",origin_mm=null}={}){
    let refs;
    try{refs=selectionRefs();}catch(error){toast(error.message);return false;}
    if(!refs.length){toast("Выберите компоненты для Assembly");return false;}
    for(const ref of refs){
      try{assertSingleParent(ref);}catch(error){toast(error.message);return false;}
    }
    let created=null;
    const origin=origin_mm??centroidForRefs(refs);
    const ok=command("Создать Assembly",()=>{
      created=assemblies.createAssembly(project(),{
        name,
        frame:{origin_mm:origin,rotation_quaternion:{x:0,y:0,z:0,w:1}},
        members:refs.map(ref=>({ref,local:{}}))
      });
      syncAssemblyLocals(created.id);
      return true;
    });
    if(ok&&created)ctx()?.replaceSelectionKeys?.(["project-assembly:"+encodeURIComponent(created.id)]);
    return ok?created:false;
  }
  function addSelection(assemblyId){
    const target=assemblyById(assemblyId);if(!target)return false;
    let refs;try{refs=selectionRefs();}catch(error){toast(error.message);return false;}
    refs=refs.filter(ref=>!(ref.kind==="assembly"&&String(ref.id)===String(assemblyId)));
    if(!refs.length){toast("Нет компонентов для добавления");return false;}
    for(const ref of refs){
      try{assertSingleParent(ref,assemblyId);}catch(error){toast(error.message);return false;}
    }
    return command("Добавить компоненты в Assembly",()=>{
      assemblies.addAssemblyMembers(project(),assemblyId,refs.map(ref=>({ref,local:{}})));
      syncAssemblyLocals(assemblyId);return true;
    });
  }
  function removeSelection(assemblyId){
    let refs;try{refs=selectionRefs();}catch(error){toast(error.message);return false;}
    if(!refs.length){toast("Нет компонентов для удаления");return false;}
    return command("Удалить компоненты из Assembly",()=>{
      assemblies.removeAssemblyMembers(project(),assemblyId,refs);
      for(const ref of refs)if(ref.kind==="tube")syncTubePortConstraints(ref.id);
      return true;
    });
  }
  function rename(assemblyId,name){
    return command("Переименовать Assembly",()=>{assemblies.renameAssembly(project(),assemblyId,name);return true;});
  }
  function setFixed(assemblyId,fixed){
    return command(fixed?"Зафиксировать Assembly":"Освободить Assembly",()=>{assemblies.setAssemblyFixed(project(),assemblyId,fixed);return true;});
  }
  function setVisible(assemblyId,visible){
    return command(visible?"Показать Assembly":"Скрыть Assembly",()=>{assemblies.setAssemblyVisibility(project(),assemblyId,visible);return true;});
  }
  function setLock(assemblyId,mode){
    return command(mode==="Unlocked"?"Разблокировать Assembly":mode==="Object"?"Lock Object Assembly":"Lock Position Assembly",()=>{assemblies.setAssemblyLock(project(),assemblyId,mode);return true;});
  }
  function directLeafPermission(ref,action){
    const entry=entryFromRef(ref);
    const layerPermission=entry?layerApi()?.permissionForEntry?.(entry,action):null;
    if(layerPermission&&layerPermission.allowed===false)return layerPermission;
    const object=objectForRef(ref),policy=lockPolicy();
    if(object&&policy){
      const permission=policy.lockPermission(object,action);
      if(!permission.allowed)return permission;
    }
    return {allowed:true,code:"ASSEMBLY_MEMBER_ALLOWED",reason:null};
  }
  function permissionForEntry(entry,action){
    const positionAction=["move","rotate","position","orientation","transform","transform-stack"].includes(String(action));
    let list=[];
    if(entry?.kind==="project-assembly"){
      const root=assemblyById(entry.assemblyId);
      list=[root,...(assemblies.assemblyDescendantIds(project(),entry.assemblyId).map(assemblyById))].filter(Boolean);
    }else{
      list=containingAssembliesForEntry(entry);
    }
    const policy=lockPolicy();
    for(const assembly of list){
      if(positionAction&&assembly.fixed===true)return {allowed:false,code:"ASSEMBLY_FIXED",reason:"Assembly зафиксирован",assembly_id:String(assembly.id)};
      if(policy){
        const permission=policy.lockPermission(assembly,action);
        if(!permission.allowed)return {...permission,assembly_id:String(assembly.id)};
      }
    }
    if(entry?.kind==="project-assembly"){
      for(const member of assemblies.leafAssemblyMembers(project(),entry.assemblyId)){
        const permission=directLeafPermission(member.ref,action);
        if(!permission.allowed)return permission;
      }
    }
    return {allowed:true,code:"ASSEMBLY_ALLOWED",reason:null};
  }
  function canSelection(action,{notify=true}={}){
    for(const entry of entries()){
      const permission=permissionForEntry(entry,action);
      if(!permission.allowed){if(notify)toast(permission.reason);return false;}
    }
    return true;
  }
  function applyTubeResult(tube,result){
    if(result?.status!=="exact"||!result.tube)throw new Error(result?.reason??"Assembly rigid transform failed");
    for(const key of Object.keys(tube))delete tube[key];
    Object.assign(tube,clone(result.tube));
  }
  function transformPoint(oldFrame,newFrame,p){
    return assemblies.localToWorldPoint(newFrame,assemblies.worldToLocalPoint(oldFrame,p));
  }
  function transformQuaternion(oldFrame,newFrame,q){
    const local=assemblies.worldToLocalQuaternion(oldFrame,q);
    return assemblies.localToWorldQuaternion(newFrame,local);
  }
  function transformTube(ref,oldFrame,newFrame,axisAngle){
    const tube=tubeById(ref.id);if(!tube)return;
    let next={status:"exact",tube:clone(tube)};
    if(Math.abs(axisAngle.angle_deg)>1e-10){
      next=rigid.rotateLegacyTubeRigid(tube,{axis:axisAngle.axis,center:oldFrame.origin_mm,angle_deg:axisAngle.angle_deg});
      if(next.status!=="exact")throw new Error(next.reason??"Assembly tube rotation failed");
    }
    const delta={
      x:newFrame.origin_mm.x-oldFrame.origin_mm.x,
      y:newFrame.origin_mm.y-oldFrame.origin_mm.y,
      z:newFrame.origin_mm.z-oldFrame.origin_mm.z
    };
    next=rigid.translateLegacyTubeRigid(next.tube,delta);
    applyTubeResult(tube,next);
  }
  function transformMesh(ref,oldFrame,newFrame,axisAngle){
    const mesh=meshById(ref.id);if(!mesh)return;
    const p=mesh.transform?.position_mm??{x:0,y:0,z:0},target=transformPoint(oldFrame,newFrame,p);
    refApi()?.moveEditableMeshInstance?.(project(),ref.id,{x:target.x-p.x,y:target.y-p.y,z:target.z-p.z});
    if(Math.abs(axisAngle.angle_deg)>1e-10)refApi()?.rotateEditableMeshInstanceAxis?.(project(),ref.id,{axis:axisAngle.axis,angle_deg:axisAngle.angle_deg});
  }
  function transformConstruction(ref,oldFrame,newFrame,axisAngle){
    const item=objectForRef(ref);if(!item)return;
    const key=item.position_mm?"position_mm":item.origin?"origin":null;
    if(key)item[key]={...transformPoint(oldFrame,newFrame,item[key])};
    if(item.direction)item.direction={...assemblies.rotateVectorByQuaternion(item.direction,assemblies.axisAngleQuaternion(axisAngle.axis,axisAngle.angle_deg))};
    if(item.rotation_quaternion)item.rotation_quaternion={...transformQuaternion(oldFrame,newFrame,item.rotation_quaternion)};
  }
  function transformDimension(ref,oldFrame,newFrame,axisAngle){
    const dim=objectForRef(ref);if(!dim)return;
    if(dim.text_position&&[dim.text_position.x,dim.text_position.y,dim.text_position.z].every(Number.isFinite)){
      dim.text_position={...transformPoint(oldFrame,newFrame,dim.text_position)};
    }
    if(dim.leader?.start&&[dim.leader.start.x,dim.leader.start.y,dim.leader.start.z].every(Number.isFinite)){
      dim.leader={...dim.leader,start:{...transformPoint(oldFrame,newFrame,dim.leader.start)}};
    }
    if(dim.leader?.end&&[dim.leader.end.x,dim.leader.end.y,dim.leader.end.z].every(Number.isFinite)){
      dim.leader={...dim.leader,end:{...transformPoint(oldFrame,newFrame,dim.leader.end)}};
    }
    if(dim.local_plane?.origin&&[dim.local_plane.origin.x,dim.local_plane.origin.y,dim.local_plane.origin.z].every(Number.isFinite)){
      const q=assemblies.axisAngleQuaternion(axisAngle.axis,axisAngle.angle_deg);
      dim.local_plane={
        ...dim.local_plane,
        origin:{...transformPoint(oldFrame,newFrame,dim.local_plane.origin)},
        x_axis:dim.local_plane.x_axis?{...assemblies.rotateVectorByQuaternion(dim.local_plane.x_axis,q)}:dim.local_plane.x_axis,
        y_axis:dim.local_plane.y_axis?{...assemblies.rotateVectorByQuaternion(dim.local_plane.y_axis,q)}:dim.local_plane.y_axis,
        normal:dim.local_plane.normal?{...assemblies.rotateVectorByQuaternion(dim.local_plane.normal,q)}:dim.local_plane.normal
      };
    }
  }
  function transformLeaf(ref,oldFrame,newFrame,axisAngle){
    if(ref.kind==="tube")transformTube(ref,oldFrame,newFrame,axisAngle);
    else if(ref.kind==="mesh-instance")transformMesh(ref,oldFrame,newFrame,axisAngle);
    else if(ref.kind==="construction")transformConstruction(ref,oldFrame,newFrame,axisAngle);
    else if(ref.kind==="dimension")transformDimension(ref,oldFrame,newFrame,axisAngle);
  }
  function translateLeafDirect(ref,delta){
    if(ref.kind==="tube"){
      const tube=tubeById(ref.id);if(!tube)return;
      applyTubeResult(tube,rigid.translateLegacyTubeRigid(tube,delta));
    }else if(ref.kind==="mesh-instance"){
      refApi()?.moveEditableMeshInstance?.(project(),ref.id,delta);
    }else if(ref.kind==="construction"){
      const item=objectForRef(ref);if(!item)return;
      const key=item.position_mm?"position_mm":item.origin?"origin":null;
      if(key){
        const p=item[key];item[key]={x:Number(p.x||0)+delta.x,y:Number(p.y||0)+delta.y,z:Number(p.z||0)+delta.z};
      }
    }else if(ref.kind==="dimension"){
      const dim=objectForRef(ref);if(!dim)return;
      if(dim.text_position)dim.text_position={x:Number(dim.text_position.x||0)+delta.x,y:Number(dim.text_position.y||0)+delta.y,z:Number(dim.text_position.z||0)+delta.z};
    }
  }
  function rotatePointAround(point,pivot,q){
    const rel={x:point.x-pivot.x,y:point.y-pivot.y,z:point.z-pivot.z};
    const rotated=assemblies.rotateVectorByQuaternion(rel,q);
    return {x:pivot.x+rotated.x,y:pivot.y+rotated.y,z:pivot.z+rotated.z};
  }
  function rotateLeafDirect(ref,axis,pivot,angle){
    const q=assemblies.axisAngleQuaternion(axis,angle);
    if(ref.kind==="tube"){
      const tube=tubeById(ref.id);if(!tube)return;
      applyTubeResult(tube,rigid.rotateLegacyTubeRigid(tube,{axis,center:pivot,angle_deg:angle}));
    }else if(ref.kind==="mesh-instance"){
      const mesh=meshById(ref.id);if(!mesh)return;
      const p=mesh.transform?.position_mm??{x:0,y:0,z:0},target=rotatePointAround(p,pivot,q);
      refApi()?.moveEditableMeshInstance?.(project(),ref.id,{x:target.x-p.x,y:target.y-p.y,z:target.z-p.z});
      refApi()?.rotateEditableMeshInstanceAxis?.(project(),ref.id,{axis,angle_deg:angle});
    }else if(ref.kind==="construction"){
      const item=objectForRef(ref);if(!item)return;
      const key=item.position_mm?"position_mm":item.origin?"origin":null;
      if(key)item[key]=rotatePointAround(item[key],pivot,q);
      if(item.direction)item.direction={...assemblies.rotateVectorByQuaternion(item.direction,q)};
    }else if(ref.kind==="dimension"){
      const dim=objectForRef(ref);if(!dim)return;
      if(dim.text_position)dim.text_position=rotatePointAround(dim.text_position,pivot,q);
    }
  }
  function editRefsForEntries(list){
    const active=activeEditAssembly();if(!active)return null;
    const refs=new Map();
    for(const entry of list??[]){
      const direct=directMemberEntry(active,entry);
      if(!direct)return null;
      const ref=refFromEntry(direct);if(!ref||ref.kind==="source-ref")return null;
      refs.set(assemblies.assemblyMemberKey(ref),ref);
    }
    return [...refs.values()];
  }
  function canHandleEditEntries(list=entries()){return editing()&&Array.isArray(editRefsForEntries(list));}
  function moveEditEntries(list,delta){
    const active=activeEditAssembly(),refs=editRefsForEntries(list);
    if(!active||!refs?.length)return false;
    const d={x:Number(delta?.x)||0,y:Number(delta?.y)||0,z:Number(delta?.z)||0};
    return command("Edit Assembly Move",()=>{
      for(const ref of refs){
        if(ref.kind==="assembly"){
          const child=assemblyById(ref.id),f=child.frame;
          applyAssemblyFrame(child.id,{origin_mm:{x:f.origin_mm.x+d.x,y:f.origin_mm.y+d.y,z:f.origin_mm.z+d.z},rotation_quaternion:f.rotation_quaternion});
        }else translateLeafDirect(ref,d);
      }
      syncAssemblyLocals(active.id);return true;
    },{wholeObject:true});
  }
  function rotateEditEntries(list,{axis,pivot,angle_deg}={}){
    const active=activeEditAssembly(),refs=editRefsForEntries(list);
    if(!active||!refs?.length)return false;
    const angle=Number(angle_deg),center={x:Number(pivot?.x)||0,y:Number(pivot?.y)||0,z:Number(pivot?.z)||0};
    if(!Number.isFinite(angle))return false;
    return command("Edit Assembly Rotate",()=>{
      const q=assemblies.axisAngleQuaternion(axis,angle);
      for(const ref of refs){
        if(ref.kind==="assembly"){
          const child=assemblyById(ref.id),newOrigin=rotatePointAround(child.frame.origin_mm,center,q);
          applyAssemblyFrame(child.id,{origin_mm:newOrigin,rotation_quaternion:assemblies.multiplyQuaternions(q,child.frame.rotation_quaternion)});
        }else rotateLeafDirect(ref,axis,center,angle);
      }
      syncAssemblyLocals(active.id);return true;
    },{wholeObject:true});
  }

  function transformDescendantFrames(rootId,oldFrame,newFrame){
    for(const id of assemblies.assemblyDescendantIds(project(),rootId)){
      const child=assemblyById(id);if(!child)continue;
      child.frame={
        origin_mm:{...transformPoint(oldFrame,newFrame,child.frame.origin_mm)},
        rotation_quaternion:{...transformQuaternion(oldFrame,newFrame,child.frame.rotation_quaternion)}
      };
    }
  }
  function applyAssemblyFrame(assemblyId,newFrame){
    const assembly=assemblyById(assemblyId);if(!assembly)throw new Error("Assembly not found");
    syncAssemblyLocals(assemblyId);
    const oldFrame=clone(assembly.frame),normalized=assemblies.normalizeAssemblyFrame(newFrame);
    const qDelta=assemblies.multiplyQuaternions(normalized.rotation_quaternion,assemblies.conjugateQuaternion(oldFrame.rotation_quaternion));
    const axisAngle=assemblies.quaternionAxisAngle(qDelta);
    const leaves=assemblies.leafAssemblyMembers(project(),assemblyId);
    for(const member of leaves)transformLeaf(member.ref,oldFrame,normalized,axisAngle);
    transformDescendantFrames(assemblyId,oldFrame,normalized);
    assemblies.setAssemblyFrame(project(),assemblyId,normalized);
    return assembly;
  }
  function rootSelectionIds(ids){
    const selected=new Set((ids??[]).map(String));
    return [...selected].filter(id=>{
      const parents=assemblies.assembliesContainingMember(project(),{kind:"assembly",id},{includeAncestors:true});
      return !parents.some(parent=>selected.has(String(parent.id)));
    });
  }
  function moveAssemblies(ids,delta){
    const roots=rootSelectionIds(ids);
    if(!roots.length)return false;
    for(const id of roots){
      const permission=permissionForEntry({kind:"project-assembly",assemblyId:id},"move");
      if(!permission.allowed){toast(permission.reason);return false;}
    }
    const d={x:Number(delta?.x)||0,y:Number(delta?.y)||0,z:Number(delta?.z)||0};
    return command(roots.length>1?"Move Assemblies":"Move Assembly",()=>{
      for(const id of roots){
        const a=assemblyById(id),f=a.frame;
        applyAssemblyFrame(id,{origin_mm:{x:f.origin_mm.x+d.x,y:f.origin_mm.y+d.y,z:f.origin_mm.z+d.z},rotation_quaternion:f.rotation_quaternion});
      }
      return true;
    });
  }
  function moveAssembly(id,delta){return moveAssemblies([id],delta);}
  function rotateAssembly(id,{axis={x:0,y:0,z:1},angle_deg=0}={}){
    const permission=permissionForEntry({kind:"project-assembly",assemblyId:id},"rotate");
    if(!permission.allowed){toast(permission.reason);return false;}
    const angle=Number(angle_deg);if(!Number.isFinite(angle)){toast("Угол Rotate должен быть числом");return false;}
    return command("Rotate Assembly",()=>{
      const a=assemblyById(id),q=assemblies.axisAngleQuaternion(axis,angle);
      applyAssemblyFrame(id,{origin_mm:a.frame.origin_mm,rotation_quaternion:assemblies.multiplyQuaternions(q,a.frame.rotation_quaternion)});
      return true;
    });
  }
  function setOrigin(id,origin){
    const p={x:Number(origin?.x),y:Number(origin?.y),z:Number(origin?.z)};
    if(![p.x,p.y,p.z].every(Number.isFinite)){toast("Origin XYZ должен быть числовым");return false;}
    return command("Set Assembly Origin",()=>{
      const a=assemblyById(id);syncAssemblyLocals(id);
      assemblies.setAssemblyFrame(project(),id,{origin_mm:p,rotation_quaternion:a.frame.rotation_quaternion});
      syncAssemblyLocals(id);
      return true;
    });
  }
  function dissolve(id){
    return command("Dissolve Assembly",()=>{
      const leaves=assemblies.leafAssemblyMembers(project(),id).map(member=>clone(member.ref));
      const result=assemblies.dissolveAssembly(project(),id);
      if(result===false)return false;
      for(const ref of leaves)if(ref.kind==="tube")syncTubePortConstraints(ref.id);
      return true;
    });
  }
  function hiddenLeafKeys(){
    const hidden=new Set();
    for(const assembly of assemblies.ensureAssemblyState(project())){
      if(assembly.visible!==false)continue;
      for(const member of assemblies.leafAssemblyMembers(project(),assembly.id))hidden.add(assemblies.assemblyMemberKey(member.ref));
    }
    return hidden;
  }
  function objectMemberKey(object){
    let item=object,active=String(eng()?.activeTube?.()?.id??"");
    while(item){
      const data=item.userData??{};
      if(data.referenceEditableInstanceId)return "mesh-instance:"+String(data.referenceEditableInstanceId);
      if(data.tubeId)return "tube:"+String(data.tubeId);
      if(active&&(data.pipe===true||data.originPoint===true||data.tubeEnd===true||Number.isInteger(Number(data.rowIndex))))return "tube:"+active;
      item=item.parent;
    }
    return null;
  }

  function memberKeyForObject(object){
    let item=object,activeTube=String(eng()?.activeTube?.()?.id??"");
    while(item){
      const data=item.userData??{};
      if(data.referenceEditableInstanceId)return "mesh-instance:"+String(data.referenceEditableInstanceId);
      if(data.tubeId)return "tube:"+String(data.tubeId);
      if(activeTube&&(data.pipe===true||data.originPoint===true||data.tubeEnd===true||Number.isInteger(Number(data.rowIndex))))return "tube:"+activeTube;
      item=item.parent;
    }
    return null;
  }
  function restoreEditMaterial(object){
    const saved=object?.userData?.tbAssemblyEditMaterial;
    if(!saved||!object?.material)return;
    const mats=Array.isArray(object.material)?object.material:[object.material];
    mats.forEach((m,index)=>{
      const state=saved[index]??saved[0];if(!m||!state)return;
      m.opacity=state.opacity;m.transparent=state.transparent;m.depthWrite=state.depthWrite;m.needsUpdate=true;
    });
    delete object.userData.tbAssemblyEditMaterial;
  }
  function muteEditMaterial(object){
    if(!object?.material)return;
    const mats=Array.isArray(object.material)?object.material:[object.material];
    if(!object.userData.tbAssemblyEditMaterial){
      object.userData.tbAssemblyEditMaterial=mats.map(m=>({opacity:Number(m?.opacity??1),transparent:m?.transparent===true,depthWrite:m?.depthWrite!==false}));
    }
    mats.forEach(m=>{if(!m)return;m.opacity=Math.min(Number(m.opacity??1),.22);m.transparent=true;m.depthWrite=false;m.needsUpdate=true;});
  }
  function applyEditContext(){
    if(typeof pipeGroup==="undefined"||!pipeGroup)return;
    const active=activeEditAssembly();
    const inside=active?new Set(assemblies.leafAssemblyMembers(project(),active.id).map(member=>assemblies.assemblyMemberKey(member.ref))):new Set();
    pipeGroup.traverse(object=>{
      if(object===pipeGroup||object.userData?.helper)return;
      const key=memberKeyForObject(object);
      if(!active||!key||inside.has(key))restoreEditMaterial(object);
      else muteEditMaterial(object);
    });
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function applyVisibility(){
    if(typeof pipeGroup==="undefined"||!pipeGroup||!assemblies)return;
    const hidden=hiddenLeafKeys();
    pipeGroup.traverse(object=>{
      if(object===pipeGroup||object.userData?.helper)return;
      const key=objectMemberKey(object);if(!key)return;
      object.userData={...(object.userData??{}),tbAssemblyHidden:hidden.has(key)};
      if(hidden.has(key))object.visible=false;
    });
    try{if(typeof markViewerDirty==="function")markViewerDirty();}catch{}
  }
  function memberLabel(member){
    const ref=member.ref;
    if(ref.kind==="tube")return tubeById(ref.id)?.name??ref.id;
    if(ref.kind==="mesh-instance")return meshById(ref.id)?.name??ref.id;
    if(ref.kind==="assembly")return assemblyById(ref.id)?.name??ref.id;
    return ref.kind+" · "+ref.id;
  }
  function assemblyTreeHtml(id,depth=0,seen=new Set()){
    const a=assemblyById(id);if(!a||seen.has(String(id)))return "";
    seen.add(String(id));
    const pad=30+depth*18,lock=String(a.lock_state?.mode??"Unlocked");
    let html='<div class="tb-tree-node clickable tb-project-assembly" style="padding-left:'+pad+'px" data-project-assembly="'+esc(a.id)+'"><span class="tb-tree-icon">◫</span><span class="tb-tree-label">'+esc(a.name)+' <small>· '+(a.members?.length??0)+(a.fixed?' · fixed':'')+(a.visible===false?' · hidden':'')+(lock!=="Unlocked"?' · '+esc(lock):'')+'</small></span></div>';
    for(const member of a.members??[]){
      if(member.ref.kind==="assembly"){html+=assemblyTreeHtml(member.ref.id,depth+1,seen);continue;}
      const key=selectionKeyForRef(member.ref);
      html+='<div class="tb-tree-node clickable tb-assembly-member" style="padding-left:'+(pad+18)+'px" data-assembly-member-key="'+esc(key)+'" data-assembly-owner="'+esc(a.id)+'"><span class="tb-tree-icon">·</span><span class="tb-tree-label">'+esc(memberLabel(member))+'</span></div>';
    }
    seen.delete(String(id));return html;
  }
  function renderTree(){
    const host=document.getElementById("tbProjectTree");if(!host||!assemblies)return;
    const all=assemblies.ensureAssemblyState(project());
    const signature=JSON.stringify(all.map(a=>({id:a.id,name:a.name,frame:a.frame,members:a.members,fixed:a.fixed,visible:a.visible,lock_state:a.lock_state})));
    let section=host.querySelector("[data-assemblies-tree-root]");
    if(section?.dataset.signature===signature)return;
    if(!section){section=document.createElement("div");section.dataset.assembliesTreeRoot="1";host.appendChild(section);}
    section.dataset.signature=signature;
    const nested=new Set(all.flatMap(a=>(a.members??[]).filter(m=>m.ref?.kind==="assembly").map(m=>String(m.ref.id))));
    const roots=all.filter(a=>!nested.has(String(a.id)));
    section.innerHTML='<div class="tb-tree-node level1"><span class="tb-tree-icon">▾</span><span class="tb-tree-label">◫ Assemblies <small>· '+all.length+'</small></span></div>'+roots.map(a=>assemblyTreeHtml(a.id)).join("");
    try{ctx()?.decorateProjectTreeAsTreeView?.();}catch{}
    try{window.TubeBenderObjectLocks?.decorateTree?.();}catch{}
    try{window.TubeBenderLayers?.decorateTree?.();}catch{}
  }
  function scheduleTree(){if(treeScheduled)return;treeScheduled=true;queueMicrotask(()=>{treeScheduled=false;renderTree();});}

  function ensureBreadcrumb(){
    if(breadcrumbBar)return breadcrumbBar;
    breadcrumbBar=document.createElement("div");breadcrumbBar.id="tbAssemblyEditBreadcrumb";
    breadcrumbBar.style.cssText="position:fixed;left:14px;top:54px;z-index:120367;display:none;align-items:center;gap:7px;padding:6px 9px;background:rgba(13,22,32,.96);border:1px solid #49617a;border-radius:6px;color:#edf4fb;font:12px system-ui";
    breadcrumbBar.innerHTML='<b data-assembly-edit-path></b><button data-assembly-edit-up>↑</button><button data-assembly-edit-exit>Exit</button>';
    document.body.appendChild(breadcrumbBar);
    breadcrumbBar.querySelector("[data-assembly-edit-up]").onclick=()=>exitEdit();
    breadcrumbBar.querySelector("[data-assembly-edit-exit]").onclick=()=>exitAllEdit();
    return breadcrumbBar;
  }
  function renderBreadcrumb(){
    const bar=ensureBreadcrumb(),active=activeEditAssembly();
    bar.style.display=active?"flex":"none";
    const label=bar.querySelector("[data-assembly-edit-path]");if(label)label.textContent=breadcrumb();
  }
  function ensurePanel(){
    if(panel)return panel;
    const style=document.createElement("style");style.id="tbAssembliesStyles";style.textContent='#tbAssembliesToggle{position:fixed;right:232px;top:54px;z-index:120366;background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:6px;padding:6px 10px;cursor:pointer}#tbAssembliesPanel{position:fixed;right:14px;top:88px;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 110px);z-index:120359;display:none;flex-direction:column;background:rgba(13,22,32,.985);color:#edf4fb;border:1px solid #41566f;border-radius:9px;box-shadow:0 14px 40px rgba(0,0,0,.45);font:12px system-ui}#tbAssembliesPanel.open{display:flex}.tb-assembly-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid #304154}.tb-assembly-head .grow{flex:1}.tb-assembly-body{overflow:auto;padding:8px}.tb-assembly-grid{display:grid;grid-template-columns:120px 1fr;gap:6px 8px;align-items:center}.tb-assembly-grid input,.tb-assembly-grid select{background:#09131c;color:#fff;border:1px solid #40536a;border-radius:4px;padding:5px}.tb-assembly-actions{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.tb-assembly-actions button{background:#26384b;color:#eef5ff;border:1px solid #455b72;border-radius:4px;padding:5px 7px;cursor:pointer}.tb-assembly-note{color:#8396aa;line-height:1.35;margin-top:6px}';document.head.appendChild(style);
    toggle=document.createElement("button");toggle.id="tbAssembliesToggle";toggle.textContent="Assemblies";document.body.appendChild(toggle);
    panel=document.createElement("section");panel.id="tbAssembliesPanel";panel.innerHTML='<div class="tb-assembly-head"><b>Assemblies</b><span class="grow"></span><button data-assembly-close>×</button></div><div class="tb-assembly-body" data-assembly-body></div>';document.body.appendChild(panel);
    toggle.onclick=()=>{panel.classList.toggle("open");renderPanel();};
    panel.querySelector("[data-assembly-close]").onclick=()=>panel.classList.remove("open");
    return panel;
  }
  function parseVec(text){
    const values=String(text??"").replace(/,/g,".").split(";").map(Number);
    if(values.length<3||!values.slice(0,3).every(Number.isFinite))throw new Error("Введите XYZ как x;y;z");
    return {x:values[0],y:values[1],z:values[2]};
  }
  function renderPanel(){
    if(!assemblies)return;
    const p=project();if(!p)return;
    const root=ensurePanel(),body=root.querySelector("[data-assembly-body]");
    const list=assemblies.ensureAssemblyState(p),selected=entries().find(e=>e.kind==="project-assembly");
    const selectedId=selected?.assemblyId??list[0]?.id??"",a=selectedId?assemblyById(selectedId):null;
    const options='<option value="">—</option>'+list.map(item=>'<option value="'+esc(item.id)+'" '+(String(item.id)===String(selectedId)?'selected':'')+'>'+esc(item.name)+'</option>').join("");
    const origin=a?.frame?.origin_mm??{x:0,y:0,z:0};
    body.innerHTML='<div class="tb-assembly-grid"><label>Assembly</label><select data-assembly-select>'+options+'</select><label>Name</label><input data-assembly-name value="'+esc(a?.name??"Assembly")+'"><label>Origin XYZ</label><input data-assembly-origin value="'+esc(origin.x+";"+origin.y+";"+origin.z)+'"><label>Visible</label><input data-assembly-visible type="checkbox" '+(a?.visible!==false?'checked':'')+'><label>Fixed</label><input data-assembly-fixed type="checkbox" '+(a?.fixed===true?'checked':'')+'><label>Lock</label><select data-assembly-lock><option>Unlocked</option><option '+(a?.lock_state?.mode==="Position"?'selected':'')+'>Position</option><option '+(a?.lock_state?.mode==="Object"?'selected':'')+'>Object</option></select><label>Move XYZ</label><input data-assembly-move value="0;0;0"><label>Rotate axis</label><select data-assembly-axis><option>X</option><option>Y</option><option selected>Z</option></select><label>Rotate °</label><input data-assembly-angle value="0"></div>'+
      '<div class="tb-assembly-actions"><button data-assembly-create>Создать из выбора</button><button data-assembly-rename '+(!a?'disabled':'')+'>Rename</button><button data-assembly-add '+(!a?'disabled':'')+'>Add selection</button><button data-assembly-remove '+(!a?'disabled':'')+'>Remove selection</button><button data-assembly-dissolve '+(!a?'disabled':'')+'>Dissolve</button></div>'+
      '<div class="tb-assembly-actions"><button data-assembly-origin-run '+(!a?'disabled':'')+'>Set Origin</button><button data-assembly-move-run '+(!a?'disabled':'')+'>Move</button><button data-assembly-rotate-run '+(!a?'disabled':'')+'>Rotate</button></div>'+
      '<div class="tb-assembly-actions"><button data-assembly-edit-enter '+(!a?'disabled':'')+'>Редактировать сборку</button><button data-assembly-edit-up '+(!editing()?'disabled':'')+'>На уровень выше</button><button data-assembly-edit-exit '+(!editing()?'disabled':'')+'>Выйти из Edit Assembly</button></div>'+
      '<div class="tb-assembly-note">'+esc(breadcrumb())+'</div><div class="tb-assembly-note">Assembly — конструктивная иерархия с собственной локальной системой координат. Set Origin меняет систему координат без перемещения компонентов.</div>';
    body.querySelector("[data-assembly-select]").onchange=e=>{ctx()?.replaceSelectionKeys?.(e.target.value?["project-assembly:"+encodeURIComponent(e.target.value)]:[]);renderPanel();};
    body.querySelector("[data-assembly-create]").onclick=()=>createFromSelection({name:body.querySelector("[data-assembly-name]").value});
    if(!a)return;
    body.querySelector("[data-assembly-edit-enter]").onclick=()=>enterEdit(a.id);
    body.querySelector("[data-assembly-edit-up]").onclick=()=>exitEdit();
    body.querySelector("[data-assembly-edit-exit]").onclick=()=>exitAllEdit();
        body.querySelector("[data-assembly-rename]").onclick=()=>rename(a.id,body.querySelector("[data-assembly-name]").value);
    body.querySelector("[data-assembly-add]").onclick=()=>addSelection(a.id);
    body.querySelector("[data-assembly-remove]").onclick=()=>removeSelection(a.id);
    body.querySelector("[data-assembly-dissolve]").onclick=()=>dissolve(a.id);
    body.querySelector("[data-assembly-visible]").onchange=e=>setVisible(a.id,e.target.checked);
    body.querySelector("[data-assembly-fixed]").onchange=e=>setFixed(a.id,e.target.checked);
    body.querySelector("[data-assembly-lock]").onchange=e=>setLock(a.id,e.target.value);
    body.querySelector("[data-assembly-origin-run]").onclick=()=>{try{setOrigin(a.id,parseVec(body.querySelector("[data-assembly-origin]").value));}catch(error){toast(error.message);}};
    body.querySelector("[data-assembly-move-run]").onclick=()=>{try{moveAssembly(a.id,parseVec(body.querySelector("[data-assembly-move]").value));}catch(error){toast(error.message);}};
    body.querySelector("[data-assembly-rotate-run]").onclick=()=>{
      const axisName=body.querySelector("[data-assembly-axis]").value,axis=axisName==="X"?{x:1,y:0,z:0}:axisName==="Y"?{x:0,y:1,z:0}:{x:0,y:0,z:1};
      rotateAssembly(a.id,{axis,angle_deg:Number(body.querySelector("[data-assembly-angle]").value.replace(",","."))||0});
    };
  }
  function observe(){
    observer?.disconnect?.();observer=new MutationObserver(()=>scheduleTree());observer.observe(document.body,{childList:true,subtree:true});
  }
  async function install(){
    if(installed)return;installed=true;
    try{[assemblies,rigid]=await Promise.all([import(ASSEMBLIES_URL),import(RIGID_URL)]);}catch(error){console.error("Assemblies runtime failed",error);return;}
    assemblies.ensureAssemblyState(project());ensurePanel();ensureBreadcrumb();renderTree();renderPanel();applyVisibility();applyEditContext();renderBreadcrumb();observe();
    if(typeof update3D==="function"&&!update3D._tbAssemblyEdit){
      const original=update3D;
      update3D=function(...args){
        const result=original.apply(this,args);
        try{applyVisibility();applyEditContext();}catch(error){console.warn("Assembly edit context:",error);}
        return result;
      };
      update3D._tbAssemblyEdit=true;
    }
    window.addEventListener("keydown",(event)=>{
      if(event.key==="Escape"&&editing()&&!event.target?.matches?.("input,textarea,select")){
        event.preventDefault();exitEdit();
      }
    });
    window.addEventListener("tubebender-selection-change",()=>{if(panel?.classList.contains("open"))renderPanel();});
    window.addEventListener("tubebender-layer-change",()=>applyVisibility());
    window.TubeBenderAssemblies=Object.freeze({
      createFromSelection,addSelection,removeSelection,rename,setFixed,setVisible,setLock,dissolve,setOrigin,
      moveAssembly,moveAssemblies,rotateAssembly,applyAssemblyFrame,syncAssemblyLocals,
      moveEditEntries,rotateEditEntries,canHandleEditEntries,
      enterEdit,exitEdit,exitAllEdit,editing,activeEditAssembly,breadcrumb,resolveInteraction,assemblyForEditEntry,
      renderTree,renderPanel,applyVisibility,applyEditContext,assemblyById,parentAssemblyForEntry,containingAssembliesForEntry,
      directTubeAssembly,syncTubePortConstraints,captureTubeEndConstraint,resolveTubeEndConstraintTarget,clearTubePortConstraint,
      refForObjectId,contextForRef,contextForObjectId,crossAssemblyForContexts,decorateAssociativeReferences,registerCrossAssemblyLink,decorateConstructionGeometry,
      permissionForEntry,canSelection,domain:assemblies
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>install().catch(console.error),{once:true});else install().catch(console.error);
})();