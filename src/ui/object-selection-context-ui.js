(()=>{
  const selected=new Set();
  let contextMenu=null;
  let movePanel=null;
  let issuesPanel=null;
  let installed=false;
  let ownRaycaster=null;
  let selectionCycle={active:false,candidates:[],index:0,clientX:0,clientY:0};
  let objectChooser=null;
  const PREFIX={
    ref:"ref:",
    mesh:"mesh:",
    group:"group:",
    projectAssembly:"project-assembly:",
    tube:"tube:",
    row:"row:",
    end:"end:",
    assembly:"assembly:"
  };

  function enc(value){return encodeURIComponent(String(value??""));}
  function dec(value){try{return decodeURIComponent(String(value??""));}catch{return String(value??"");}}
  function refKey(sceneId,nodeId){return PREFIX.ref+enc(sceneId)+":"+enc(nodeId);}
  function meshKey(instanceId){return PREFIX.mesh+enc(instanceId);}
  function groupKey(groupId){return PREFIX.group+enc(groupId);}
  function projectAssemblyKey(assemblyId){return PREFIX.projectAssembly+enc(assemblyId);}
  function tubeKey(tubeId){return PREFIX.tube+enc(tubeId);}
  function endKey(tubeId){return PREFIX.end+enc(tubeId);}
  function rowKey(tubeId,rowIndex){return PREFIX.row+enc(tubeId)+":"+String(Number(rowIndex));}
  function assemblyKey(tubeId,assemblyId){return PREFIX.assembly+enc(tubeId)+":"+enc(assemblyId);}

  function parseKey(key){
    const text=String(key??"");
    if(text.startsWith(PREFIX.ref)){
      const body=text.slice(PREFIX.ref.length);
      const split=body.indexOf(":");
      if(split<0)return null;
      return {kind:"ref",sceneId:dec(body.slice(0,split)),nodeId:dec(body.slice(split+1))};
    }
    if(text.startsWith(PREFIX.mesh)){
      return {kind:"mesh-instance",instanceId:dec(text.slice(PREFIX.mesh.length))};
    }
    if(text.startsWith(PREFIX.group)){
      return {kind:"group",groupId:dec(text.slice(PREFIX.group.length))};
    }
    if(text.startsWith(PREFIX.projectAssembly)){
      return {kind:"project-assembly",assemblyId:dec(text.slice(PREFIX.projectAssembly.length))};
    }
    if(text.startsWith(PREFIX.tube)){
      return {kind:"tube",tubeId:dec(text.slice(PREFIX.tube.length))};
    }
    if(text.startsWith(PREFIX.row)){
      const body=text.slice(PREFIX.row.length);
      const split=body.indexOf(":");
      if(split<0)return null;
      return {kind:"row",tubeId:dec(body.slice(0,split)),rowIndex:Number(body.slice(split+1))};
    }
    if(text.startsWith(PREFIX.end)){
      return {kind:"end",tubeId:dec(text.slice(PREFIX.end.length))};
    }
    if(text.startsWith(PREFIX.assembly)){
      const body=text.slice(PREFIX.assembly.length);
      const split=body.indexOf(":");
      if(split<0)return null;
      return {kind:"assembly",tubeId:dec(body.slice(0,split)),assemblyId:dec(body.slice(split+1))};
    }
    return null;
  }

  function project(){
    try{return typeof activeProject==="function"?activeProject():null;}
    catch{return null;}
  }
  function refApi(){return window.TubeBenderReferenceSceneUi??null;}
  function groupsApi(){return window.TubeBenderGroups??null;}
  function assembliesApi(){return window.TubeBenderAssemblies??null;}
  function layerApi(){return window.TubeBenderLayers??null;}
  function lockApi(){return window.TubeBenderObjectLocks??null;}
  function lockAllowed(action,{notify=true}={}){
    const api=lockApi();
    return typeof api?.canSelection==="function"?api.canSelection(action,{notify}):true;
  }
  function tubeById(id){
    return (project()?.tubes??[]).find((tube)=>String(tube?.id)===String(id))??null;
  }
  function activeTubeId(){
    try{return String(state?.activeTubeId??"");}catch{return "";}
  }

  function isRecognizedTube(tube){
    return !!tube?.importEvidence;
  }
  function rowFor(entry){
    const tube=tubeById(entry?.tubeId);
    if(!tube)return null;
    if(String(tube.id)===activeTubeId()){
      return state?.rows?.[entry.rowIndex]??null;
    }
    return tube.rows?.[entry.rowIndex]??null;
  }

  function rawReferenceKey(entry){
    return String(entry.sceneId)+"|"+String(entry.nodeId);
  }
  function syncReferenceIntoSelection(){
    const p=project();
    const api=refApi();
    if(!p||typeof api?.selectedKeys!=="function")return;
    for(const key of [...selected])if(key.startsWith(PREFIX.ref))selected.delete(key);
    for(const raw of api.selectedKeys(p)??[]){
      const split=String(raw).indexOf("|");
      if(split<0)continue;
      selected.add(refKey(String(raw).slice(0,split),String(raw).slice(split+1)));
    }
  }
  function syncSelectionIntoReference(){
    const p=project();
    const api=refApi();
    if(!p||typeof api?.replaceSelection!=="function")return;
    const keys=[];
    for(const key of selected){
      const entry=parseKey(key);
      if(entry?.kind==="ref")keys.push(rawReferenceKey(entry));
    }
    api.replaceSelection(p,keys);
  }

  function clearSelection({keepReference=false}={}){
    selected.clear();
    if(!keepReference)refApi()?.clearSelection?.();
    refreshVisualSelection();
  }
  function replaceSelectionKeys(keys,{announce=true}={}){
    selected.clear();
    refApi()?.clearSelection?.();
    for(const key of Array.isArray(keys)?keys:[]){
      if(typeof key==="string"&&key)selected.add(key);
    }
    syncSelectionIntoReference();
    refreshVisualSelection();
    if(announce)dispatchSelectionChanged("replace");
    return Object.freeze([...selected]);
  }


  function setSelectedKey(key,{additive=false,toggle=false}={}){
    if(!key)return;
    const candidate=parseKey(key);
    if(candidate&&layerApi()?.entryVisibility?.(candidate)?.selectable===false){
      try{if(typeof ptToast==="function")ptToast("Слой заморожен");}catch{}
      return;
    }
    if(!additive){
      selected.clear();
      refApi()?.clearSelection?.();
    }
    if(toggle&&selected.has(key))selected.delete(key);
    else selected.add(key);
    syncSelectionIntoReference();
    refreshVisualSelection();
  }

  function ensureSelectedKey(key){
    syncReferenceIntoSelection();
    if(selected.has(key))return;
    setSelectedKey(key,{additive:false});
  }

  function selectionEntries(){
    syncReferenceIntoSelection();
    return [...selected].map(parseKey).filter(Boolean);
  }

  function keyForTreeRow(row){
    if(!row)return null;
    if(row.matches?.("[data-project-assembly]"))return projectAssemblyKey(row.dataset.projectAssembly);
    if(row.matches?.("[data-assembly-member-key]"))return String(row.dataset.assemblyMemberKey||"")||null;
    if(row.matches?.("[data-project-group]"))return groupKey(row.dataset.projectGroup);
    if(row.matches?.("[data-group-member-key]"))return String(row.dataset.groupMemberKey||"")||null;
    if(row.matches?.("[data-ref-node]")){
      return refKey(row.dataset.refScene,row.dataset.refNode);
    }
    if(row.matches?.("[data-import-mesh-instance]")){
      return meshKey(row.dataset.importMeshInstance);
    }
    if(row.matches?.("[data-tree-tube]")){
      return tubeKey(row.dataset.treeTube);
    }
    if(row.matches?.("[data-tree-row]")){
      return rowKey(activeTubeId(),Number(row.dataset.treeRow));
    }
    if(row.matches?.("[data-tree-end]")){
      return endKey(activeTubeId());
    }
    if(row.matches?.("[data-tree-assembly]")){
      return assemblyKey(activeTubeId(),row.dataset.treeAssembly);
    }
    if(row.matches?.("[data-tree-assembly-part]")){
      const rowIndex=Number(row.dataset.treeRowRef);
      return Number.isInteger(rowIndex)&&rowIndex>=0
        ? rowKey(activeTubeId(),rowIndex)
        : assemblyKey(activeTubeId(),row.dataset.treeAssemblyPart);
    }
    if(row.matches?.("[data-tree-origin]")){
      return tubeKey(activeTubeId());
    }
    return null;
  }

  function treeRowFromTarget(target){
    return target?.closest?.(
      "[data-project-assembly],[data-assembly-member-key],[data-project-group],[data-group-member-key],[data-ref-node],[data-import-mesh-instance],[data-tree-tube],[data-tree-row],[data-tree-end],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin]"
    )??null;
  }

  function projectTreeForEvent(event){
    const target=event?.target;
    const tree=document.getElementById("tbProjectTree");
    if(!tree||!target)return null;
    return tree===target||tree.contains(target)?tree:null;
  }

  function skip3DHit(object){
    if(layerApi()?.is3DObjectInteractive?.(object)===false)return true;
    let item=object;
    while(item){
      const data=item.userData??{};
      if(data.referenceEditableInstanceId)return false;
      if(data.referenceNodeId&&data.referenceSceneId)return false;
      if(
        data.bboxCorner||
        data.dimension||
        data.dofHandle||
        data.dofAxis||
        data.dofRotation||
        data.straightDirectionChoice||
        data.bendDirection||
        data.referenceSelectionHelper||
        data.objectSelectionHelper
      )return true;
      item=item.parent;
    }
    return false;
  }

  function entryFrom3DObject(object){
    let item=object;
    let rowIndex=null;
    let passiveTubeId=null;
    let origin=false;
    while(item){
      const data=item.userData??{};
      if(data.referenceEditableInstanceId){
        return {
          key:meshKey(data.referenceEditableInstanceId),
          entry:{kind:"mesh-instance",instanceId:String(data.referenceEditableInstanceId)}
        };
      }
      if(data.referenceNodeId&&data.referenceSceneId){
        return {
          key:refKey(data.referenceSceneId,data.referenceNodeId),
          entry:{kind:"ref",sceneId:String(data.referenceSceneId),nodeId:String(data.referenceNodeId)}
        };
      }
      if(data.tubeEnd&&activeTubeId()){
        return {key:endKey(activeTubeId()),entry:{kind:"end",tubeId:activeTubeId()}};
      }
      if(data.tubeId)passiveTubeId=String(data.tubeId);
      if(data.originPoint)origin=true;
      if(rowIndex==null&&Number.isInteger(Number(data.rowIndex))){
        rowIndex=Number(data.rowIndex);
      }
      item=item.parent;
    }
    if(passiveTubeId){
      return {key:tubeKey(passiveTubeId),entry:{kind:"tube",tubeId:passiveTubeId}};
    }
    const id=activeTubeId();
    if(origin&&id){
      return {key:tubeKey(id),entry:{kind:"tube",tubeId:id}};
    }
    if(rowIndex!=null&&rowIndex>=0&&id){
      return {key:rowKey(id,rowIndex),entry:{kind:"row",tubeId:id,rowIndex}};
    }
    return null;
  }

  function pick3DCandidates(event){
    if(typeof THREE==="undefined"||typeof camera==="undefined"||typeof pipeGroup==="undefined")return Object.freeze([]);
    if(!camera||!pipeGroup)return Object.freeze([]);
    const canvas=document.getElementById("threeCanvas");
    if(!canvas)return Object.freeze([]);
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return Object.freeze([]);
    ownRaycaster=ownRaycaster||new THREE.Raycaster();
    ownRaycaster.params.Line={threshold:.18};
    const mouse=new THREE.Vector2(
      ((event.clientX-rect.left)/rect.width)*2-1,
      -((event.clientY-rect.top)/rect.height)*2+1
    );
    ownRaycaster.setFromCamera(mouse,camera);
    const hits=ownRaycaster.intersectObjects(pipeGroup.children,true);
    const out=[],seen=new Set();
    for(const hit of hits){
      if(skip3DHit(hit.object))continue;
      const result=entryFrom3DObject(hit.object);
      if(!result||seen.has(result.key))continue;
      seen.add(result.key);
      out.push({...result,distance:Number(hit.distance)||0});
    }
    return Object.freeze(out);
  }
  function pick3D(event){return pick3DCandidates(event)[0]??null;}

  function snapScreenDistance(worldPoint,event,canvas){
    if(!worldPoint||!event||!canvas||typeof THREE==="undefined"||typeof camera==="undefined")return 0;
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return 0;
    const projected=worldPoint.clone().project(camera);
    const sx=rect.left+(projected.x+1)*.5*rect.width;
    const sy=rect.top+(1-projected.y)*.5*rect.height;
    return Math.hypot(Number(event.clientX)-sx,Number(event.clientY)-sy);
  }

  function nearestGeometryVertex(hit){
    const geometry=hit?.object?.geometry,position=geometry?.attributes?.position;
    if(!position||!hit?.object||!hit?.point)return null;
    const indices=[];
    if(hit.face){
      indices.push(hit.face.a,hit.face.b,hit.face.c);
    }else if(Number.isInteger(hit.index)){
      indices.push(hit.index);
    }
    if(!indices.length)return null;
    let best=null,bestDistance=Infinity;
    for(const index of indices){
      if(!Number.isInteger(index)||index<0||index>=position.count)continue;
      const world=new THREE.Vector3().fromBufferAttribute(position,index);
      hit.object.localToWorld(world);
      const d=world.distanceToSquared(hit.point);
      if(d<bestDistance){bestDistance=d;best=world;}
    }
    return best;
  }

  function snapCandidateRecord({id,type,source,objectId,subentityId,world,event,canvas,label,metadata={}}){
    if(!world)return null;
    const scale=typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
    const point={x:world.x/scale,y:world.y/scale,z:world.z/scale};
    const assembly_context=assembliesApi()?.contextForObjectId?.(objectId,point)??{
      space:"project",assembly_id:null,assembly_path:[],local_point_mm:{...point},world_point_mm:{...point}
    };
    const activeAssembly=assembliesApi()?.activeEditAssembly?.()??null;
    const crossAssembly=!!activeAssembly&&String(assembly_context?.assembly_id??"project-root")!==String(activeAssembly.id);
    return {
      id:String(id),
      type:String(type),
      source:String(source||"Editable"),
      object_id:objectId==null?null:String(objectId),
      subentity_id:subentityId==null?null:String(subentityId),
      point,
      screen_distance_px:snapScreenDistance(world,event,canvas),
      visible:true,
      virtual:false,
      fitted:false,
      confidence:1,
      label:String(label||type)+(crossAssembly?" · ↔ Assembly":""),
      metadata:{
        ...structuredClone(metadata??{}),
        assembly_context,
        cross_assembly:crossAssembly,
        source_assembly_id:assembly_context?.assembly_id??null,
        active_assembly_id:activeAssembly?.id??null
      }
    };
  }

  function snapCandidatesAtEvent(event){
    if(typeof THREE==="undefined"||typeof camera==="undefined"||typeof pipeGroup==="undefined")return Object.freeze([]);
    const canvas=document.getElementById("threeCanvas");
    if(!canvas||!camera||!pipeGroup)return Object.freeze([]);
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return Object.freeze([]);
    ownRaycaster=ownRaycaster||new THREE.Raycaster();
    ownRaycaster.params.Line={threshold:.18};
    const mouse=new THREE.Vector2(
      ((event.clientX-rect.left)/rect.width)*2-1,
      -((event.clientY-rect.top)/rect.height)*2+1
    );
    ownRaycaster.setFromCamera(mouse,camera);
    const hits=ownRaycaster.intersectObjects(pipeGroup.children,true);
    const records=[],seen=new Set();
    const add=(record)=>{
      if(!record||seen.has(record.id))return;
      seen.add(record.id);records.push(record);
    };
    for(const hit of hits){
      if(records.length>=18)break;
      if(skip3DHit(hit.object))continue;
      let item=hit.object,source="Editable",objectId=hit.object?.uuid??"object",special=null;
      while(item){
        const data=item.userData??{};
        if(data.referenceEditableInstanceId){
          source="MeshFitted";
          objectId=String(data.referenceEditableInstanceId);
          special={type:"Vertex",item,label:"Mesh Vertex"};
          break;
        }
        if(data.referenceNodeId&&data.referenceSceneId){
          source="SourceReference";
          objectId=String(data.referenceSceneId)+":"+String(data.referenceNodeId);
          special={type:"Vertex",item,label:"Vertex"};
          break;
        }
        if(data.constructionId||data.constructionGeometryId){
          source="Construction";
          objectId=String(data.constructionId??data.constructionGeometryId);
        }
        if(data.tubeEnd===true){special={type:"Endpoint",item,label:"Endpoint"};objectId=data.tubeId??activeTubeId()??objectId;break;}
        if(data.originPoint===true){special={type:"Node",item,label:"Node"};objectId=data.tubeId??activeTubeId()??objectId;break;}
        if(data.tubeId){source="Tube";objectId=String(data.tubeId);}
        item=item.parent;
      }
      if(special){
        let world;
        if(special.type==="Vertex")world=nearestGeometryVertex(hit)??hit.point?.clone?.();
        else{world=new THREE.Vector3();special.item.getWorldPosition(world);}
        add(snapCandidateRecord({
          id:"snap:"+String(objectId)+":"+special.type+":"+(hit.object?.uuid??""),
          type:special.type,source,objectId,subentityId:special.type.toLowerCase(),
          world,event,canvas,label:special.label
        }));
        continue;
      }

      const geometry=hit.object?.geometry;
      if(geometry?.type==="CylinderGeometry"&&Number.isFinite(Number(geometry.parameters?.height))){
        const half=Number(geometry.parameters.height)/2;
        const startWorld=new THREE.Vector3(0,-half,0),midWorld=new THREE.Vector3(0,0,0),endWorld=new THREE.Vector3(0,half,0);
        hit.object.localToWorld(startWorld);hit.object.localToWorld(midWorld);hit.object.localToWorld(endWorld);
        const scale=typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
        const start={x:startWorld.x/scale,y:startWorld.y/scale,z:startWorld.z/scale};
        const end={x:endWorld.x/scale,y:endWorld.y/scale,z:endWorld.z/scale};
        const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,length=Math.hypot(dx,dy,dz);
        const direction=length>1e-12?{x:dx/length,y:dy/length,z:dz/length}:null;
        for(const [type,suffix,world] of [["Endpoint","start",startWorld],["Midpoint","mid",midWorld],["Endpoint","end",endWorld]]){
          add(snapCandidateRecord({
            id:"snap:"+String(objectId)+":"+hit.object.uuid+":"+suffix,
            type,source,objectId,subentityId:suffix,world,event,canvas,label:type
          }));
        }
        if(direction)add(snapCandidateRecord({
          id:"snap:"+String(objectId)+":"+hit.object.uuid+":axis",
          type:"LineAxis",source,objectId,subentityId:"axis:"+hit.object.uuid,world:midWorld,event,canvas,label:"Line Axis",
          metadata:{direction,primitive:{kind:"segment",start,end,direction,parameter_min:0,parameter_max:length}}
        }));
      }else if(geometry?.type==="TorusGeometry"&&Number.isFinite(Number(geometry.parameters?.radius))){
        const scale=typeof GEOM_SCALE==="number"&&Number.isFinite(GEOM_SCALE)&&Math.abs(GEOM_SCALE)>1e-12?GEOM_SCALE:1;
        const radiusLocal=Number(geometry.parameters.radius),centerWorld=new THREE.Vector3(0,0,0),radialWorld=new THREE.Vector3(radiusLocal,0,0);
        hit.object.localToWorld(centerWorld);hit.object.localToWorld(radialWorld);
        const normalWorld=new THREE.Vector3(0,0,1).transformDirection(hit.object.matrixWorld).normalize();
        const center={x:centerWorld.x/scale,y:centerWorld.y/scale,z:centerWorld.z/scale};
        const radial={x:(radialWorld.x-centerWorld.x)/scale,y:(radialWorld.y-centerWorld.y)/scale,z:(radialWorld.z-centerWorld.z)/scale};
        const radius=Math.hypot(radial.x,radial.y,radial.z);
        const basis=radius>1e-12?{x:radial.x/radius,y:radial.y/radius,z:radial.z/radius}:{x:1,y:0,z:0};
        const arcDeg=Number.isFinite(Number(geometry.parameters.arc))?Number(geometry.parameters.arc)*180/Math.PI:360;
        add(snapCandidateRecord({
          id:"snap:"+String(objectId)+":"+hit.object.uuid+":center",
          type:"Center",source,objectId,subentityId:"circle:"+hit.object.uuid,world:centerWorld,event,canvas,label:"Center",
          metadata:{radius_mm:radius,normal:{x:normalWorld.x,y:normalWorld.y,z:normalWorld.z},primitive:{kind:"circle",center,radius_mm:radius,normal:{x:normalWorld.x,y:normalWorld.y,z:normalWorld.z},arc_start_deg:0,arc_end_deg:arcDeg,arc_basis_x:basis}}
        }));
      }else if(geometry?.type==="SphereGeometry"){
        const world=new THREE.Vector3();hit.object.getWorldPosition(world);
        add(snapCandidateRecord({
          id:"snap:"+String(objectId)+":"+hit.object.uuid+":node",
          type:"Node",source,objectId,subentityId:"node",world,event,canvas,label:"Node"
        }));
      }
    }
    return Object.freeze(records);
  }

  function applyMaterialOpacity(object,opacity){
    if(!object?.material)return;
    const materials=Array.isArray(object.material)?object.material:[object.material];
    for(const material of materials){
      if(!material)continue;
      material.transparent=opacity<.999;
      material.opacity=opacity;
      material.depthWrite=opacity>=.999;
      material.needsUpdate=true;
    }
  }

  function ancestorData(object,predicate){
    let item=object;
    while(item){
      if(predicate(item.userData??{},item))return item;
      item=item.parent;
    }
    return null;
  }

  function decorateRenderedObjects(){
    if(typeof pipeGroup==="undefined"||!pipeGroup)return;
    const p=project();
    const currentId=activeTubeId();

    // Persist per-row and per-tube display state after every full 3D rebuild.
    pipeGroup.traverse((object)=>{
      if(object.userData?.referenceGeometry||object.userData?.referenceSelectionHelper)return;
      const passive=ancestorData(object,(data)=>!!data.tubeId);
      if(passive){
        const tube=tubeById(passive.userData.tubeId);
        if(tube?.uiHiddenIn3D===true)passive.visible=false;
        if(isRecognizedTube(tube)){
          tube.uiTransparentIn3D=false;
          if(!object.userData?.helper)applyMaterialOpacity(object,1);
        }else if(tube?.uiTransparentIn3D===true&&!object.userData?.helper){
          applyMaterialOpacity(object,.24);
        }
        return;
      }

      const rowHolder=ancestorData(object,(data)=>Number.isInteger(Number(data.rowIndex))&&data.pipe===true);
      if(rowHolder&&currentId){
        const index=Number(rowHolder.userData.rowIndex);
        const row=state?.rows?.[index];
        const tube=tubeById(currentId);
        if(row?.uiHiddenIn3D===true||tube?.uiHiddenIn3D===true){
          rowHolder.visible=false;
        }
        if(isRecognizedTube(tube)){
          tube.uiTransparentIn3D=false;
          if(row)row.uiTransparentIn3D=false;
          if(!object.userData?.helper)applyMaterialOpacity(object,1);
        }else if((row?.uiTransparentIn3D===true||tube?.uiTransparentIn3D===true)&&!object.userData?.helper){
          applyMaterialOpacity(object,.24);
        }
      }
    });

    if(Array.isArray(labels)){
      for(const item of labels){
        const index=Number(item?.rowIndex);
        const row=Number.isInteger(index)?state?.rows?.[index]:null;
        if(item?.el)item.el.style.display=row?.uiHiddenIn3D===true?"none":"";
      }
    }

    addSelectionHelpers();
  }

  function boxForObjects(objects){
    if(typeof THREE==="undefined")return null;
    const box=new THREE.Box3();
    let has=false;
    for(const object of objects){
      if(!object||object.visible===false)continue;
      const current=new THREE.Box3().setFromObject(object);
      if(current.isEmpty())continue;
      if(!has){box.copy(current);has=true;}else box.union(current);
    }
    return has?box:null;
  }

  function addSelectionHelpers(){
    if(typeof THREE==="undefined"||typeof pipeGroup==="undefined"||!pipeGroup)return;
    syncReferenceIntoSelection();
    const entries=selectionEntries().filter((entry)=>entry.kind!=="ref");
    for(const entry of entries){
      let objects=[];
      if(entry.kind==="tube"){
        if(entry.tubeId===activeTubeId()){
          pipeGroup.traverse((object)=>{
            if(object.userData?.referenceGeometry||object.userData?.helper)return;
            if(object.userData?.pipe===true&&Number.isInteger(Number(object.userData.rowIndex))){
              objects.push(object);
            }
          });
        }else{
          pipeGroup.traverse((object)=>{
            if(String(object.userData?.tubeId??"")===String(entry.tubeId))objects.push(object);
          });
        }
      }else if(entry.kind==="end"){
        if(entry.tubeId!==activeTubeId())continue;
        pipeGroup.traverse((object)=>{
          if(object.userData?.tubeEnd===true&&!object.userData?.objectSelectionHelper)objects.push(object);
        });
      }else if(entry.kind==="row"){
        if(entry.tubeId!==activeTubeId())continue;
        pipeGroup.traverse((object)=>{
          if(
            object.userData?.pipe===true&&
            Number(object.userData.rowIndex)===Number(entry.rowIndex)&&
            !object.userData?.helper
          )objects.push(object);
        });
      }else if(entry.kind==="assembly"){
        if(entry.tubeId!==activeTubeId())continue;
        const indices=[];
        (state?.rows??[]).forEach((row,index)=>{
          if(String(row?.assemblyId??"")===String(entry.assemblyId))indices.push(index);
        });
        pipeGroup.traverse((object)=>{
          if(
            object.userData?.pipe===true&&
            indices.includes(Number(object.userData.rowIndex))&&
            !object.userData?.helper
          )objects.push(object);
        });
      }
      const box=boxForObjects(objects);
      if(!box)continue;
      const helper=new THREE.Box3Helper(box,0xffd54a);
      helper.userData.helper=true;
      helper.userData.objectSelectionHelper=true;
      pipeGroup.add(helper);
    }
  }

  function treeRowForKey(key){
    const host=document.getElementById("tbProjectTree");
    if(!host||!key)return null;
    for(const row of host.querySelectorAll(
      "[data-project-group],[data-group-member-key],[data-ref-node],[data-tree-tube],[data-tree-row],[data-tree-end],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin]"
    )){
      if(keyForTreeRow(row)===key)return row;
    }
    return null;
  }

  function scrollTreeSelectionIntoView(key){
    const attempt=(remaining)=>{
      const row=treeRowForKey(key);
      if(row){
        row.scrollIntoView?.({block:"nearest",inline:"nearest",behavior:"auto"});
        return;
      }
      if(remaining>0)requestAnimationFrame(()=>attempt(remaining-1));
    };
    requestAnimationFrame(()=>attempt(3));
  }

  function revealTreeKey(key){
    const entry=parseKey(key);
    const p=project();
    if(!entry||!p)return false;

    if(entry.kind==="ref"){
      const changed=refApi()?.revealNode?.(p,entry.sceneId,entry.nodeId)===true;
      if(changed){
        try{if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
      }
    }else{
      try{if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
    }

    requestAnimationFrame(()=>{
      updateTreeSelectionStyles();
      scrollTreeSelectionIntoView(key);
    });
    return true;
  }

  function adoptReferenceSelection({source="tree",replaceNonReference=false}={}){
    if(replaceNonReference){
      for(const key of [...selected]){
        if(!key.startsWith(PREFIX.ref))selected.delete(key);
      }
    }
    syncReferenceIntoSelection();
    updateTreeSelectionStyles();
    try{
      if(typeof update3D==="function")update3D();
      if(typeof markViewerDirty==="function")markViewerDirty();
    }catch{}
    return selected.size;
  }

  function refreshVisualSelection(){
    updateTreeSelectionStyles();
    try{
      if(typeof update3D==="function")update3D();
      if(typeof markViewerDirty==="function")markViewerDirty();
    }catch{}
    try{
      window.dispatchEvent(new CustomEvent("tubebender-selection-change",{
        detail:{entries:selectionEntries()}
      }));
    }catch{}
  }

  function updateTreeSelectionStyles(){
    const host=document.getElementById("tbProjectTree");
    if(!host)return;
    syncReferenceIntoSelection();
    host.querySelectorAll(".tb-object-selected").forEach((node)=>{
      node.classList.remove("tb-object-selected");
      node.removeAttribute("aria-selected");
    });
    for(const row of host.querySelectorAll(
      "[data-project-assembly],[data-assembly-member-key],[data-project-group],[data-group-member-key],[data-ref-node],[data-tree-tube],[data-tree-row],[data-tree-end],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin]"
    )){
      const key=keyForTreeRow(row);
      if(key&&selected.has(key)){
        row.classList.add("tb-object-selected");
        row.setAttribute("aria-selected","true");
      }
    }
  }

  function canMoveSelection(){
    const entries=selectionEntries();
    if(!entries.length)return false;
    const groups=entries.filter(entry=>entry.kind==="group");
    const projectAssemblies=entries.filter(entry=>entry.kind==="project-assembly");
    if(groups.length||projectAssemblies.length){
      return groups.length===entries.length||projectAssemblies.length===entries.length;
    }
    return entries.every((entry)=>{
      if(entry.kind==="ref"||entry.kind==="mesh-instance")return true;
      if(entry.kind!=="tube")return false;
      const tube=tubeById(entry.tubeId);
      return tube?.array_member?.derived_readonly!==true&&tube?.mirror_member?.derived_readonly!==true&&tube?.transform_stack_member?.derived_readonly!==true;
    });
  }

  function endConstraintSelection(entries=selectionEntries()){
    if(!Array.isArray(entries)||entries.length!==1)return null;
    const entry=entries[0];
    if(entry?.kind!=="end")return null;
    const tube=tubeById(entry.tubeId);
    if(!tube)return null;
    const fixed=tube?.engineering?.ports?.P2?.locked===true;
    return {entry,tube,fixed};
  }

  function toggleEndConstraint(){
    const selectedEnd=endConstraintSelection();
    if(!selectedEnd)return false;
    if(!lockAllowed("anchor"))return false;
    const api=window.TubeBenderEngineering;
    if(typeof api?.setEndConstraint!=="function"){
      if(typeof ptToast==="function")ptToast("Связь конца трубы недоступна");
      return false;
    }
    const makeFixed=!selectedEnd.fixed;
    if(makeFixed&&fittedApi()?.confirmUsage?.("TubeFixation",selectedEnd.tube)!==true)return false;
    const mutate=()=>{
      const result=api.setEndConstraint(selectedEnd.tube,makeFixed);
      if(result?.ok===false){
        if(typeof ptToast==="function")ptToast(result.message||"Не удалось изменить связь конца трубы");
        return false;
      }
      return true;
    };
    const label=makeFixed?"Зафиксировать конец трубы":"Освободить конец трубы";
    const ok=typeof tbModelCommand==="function"?tbModelCommand(label,mutate):mutate();
    if(ok===false)return false;
    try{if(typeof save==="function")save();}catch{}
    try{if(typeof renderAll==="function")renderAll();}catch{}
    try{if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
    refreshVisualSelection();
    if(typeof ptToast==="function")ptToast(makeFixed?"⚓ Конец трубы зафиксирован":"Конец трубы освобождён");
    return true;
  }

  function invalidElementDiagnosis(entries=selectionEntries()){
    if(!Array.isArray(entries)||entries.length!==1)return null;
    const entry=entries[0];
    if(entry?.kind!=="row")return null;
    const tube=tubeById(entry.tubeId);
    if(!tube)return null;
    let issues=[];
    try{
      if(typeof tubeRowValidationIssues==="function"){
        issues=tubeRowValidationIssues(tube,entry.rowIndex)??[];
      }
    }catch{}
    issues=[...new Set(
      (Array.isArray(issues)?issues:[])
        .map((value)=>String(value??"").trim())
        .filter(Boolean)
    )];
    if(!issues.length)return null;
    const row=rowFor(entry);
    const type=row?.type==="BEND"?"Гиб":
      row?.type==="LINE"?"Прямой участок":
      "Элемент";
    return {
      entry,
      tube,
      row,
      issues,
      title:type+" "+(Number(entry.rowIndex)+1)
    };
  }

  function ensureIssuesPanel(){
    if(issuesPanel)return issuesPanel;
    const panel=document.createElement("div");
    panel.id="tbObjectIssuesPanel";
    panel.className="tb-object-issues-panel";
    panel.innerHTML=
      '<div class="tb-object-issues-head">'+
      '<div><b data-issues-title>Что не правильно?</b><div data-issues-subtitle></div></div>'+
      '<button type="button" data-issues-close aria-label="Закрыть">×</button>'+
      '</div>'+
      '<div class="tb-object-issues-list" data-issues-list></div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-issues-close]")?.addEventListener("click",()=>panel.style.display="none");
    issuesPanel=panel;
    return panel;
  }

  function openInvalidElementDiagnosis(){
    const diagnosis=invalidElementDiagnosis();
    if(!diagnosis)return false;
    const panel=ensureIssuesPanel();
    const subtitle=panel.querySelector("[data-issues-subtitle]");
    if(subtitle){
      subtitle.textContent=diagnosis.title+
        (diagnosis.tube?.name?" · "+String(diagnosis.tube.name):"");
    }
    const list=panel.querySelector("[data-issues-list]");
    if(list){
      list.innerHTML="";
      diagnosis.issues.forEach((issue)=>{
        const row=document.createElement("div");
        row.className="tb-object-issue-row";
        const marker=document.createElement("span");
        marker.className="tb-object-issue-marker";
        marker.textContent="!";
        const text=document.createElement("span");
        text.textContent=issue;
        row.append(marker,text);
        list.appendChild(row);
      });
    }
    panel.style.display="block";
    panel.style.left=Math.max(12,(window.innerWidth-panel.offsetWidth)/2)+"px";
    panel.style.top=Math.max(12,(window.innerHeight-panel.offsetHeight)/2)+"px";
    return true;
  }

  function ensureContextMenu(){
    if(contextMenu)return contextMenu;
    const menu=document.createElement("div");
    menu.id="tbObjectContextMenu";
    menu.className="tb-object-context-menu";
    menu.innerHTML=
      '<div class="tb-object-context-title" data-context-title>Выбрано: 1</div>'+
      '<button type="button" data-object-action="move">↔ <span>Переместить…</span></button>'+
      '<button type="button" data-object-action="hide">◌ <span>Скрыть</span></button>'+
      '<button type="button" data-object-action="isolate">◎ <span>Скрыть другие</span></button>'+
      '<button type="button" data-object-action="show">◉ <span>Показать</span></button>'+
      '<button type="button" data-object-action="show-all">◉ <span>Показать все</span></button>'+
      '<button type="button" data-object-action="transparent">◫ <span>Прозрачность</span></button>'+
      '<button type="button" data-object-action="compare-source">⇄ <span>Сравнить с Source</span></button>'+
      '<button type="button" data-object-action="break-mesh-link">⛓̸ <span>Разорвать Source Link</span></button>'+
      '<button type="button" class="anchor-end" data-object-action="anchor-end">⚓ <span>Зафиксировать</span></button>'+
      '<button type="button" class="diagnose" data-object-action="diagnose">? <span>Что не правильно?</span></button>'+
      '<button type="button" data-object-action="normalize-geometry">◎ <span>Fitted → Exact / Normalize</span></button>'+
      '<button type="button" data-object-action="compare-normalized">⇄ <span>Compare with Fitted</span></button>'+
      '<div class="tb-object-context-separator"></div>'+
      '<button type="button" data-object-action="selection-cycle">⧉ <span>Выбрать объект под курсором</span></button>'+
      '<div class="tb-object-context-separator"></div>'+
      '<button type="button" data-object-action="lock-object">🔒 <span>Lock Object</span></button>'+
      '<button type="button" data-object-action="lock-position">📍 <span>Lock Position</span></button>'+
      '<button type="button" data-object-action="unlock-object">🔓 <span>Разблокировать</span></button>'+
      '<div class="tb-object-context-separator"></div>'+
      '<button type="button" class="danger" data-object-action="delete">🗑 <span>Удалить</span></button>';
    document.body.appendChild(menu);
    menu.addEventListener("click",(event)=>{
      const button=event.target.closest("[data-object-action]");
      if(!button||button.disabled)return;
      const action=button.dataset.objectAction;
      hideContextMenu();
      if(action==="move")openMovePanel();
      else if(action==="anchor-end")toggleEndConstraint();
      else if(action==="diagnose")openInvalidElementDiagnosis();
      else if(action==="compare-source")toggleMeshSourceCompare();
      else if(action==="break-mesh-link")breakSelectedMeshLinks();
      else if(action==="selection-cycle"){
        const candidates=selectionCycle.candidates.length?selectionCycle.candidates:[];
        if(candidates.length)showObjectChooser({clientX:selectionCycle.clientX,clientY:selectionCycle.clientY},candidates);
      }
      else if(action==="normalize-geometry")normalizeApi()?.normalizeSelected?.();
      else if(action==="compare-normalized"){
        const target=(normalizeApi()?.selectedTargets?.()??[]).find(item=>item.object?.normalization_provenance?.operation==="FittedToExact");
        if(target)normalizeApi()?.compareNormalized?.(target.object.id,{visible:!(target.object.normalization_compare?.enabled===true)});
      }
      else if(action==="lock-object")lockApi()?.lockObject?.();
      else if(action==="lock-position")lockApi()?.lockPosition?.();
      else if(action==="unlock-object")lockApi()?.unlockSelection?.();
      else applyAction(action);
    });
    contextMenu=menu;
    return menu;
  }

  function showContextMenu(event,{source="3d",allowEmpty=false,selectionAvailable=true}={}){
    const entries=selectionAvailable?selectionEntries():[];
    if(!entries.length&&!allowEmpty)return;
    const menu=ensureContextMenu();
    const hasSelection=entries.length>0;
    const title=menu.querySelector("[data-context-title]");
    if(title)title.textContent=hasSelection
      ?"Выбрано: "+entries.length
      :(source==="3d"?"3D-окно":"Дерево проекта");
    for(const button of menu.querySelectorAll("[data-object-action]")){
      const action=button.dataset.objectAction;
      if(action!=="show-all")button.hidden=!hasSelection;
    }
    const endSelection=hasSelection?endConstraintSelection(entries):null;
    const anchorEnd=menu.querySelector('[data-object-action="anchor-end"]');
    if(anchorEnd){
      anchorEnd.hidden=!endSelection;
      anchorEnd.disabled=!endSelection;
      const label=anchorEnd.querySelector("span");
      if(label)label.textContent=endSelection?.fixed?"Освободить":"Зафиксировать";
      anchorEnd.title=endSelection
        ?(endSelection.fixed
          ?"Освободить конец трубы — он снова сможет изменять положение при редактировании геометрии"
          :"Зафиксировать текущие мировые координаты конца трубы")
        :"";
    }
    if(endSelection){
      for(const button of menu.querySelectorAll("[data-object-action]")){
        if(button.dataset.objectAction!=="anchor-end")button.hidden=true;
      }
      if(title)title.textContent="Конец трубы";
    }
    const diagnosis=hasSelection?invalidElementDiagnosis(entries):null;
    const diagnose=menu.querySelector('[data-object-action="diagnose"]');
    if(diagnose){
      diagnose.hidden=endSelection||!diagnosis;
      diagnose.disabled=endSelection||!diagnosis;
      diagnose.title=diagnosis
        ?diagnosis.issues.join("\n")
        :"Доступно только для некорректного элемента трубы";
    }
    const normalizable=normalizeApi()?.normalizedTargets?.()??[];
    const normalizeButton=menu.querySelector('[data-object-action="normalize-geometry"]');
    const compareNormalizedButton=menu.querySelector('[data-object-action="compare-normalized"]');
    const normalizeTargets=normalizeApi()?.selectedTargets?.()??[];
    const normalizedSelected=normalizeTargets.filter(target=>target.object?.normalization_provenance?.operation==="FittedToExact");
    if(normalizeButton){
      normalizeButton.hidden=endSelection||normalizable.length===0;
      normalizeButton.disabled=normalizable.length===0;
    }
    if(compareNormalizedButton){
      compareNormalizedButton.hidden=endSelection||normalizedSelected.length!==1;
      compareNormalizedButton.disabled=normalizedSelected.length!==1;
    }
    const meshEntries=entries.filter((entry)=>entry.kind==="mesh-instance");
    const compareSource=menu.querySelector('[data-object-action="compare-source"]');
    const breakMesh=menu.querySelector('[data-object-action="break-mesh-link"]');
    const meshOnly=meshEntries.length>0&&meshEntries.length===entries.length;
    const linkedMeshes=meshEntries.filter((entry)=>refApi()?.meshInstanceById?.(project(),entry.instanceId)?.link_status!=="detached");
    if(compareSource){
      compareSource.hidden=!meshOnly||!linkedMeshes.length;
      compareSource.disabled=!meshOnly||!linkedMeshes.length;
    }
    if(breakMesh){
      breakMesh.hidden=!meshOnly||!linkedMeshes.length;
      breakMesh.disabled=!meshOnly||!linkedMeshes.length;
    }
    const lockTargets=lockApi()?.selectionTargets?.()??[];
    const lockObjectButton=menu.querySelector('[data-object-action="lock-object"]');
    const lockPositionButton=menu.querySelector('[data-object-action="lock-position"]');
    const unlockButton=menu.querySelector('[data-object-action="unlock-object"]');
    const hasLockTarget=lockTargets.length>0;
    const modes=new Set(lockTargets.map((target)=>String(target.mode??"Unlocked")));
    if(lockObjectButton){
      lockObjectButton.hidden=!hasLockTarget;
      lockObjectButton.disabled=!hasLockTarget||(modes.size===1&&modes.has("Object"));
    }
    if(lockPositionButton){
      lockPositionButton.hidden=!hasLockTarget;
      lockPositionButton.disabled=!hasLockTarget||(modes.size===1&&modes.has("Position"));
    }
    if(unlockButton){
      unlockButton.hidden=!hasLockTarget;
      unlockButton.disabled=!hasLockTarget||(modes.size===1&&modes.has("Unlocked"));
    }
    const selectionCycleButton=menu.querySelector('[data-object-action="selection-cycle"]');
    if(selectionCycleButton){
      const count=selectionCycle.candidates.length;
      selectionCycleButton.hidden=source!=="3d"||count<2;
      selectionCycleButton.disabled=count<2;
      const label=selectionCycleButton.querySelector("span");
      if(label)label.textContent="Выбрать объект под курсором"+(count>1?" ("+count+")":"");
    }
    const move=menu.querySelector('[data-object-action="move"]');
    if(move){
      const allowed=hasSelection&&!endSelection&&source==="3d"&&canMoveSelection()&&lockAllowed("move",{notify:false});
      move.hidden=!!endSelection||!hasSelection||source!=="3d";
      move.disabled=!allowed;
      move.title=allowed
        ?"Переместить выбранные объекты на ΔX / ΔY / ΔZ"
        :"Перемещение доступно для целых труб и импортированных компонентов";
    }
    menu.style.display="block";
    const margin=8;
    const rect=menu.getBoundingClientRect();
    const x=Math.min(event.clientX,window.innerWidth-rect.width-margin);
    const y=Math.min(event.clientY,window.innerHeight-rect.height-margin);
    menu.style.left=Math.max(margin,x)+"px";
    menu.style.top=Math.max(margin,y)+"px";
  }

  function hideContextMenu(){
    if(contextMenu)contextMenu.style.display="none";
  }

  function ensureMovePanel(){
    if(movePanel)return movePanel;
    const panel=document.createElement("div");
    panel.id="tbObjectMovePanel";
    panel.className="tb-object-move-panel";
    panel.innerHTML=
      '<div class="tb-object-move-head"><b>Перемещение выбранных объектов</b><button type="button" data-move-close>×</button></div>'+
      '<div class="tb-object-move-grid">'+
      '<label>ΔX, мм</label><input type="number" step="1" value="0" data-move-axis="x">'+
      '<label>ΔY, мм</label><input type="number" step="1" value="0" data-move-axis="y">'+
      '<label>ΔZ, мм</label><input type="number" step="1" value="0" data-move-axis="z">'+
      '</div>'+
      '<div class="tb-object-move-actions"><button type="button" data-move-cancel>Отмена</button><button type="button" class="primary" data-move-apply>Переместить</button></div>';
    document.body.appendChild(panel);
    panel.querySelector("[data-move-close]")?.addEventListener("click",closeMovePanel);
    panel.querySelector("[data-move-cancel]")?.addEventListener("click",closeMovePanel);
    panel.querySelector("[data-move-apply]")?.addEventListener("click",()=>{
      const delta={x:0,y:0,z:0};
      for(const input of panel.querySelectorAll("[data-move-axis]")){
        const value=Number(input.value);
        if(!Number.isFinite(value)){
          if(typeof ptToast==="function")ptToast("Введите числовое смещение");
          return;
        }
        delta[input.dataset.moveAxis]=value;
      }
      if(applyMove(delta))closeMovePanel();
    });
    movePanel=panel;
    return panel;
  }

  function openMovePanel(){
    if(!canMoveSelection())return;
    const panel=ensureMovePanel();
    panel.querySelectorAll("[data-move-axis]").forEach((input)=>input.value="0");
    panel.style.display="block";
    panel.style.left=Math.max(12,(window.innerWidth-panel.offsetWidth)/2)+"px";
    panel.style.top=Math.max(12,(window.innerHeight-panel.offsetHeight)/2)+"px";
    panel.querySelector('[data-move-axis="x"]')?.focus();
    panel.querySelector('[data-move-axis="x"]')?.select();
  }
  function closeMovePanel(){if(movePanel)movePanel.style.display="none";}

  function toggleMeshSourceCompare(){
    const p=project(),meshEntries=selectionEntries().filter((entry)=>entry.kind==="mesh-instance");
    if(!p||!meshEntries.length)return false;
    const mutate=()=>{
      for(const entry of meshEntries){
        const instance=refApi()?.meshInstanceById?.(p,entry.instanceId);
        if(!instance||instance.link_status==="detached")continue;
        instance.compare_source=instance.compare_source!==true;
        instance.source_visible=instance.compare_source===true;
      }
      return true;
    };
    const ok=typeof tbModelCommand==="function"?tbModelCommand("Сравнить Mesh Instance с Source",mutate):mutate();
    if(ok===false)return false;
    try{if(typeof save==="function")save();if(typeof renderAll==="function")renderAll();if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
    refreshVisualSelection();return true;
  }

  function breakSelectedMeshLinks(){
    const p=project(),meshEntries=selectionEntries().filter((entry)=>entry.kind==="mesh-instance");
    if(!p||!meshEntries.length)return false;
    if(!lockAllowed("break-link"))return false;
    const mutate=()=>{
      for(const entry of meshEntries){
        refApi()?.breakEditableMeshInstanceLink?.(p,entry.instanceId);
      }
      return true;
    };
    const ok=typeof tbModelCommand==="function"?tbModelCommand("Разорвать Source Link mesh instance",mutate):mutate();
    if(ok===false)return false;
    try{if(typeof save==="function")save();if(typeof renderAll==="function")renderAll();if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
    refreshVisualSelection();return true;
  }

  function selectedReferenceEntries(entries){
    return entries.filter((entry)=>entry.kind==="ref");
  }
  function selectedMeshEntries(entries){
    return entries.filter((entry)=>entry.kind==="mesh-instance");
  }
  function prepareReferenceSelection(entries){
    const api=refApi();
    const p=project();
    if(!api||!p)return;
    const raw=selectedReferenceEntries(entries).map(rawReferenceKey);
    api.replaceSelection?.(p,raw);
  }

  function applyMove(delta){
    const entries=selectionEntries();
    if(!entries.length||!canMoveSelection())return false;
    if(!lockAllowed("move"))return false;
    if(assembliesApi()?.editing?.()&&assembliesApi()?.canHandleEditEntries?.(entries)){
      return assembliesApi()?.moveEditEntries?.(entries,delta)??false;
    }
    if(entries.every(entry=>entry.kind==="group")){
      return groupsApi()?.moveGroups?.(entries.map(entry=>entry.groupId),delta)??false;
    }
    if(entries.every(entry=>entry.kind==="project-assembly")){
      return assembliesApi()?.moveAssemblies?.(entries.map(entry=>entry.assemblyId),delta)??false;
    }
    const p=project();
    if(!p)return false;

    let createdInstanceIds=[];
    const mutate=()=>{
      if(typeof syncActiveTubeFromState==="function")syncActiveTubeFromState();
      const refEntries=selectedReferenceEntries(entries);
      if(refEntries.length){
        prepareReferenceSelection(entries);
        const result=refApi()?.moveSelection?.(p,delta);
        createdInstanceIds=Array.isArray(result?.instance_ids)?result.instance_ids.map(String):[];
      }
      for(const entry of selectedMeshEntries(entries)){
        refApi()?.moveEditableMeshInstance?.(p,entry.instanceId,delta);
      }

      const originals=[];
      for(const entry of entries){
        if(entry.kind!=="tube")continue;
        const tube=tubeById(entry.tubeId);
        if(!tube)continue;
        const origin=tube.origin??{x:0,y:0,z:0};
        originals.push({tube,origin:{x:Number(origin.x)||0,y:Number(origin.y)||0,z:Number(origin.z)||0}});
        tube.origin={
          x:Number(((Number(origin.x)||0)+delta.x).toFixed(6)),
          y:Number(((Number(origin.y)||0)+delta.y).toFixed(6)),
          z:Number(((Number(origin.z)||0)+delta.z).toFixed(6))
        };
        try{if(typeof markImportedOriginOverride==="function")markImportedOriginOverride(tube);}catch{}
      }

      // Keep the whole move atomic if a moved editable tube leaves the allowed frame.
      let invalid=false;
      for(const {tube} of originals){
        try{
          if(typeof analyzeTubeBounds==="function"&&!analyzeTubeBounds(tube)?.valid){
            invalid=true;
            break;
          }
        }catch{}
      }
      if(invalid){
        for(const item of originals)item.tube.origin=item.origin;
        if(typeof ptToast==="function")ptToast("Перемещение отменено: труба выходит за габаритную рамку");
        return false;
      }

      const active=tubeById(activeTubeId());
      if(active&&entries.some((entry)=>entry.kind==="tube"&&entry.tubeId===active.id)){
        state.origin={...active.origin};
      }
      return true;
    };

    const wholeObjectCommand=window.TubeBenderEngineering?.wholeObjectCommand;
    const ok=typeof wholeObjectCommand==="function"
      ? wholeObjectCommand("Переместить выбранные объекты",mutate)
      : typeof tbModelCommand==="function"
        ? tbModelCommand("Переместить выбранные объекты",mutate)
        : mutate();
    if(ok===false)return false;
    if(createdInstanceIds.length){
      selected.clear();
      refApi()?.clearSelection?.();
      for(const id of createdInstanceIds)selected.add(meshKey(id));
    }
    try{if(typeof save==="function")save();}catch{}
    try{if(typeof renderAll==="function")renderAll();}catch{}
    try{if(typeof refreshProjectTree==="function")refreshProjectTree();}catch{}
    refreshVisualSelection();
    updateTreeSelectionStyles();
    return true;
  }

  function setDisplayState(entry,action){
    if(entry.kind==="tube"){
      const tube=tubeById(entry.tubeId);
      if(!tube)return;
      if(action==="hide")tube.uiHiddenIn3D=true;
      if(action==="show"){
        tube.uiHiddenIn3D=false;
        tube.visible=true;
      }
      return;
    }
    if(entry.kind==="row"){
      const row=rowFor(entry);
      if(!row)return;
      row.uiHiddenIn3D=action==="hide";
      return;
    }
    if(entry.kind==="assembly"){
      const tube=tubeById(entry.tubeId);
      for(const row of tube?.rows??[]){
        if(String(row?.assemblyId??"")===String(entry.assemblyId)){
          row.uiHiddenIn3D=action==="hide";
        }
      }
    }
  }

  function isolateEditableSelection(entries,projectValue){
    const wholeTubes=new Set(
      entries
        .filter((entry)=>entry.kind==="tube")
        .map((entry)=>String(entry.tubeId))
    );
    const rowsByTube=new Map();
    const assembliesByTube=new Map();

    for(const entry of entries){
      const tubeId=String(entry.tubeId??"");
      if(!tubeId)continue;
      if(entry.kind==="row"){
        const set=rowsByTube.get(tubeId)??new Set();
        set.add(Number(entry.rowIndex));
        rowsByTube.set(tubeId,set);
      }else if(entry.kind==="assembly"){
        const set=assembliesByTube.get(tubeId)??new Set();
        set.add(String(entry.assemblyId));
        assembliesByTube.set(tubeId,set);
      }
    }

    for(const tube of projectValue?.tubes??[]){
      const tubeId=String(tube?.id??"");
      const keepWhole=wholeTubes.has(tubeId);
      const rowSet=rowsByTube.get(tubeId)??new Set();
      const assemblySet=assembliesByTube.get(tubeId)??new Set();
      const partial=rowSet.size>0||assemblySet.size>0;

      if(keepWhole){
        tube.uiHiddenIn3D=false;
        tube.visible=true;
        for(const row of tube.rows??[])row.uiHiddenIn3D=false;
        continue;
      }

      if(partial){
        tube.uiHiddenIn3D=false;
        tube.visible=true;
        (tube.rows??[]).forEach((row,index)=>{
          const keep=
            rowSet.has(index)||
            (row?.assemblyId&&assemblySet.has(String(row.assemblyId)));
          row.uiHiddenIn3D=!keep;
        });
        continue;
      }

      tube.uiHiddenIn3D=true;
    }

    // Keep the active legacy row array synchronized with the active project tube.
    const active=tubeById(activeTubeId());
    if(active&&Array.isArray(state?.rows)&&Array.isArray(active.rows)){
      state.rows.forEach((row,index)=>{
        if(active.rows[index])row.uiHiddenIn3D=active.rows[index].uiHiddenIn3D===true;
      });
    }
  }

  function toggleTransparency(entries){
    const editable=entries.filter((entry)=>{
      if(entry.kind==="ref")return false;
      const tube=tubeById(entry.tubeId);
      return !isRecognizedTube(tube);
    });
    const allTransparent=editable.length>0&&editable.every((entry)=>{
      if(entry.kind==="tube")return tubeById(entry.tubeId)?.uiTransparentIn3D===true;
      if(entry.kind==="row")return rowFor(entry)?.uiTransparentIn3D===true;
      if(entry.kind==="assembly"){
        const tube=tubeById(entry.tubeId);
        const rows=(tube?.rows??[]).filter((row)=>String(row?.assemblyId??"")===String(entry.assemblyId));
        return rows.length>0&&rows.every((row)=>row.uiTransparentIn3D===true);
      }
      return false;
    });
    const next=!allTransparent;
    for(const entry of entries){
      if(entry.kind==="ref")continue;
      const tube=tubeById(entry.tubeId);
      if(!isRecognizedTube(tube))continue;
      tube.uiTransparentIn3D=false;
      if(entry.kind==="row"){
        const row=rowFor(entry);
        if(row)row.uiTransparentIn3D=false;
      }else if(entry.kind==="assembly"){
        for(const row of tube?.rows??[]){
          if(String(row?.assemblyId??"")===String(entry.assemblyId)){
            row.uiTransparentIn3D=false;
          }
        }
      }
    }
    for(const entry of editable){
      if(entry.kind==="tube"){
        const tube=tubeById(entry.tubeId);
        if(tube)tube.uiTransparentIn3D=next;
      }else if(entry.kind==="row"){
        const row=rowFor(entry);
        if(row)row.uiTransparentIn3D=next;
      }else if(entry.kind==="assembly"){
        const tube=tubeById(entry.tubeId);
        for(const row of tube?.rows??[]){
          if(String(row?.assemblyId??"")===String(entry.assemblyId)){
            row.uiTransparentIn3D=next;
          }
        }
      }
    }
  }

  function deleteRows(entries){
    const activeId=activeTubeId();
    const activeRows=entries
      .filter((entry)=>entry.kind==="row"&&entry.tubeId===activeId)
      .map((entry)=>Number(entry.rowIndex))
      .filter((index)=>Number.isInteger(index)&&index>=0)
      .sort((a,b)=>b-a);
    const assemblies=new Set(
      entries
        .filter((entry)=>entry.kind==="assembly"&&entry.tubeId===activeId)
        .map((entry)=>String(entry.assemblyId))
    );
    for(const index of activeRows){
      const row=state?.rows?.[index];
      if(row?.assemblyId)assemblies.add(String(row.assemblyId));
    }
    for(const assemblyId of assemblies){
      state.rows=normalizeTubeRowStart(
        (state.rows??[]).filter((row)=>String(row?.assemblyId??"")!==assemblyId),
        state.diameterIndex
      );
    }
    for(const index of activeRows){
      const row=state?.rows?.[index];
      if(!row||row.assemblyId)continue;
      if(row.type!=="BEND"){
        if(typeof ptToast==="function")ptToast("Прямой участок удаляется только вместе с предыдущим гибом");
        continue;
      }
      const count=state.rows[index+1]?.type==="LINE"&&!state.rows[index+1]?.assemblyId?2:1;
      state.rows.splice(index,count);
      state.rows=normalizeTubeRowStart(state.rows,state.diameterIndex);
    }
  }

  function deleteTubes(entries){
    const p=project();
    if(!p)return;
    const requested=entries.filter((entry)=>entry.kind==="tube");
    const derived=requested.filter((entry)=>{const tube=tubeById(entry.tubeId);return tube?.array_member?.derived_readonly===true||tube?.mirror_member?.derived_readonly===true||tube?.transform_stack_member?.derived_readonly===true;});
    if(derived.length){
      if(typeof ptToast==="function")ptToast("Элемент ассоциативного массива нельзя удалить напрямую; Mirror / Transform Stack также управляются через свою операцию — используйте Suppress / Detach / Break Array либо Bake / Break");
    }
    const ids=new Set(requested.filter((entry)=>{const tube=tubeById(entry.tubeId);return tube?.array_member?.derived_readonly!==true&&tube?.mirror_member?.derived_readonly!==true&&tube?.transform_stack_member?.derived_readonly!==true;}).map((entry)=>String(entry.tubeId)));
    if(!ids.size)return;
    p.tubes=(p.tubes??[]).filter((tube)=>!ids.has(String(tube.id)));
    if(!p.tubes.length&&typeof newTubeData==="function"){
      p.tubes.push(newTubeData("Pipe 1"));
    }
    if(ids.has(activeTubeId())){
      state.activeTubeId=p.tubes?.[0]?.id??null;
      try{if(typeof syncProjectToLegacy==="function")syncProjectToLegacy();}catch{}
      try{if(typeof loadActiveTubeToState==="function")loadActiveTubeToState();}catch{}
    }
  }

  function finitePoint3(value,fallback={x:0,y:0,z:0}){
    const source=value&&typeof value==="object"?value:{};
    const out={};
    for(const axis of ["x","y","z"]){
      const n=Number(source[axis]);
      out[axis]=Number.isFinite(n)?n:Number(fallback?.[axis])||0;
    }
    return out;
  }

  function frameDimensions(projectValue){
    const source=projectValue?.bbox??state?.bbox??{};
    return finitePoint3(source,{x:0,y:0,z:0});
  }

  function frameOffset(projectValue){
    const source=projectValue?.coordinateOffset??state?.coordinateOffset??{};
    return finitePoint3(source,{x:0,y:0,z:0});
  }

  function frameChanged(a,b,tolerance=.001){
    return ["x","y","z"].some(
      (axis)=>Math.abs((Number(a?.[axis])||0)-(Number(b?.[axis])||0))>tolerance
    );
  }

  function frameText(value){
    return ["x","y","z"]
      .map((axis)=>{
        const n=Number(value?.[axis])||0;
        return Math.abs(n-Math.round(n))<1e-9
          ? String(Math.round(n))
          : n.toFixed(2);
      })
      .join(" × ");
  }

  function shouldApplyReferenceFrame(projectValue,preview){
    const frame=preview?.frame;
    if(preview?.status!=="exact"||!frame)return false;
    const current=frameDimensions(projectValue);
    const next=frameDimensions({bbox:frame.bbox});
    const dimensionsChanged=frameChanged(current,next);
    if(!dimensionsChanged)return true;
    const message=
      "После удаления импортированного компонента габаритная рамка изменится.\n\n"+
      "Текущая: "+frameText(current)+" мм\n"+
      "Новая: "+frameText(next)+" мм\n\n"+
      "Обновить габаритную рамку?";
    try{return window.confirm(message);}
    catch{return false;}
  }

  function updateImportOriginEvidence(tube,oldOrigin,newOrigin,oldOffset,newOffset){
    const spatial=tube?.importEvidence?.spatialPlacement;
    if(!spatial||typeof spatial!=="object")return;
    spatial.editable_origin_mm=[newOrigin.x,newOrigin.y,newOrigin.z];
    spatial.reference_frame_rebase_after_delete={
      status:"applied",
      source_editable_origin_mm:[oldOrigin.x,oldOrigin.y,oldOrigin.z],
      previous_coordinate_offset_mm:[oldOffset.x,oldOffset.y,oldOffset.z],
      next_coordinate_offset_mm:[newOffset.x,newOffset.y,newOffset.z],
      rebased_editable_origin_mm:[newOrigin.x,newOrigin.y,newOrigin.z],
      physical_world_position_preserved:true,
      source_geometry_preserved:true
    };
    const linear=tube?.importEvidence?.linearDimensionNormalization;
    if(linear&&typeof linear==="object"){
      linear.project_frame_rebased_origin_mm=[newOrigin.x,newOrigin.y,newOrigin.z];
    }
  }

  function applyReferenceFrame(projectValue,frame){
    if(!projectValue||frame?.status!=="exact")return false;
    const oldOffset=frameOffset(projectValue);
    const nextOffset=finitePoint3(frame.coordinateOffset,oldOffset);
    const delta={
      x:oldOffset.x-nextOffset.x,
      y:oldOffset.y-nextOffset.y,
      z:oldOffset.z-nextOffset.z
    };

    for(const tube of projectValue.tubes??[]){
      const oldOrigin=finitePoint3(tube?.origin,{x:0,y:0,z:0});
      const newOrigin={
        x:Number((oldOrigin.x+delta.x).toFixed(6)),
        y:Number((oldOrigin.y+delta.y).toFixed(6)),
        z:Number((oldOrigin.z+delta.z).toFixed(6))
      };
      tube.origin=newOrigin;
      updateImportOriginEvidence(tube,oldOrigin,newOrigin,oldOffset,nextOffset);
    }

    projectValue.bbox={...frame.bbox};
    projectValue.bboxAnchor={...frame.bboxAnchor};
    projectValue.coordinateOffset={...nextOffset};

    if(typeof state==="object"&&state){
      state.bbox={...frame.bbox};
      state.bboxAnchor={...frame.bboxAnchor};
      state.coordinateOffset={...nextOffset};
      const active=(projectValue.tubes??[]).find(
        (tube)=>String(tube?.id)===activeTubeId()
      );
      if(active?.origin)state.origin={...active.origin};
    }
    return true;
  }

  function showAllObjects(projectValue){
    for(const tube of projectValue?.tubes??[]){
      tube.uiHiddenIn3D=false;
      tube.visible=true;
      for(const row of tube.rows??[])row.uiHiddenIn3D=false;
    }
    if(Array.isArray(state?.rows)){
      for(const row of state.rows)row.uiHiddenIn3D=false;
    }
    refApi()?.showAll?.(projectValue);
  }

  function applyAction(action){
    const entries=selectionEntries();
    const p=project();
    if(!p)return;
    if(action!=="show-all"&&!entries.length)return;
    if(action==="delete"&&!lockAllowed("delete"))return;

    const mutate=()=>{
      if(typeof syncActiveTubeFromState==="function")syncActiveTubeFromState();

      if(action==="show-all"){
        showAllObjects(p);
      }else{
        prepareReferenceSelection(entries);
      }

      if(action==="hide"||action==="show"){
        const refs=selectedReferenceEntries(entries);
        if(refs.length)refApi()?.applyBulkAction?.(p,action);
        for(const entry of entries)if(entry.kind!=="ref")setDisplayState(entry,action);
      }else if(action==="isolate"){
        isolateEditableSelection(entries,p);
        refApi()?.isolateSelection?.(p);
      }else if(action==="transparent"){
        const refs=selectedReferenceEntries(entries);
        if(refs.length)refApi()?.applyBulkAction?.(p,"transparent");
        toggleTransparency(entries);
      }else if(action==="delete"){
        const refs=selectedReferenceEntries(entries);
        let framePreview=null;
        let applyFrame=false;
        if(refs.length){
          framePreview=refApi()?.previewDeleteFrame?.(p)??null;
          if(framePreview?.status==="exact"){
            applyFrame=shouldApplyReferenceFrame(p,framePreview);
          }
          refApi()?.applyBulkAction?.(p,"delete");
        }
        deleteRows(entries);
        deleteTubes(entries);
        if(refs.length&&applyFrame&&framePreview?.frame){
          applyReferenceFrame(p,framePreview.frame);
        }else if(refs.length&&framePreview&&framePreview.status!=="exact"){
          try{
            if(typeof ptToast==="function"){
              ptToast("Компонент удалён; габаритная рамка не пересчитана: "+String(framePreview.reason??"нет точных габаритов"));
            }
          }catch{}
        }
        selected.clear();
        refApi()?.clearSelection?.();
      }
      return true;
    };

    const label={
      hide:"Скрыть выбранные объекты",
      isolate:"Скрыть другие объекты",
      show:"Показать выбранные объекты",
      "show-all":"Показать все объекты",
      transparent:"Изменить прозрачность выбранных объектов",
      delete:"Удалить выбранные объекты"
    }[action]||"Изменить выбранные объекты";

    const ok=typeof tbModelCommand==="function"?tbModelCommand(label,mutate):mutate();
    if(ok===false)return;
    try{if(typeof save==="function")save();}catch{}
    try{if(typeof renderAll==="function")renderAll();}catch{}
    refreshVisualSelection();
  }

  let areaSelection=null;
  function ensureAreaOverlay(){
    let el=document.getElementById("tbAreaSelectionOverlay");
    if(el)return el;
    el=document.createElement("div");el.id="tbAreaSelectionOverlay";
    el.style.cssText="position:fixed;z-index:119990;pointer-events:none;border:1px solid #ffd54a;background:rgba(255,213,74,.10);display:none";
    document.body.appendChild(el);
    return el;
  }
  function pointInPolygon(point,polygon){
    let inside=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if(((a.y>point.y)!==(b.y>point.y))&&(point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y||1e-12)+a.x))inside=!inside;
    }
    return inside;
  }
  function projectedSelectionCandidates(){
    if(typeof THREE==="undefined"||typeof camera==="undefined"||typeof pipeGroup==="undefined")return [];
    const canvas=document.getElementById("threeCanvas");if(!canvas)return [];
    const rect=canvas.getBoundingClientRect(),map=new Map();
    pipeGroup.traverse((object)=>{
      if(!object||object.visible===false||skip3DHit(object))return;
      const hit=entryFrom3DObject(object);if(!hit||map.has(hit.key))return;
      let box;try{box=new THREE.Box3().setFromObject(object);}catch{return;}
      if(!box||box.isEmpty())return;
      const center=box.getCenter(new THREE.Vector3()).project(camera);
      if(center.z<-1||center.z>1)return;
      map.set(hit.key,{key:hit.key,x:rect.left+(center.x+1)*.5*rect.width,y:rect.top+(1-center.y)*.5*rect.height});
    });
    return [...map.values()];
  }
  function beginAreaSelection(event){
    if(event.button!==0||!(event.shiftKey||event.altKey))return false;
    areaSelection={mode:event.altKey?"lasso":"box",start:{x:event.clientX,y:event.clientY},points:[{x:event.clientX,y:event.clientY}],additive:!!(event.ctrlKey||event.metaKey),moved:false};
    const overlay=ensureAreaOverlay();overlay.style.display="block";
    if(areaSelection.mode==="lasso"){overlay.style.borderStyle="dashed";overlay.style.background="rgba(255,213,74,.06)";}else overlay.style.borderStyle="solid";
    event.preventDefault();event.stopPropagation();
    try{event.target.setPointerCapture?.(event.pointerId);}catch{}
    return true;
  }
  function updateAreaSelection(event){
    if(!areaSelection)return;
    const dx=event.clientX-areaSelection.start.x,dy=event.clientY-areaSelection.start.y;
    if(Math.hypot(dx,dy)>4)areaSelection.moved=true;
    areaSelection.points.push({x:event.clientX,y:event.clientY});
    const overlay=ensureAreaOverlay();
    const xs=areaSelection.points.map((p)=>p.x),ys=areaSelection.points.map((p)=>p.y);
    overlay.style.left=Math.min(...xs)+"px";overlay.style.top=Math.min(...ys)+"px";
    overlay.style.width=Math.max(1,Math.max(...xs)-Math.min(...xs))+"px";overlay.style.height=Math.max(1,Math.max(...ys)-Math.min(...ys))+"px";
    event.preventDefault();event.stopPropagation();
  }
  function finishAreaSelection(event){
    if(!areaSelection)return false;
    const gesture=areaSelection;areaSelection=null;
    const overlay=ensureAreaOverlay();overlay.style.display="none";
    if(!gesture.moved)return false;
    const candidates=projectedSelectionCandidates(),start=gesture.start,end={x:event.clientX,y:event.clientY};
    const minX=Math.min(start.x,end.x),maxX=Math.max(start.x,end.x),minY=Math.min(start.y,end.y),maxY=Math.max(start.y,end.y);
    const rawKeys=candidates.filter((p)=>gesture.mode==="lasso"
      ?pointInPolygon(p,gesture.points)
      :(p.x>=minX&&p.x<=maxX&&p.y>=minY&&p.y<=maxY)).map((p)=>p.key);
    const keys=[];
    for(const rawKey of rawKeys){
      const entry=parseKey(rawKey),resolved=entry?assembliesApi()?.resolveInteraction?.(entry,rawKey):null;
      if(resolved?.blocked)continue;
      let key=resolved?.handled?resolved.key:rawKey;
      if(!resolved?.handled){
        const group=entry?groupsApi()?.primaryGroupForEntry?.(entry):null;
        if(group)key=groupKey(group.id);
      }
      if(key&&!keys.includes(key))keys.push(key);
    }
    if(!gesture.additive){selected.clear();refApi()?.clearSelection?.();}
    for(const key of keys)selected.add(key);
    syncSelectionIntoReference();refreshVisualSelection();
    window.dispatchEvent(new CustomEvent("tubebender-selection-change"));
    event.preventDefault();event.stopPropagation();
    return true;
  }

  function resolveSelectionCandidate(candidate,{direct=false}={}){
    if(!candidate)return null;
    const assemblyResolved=assembliesApi()?.resolveInteraction?.(candidate.entry,candidate.key);
    if(assemblyResolved?.blocked)return null;
    let key=assemblyResolved?.handled?assemblyResolved.key:candidate.key;
    let entry=assemblyResolved?.handled?parseKey(key):candidate.entry;
    if(!assemblyResolved?.handled&&!direct){
      const group=groupsApi()?.primaryGroupForEntry?.(candidate.entry);
      if(group){key=groupKey(group.id);entry=parseKey(key);}
    }
    return key?{key,entry:entry??parseKey(key),distance:candidate.distance??0}:null;
  }
  function selectionCandidatesAtEvent(event,{direct=false}={}){
    const map=new Map();
    for(const raw of pick3DCandidates(event)){
      const candidate=resolveSelectionCandidate(raw,{direct});
      if(candidate&&!map.has(candidate.key))map.set(candidate.key,candidate);
    }
    return Object.freeze([...map.values()]);
  }
  function setSelectionCycle(candidates,event,index=0){
    selectionCycle={
      active:Array.isArray(candidates)&&candidates.length>1,
      candidates:Array.isArray(candidates)?candidates.map(item=>({...item})):[],
      index:Math.max(0,Math.min(Number(index)||0,Math.max(0,(candidates?.length??1)-1))),
      clientX:Number(event?.clientX)||0,
      clientY:Number(event?.clientY)||0
    };
    return selectionCycle;
  }
  function resetSelectionCycle(){
    selectionCycle={active:false,candidates:[],index:0,clientX:0,clientY:0};
    hideObjectChooser();
  }
  function applySelectionCycleIndex(index,{reveal=true}={}){
    if(!selectionCycle.candidates.length)return null;
    const n=selectionCycle.candidates.length;
    selectionCycle.index=((Math.trunc(index)%n)+n)%n;
    const candidate=selectionCycle.candidates[selectionCycle.index];
    setSelectedKey(candidate.key,{additive:false,toggle:false});
    if(reveal)revealTreeKey(candidate.key);
    renderObjectChooserActive();
    return candidate;
  }
  function cycleSelection(direction=1){
    if(!selectionCycle.active||selectionCycle.candidates.length<2)return null;
    return applySelectionCycleIndex(selectionCycle.index+(direction<0?-1:1));
  }
  function selectionCandidateLabel(candidate){
    const entry=candidate?.entry??parseKey(candidate?.key);
    if(!entry)return String(candidate?.key??"Object");
    if(entry.kind==="tube"){
      const tube=tubeById(entry.tubeId);return "Tube · "+String(tube?.name??entry.tubeId);
    }
    if(entry.kind==="mesh-instance"){
      const item=refApi()?.meshInstanceById?.(project(),entry.instanceId);return "Mesh · "+String(item?.name??entry.instanceId);
    }
    if(entry.kind==="ref")return "Source / Reference · "+String(entry.nodeId);
    if(entry.kind==="group")return "Group · "+String(groupsApi()?.groupById?.(entry.groupId)?.name??entry.groupId);
    if(entry.kind==="project-assembly")return "Assembly · "+String(assembliesApi()?.assemblyById?.(entry.assemblyId)?.name??entry.assemblyId);
    if(entry.kind==="row")return "Tube element · #"+(Number(entry.rowIndex)+1);
    return String(entry.kind)+" · "+String(candidate.key);
  }
  function ensureObjectChooser(){
    if(objectChooser)return objectChooser;
    const panel=document.createElement("div");panel.id="tbSelectionCycleChooser";
    panel.style.cssText="position:fixed;z-index:120030;display:none;min-width:260px;max-width:min(420px,calc(100vw - 20px));max-height:360px;overflow:auto;padding:5px;background:#101927;border:1px solid #40536d;border-radius:7px;box-shadow:0 12px 34px rgba(0,0,0,.55);font:12px Segoe UI,Arial,sans-serif;color:#e6eef8";
    document.body.appendChild(panel);objectChooser=panel;return panel;
  }
  function renderObjectChooserActive(){
    if(!objectChooser||objectChooser.style.display==="none")return;
    objectChooser.querySelectorAll("[data-cycle-index]").forEach(button=>{
      const active=Number(button.dataset.cycleIndex)===selectionCycle.index;
      button.style.background=active?"#35557a":"transparent";
      button.setAttribute("aria-current",active?"true":"false");
    });
  }
  function showObjectChooser(event,candidates){
    const panel=ensureObjectChooser();
    setSelectionCycle(candidates,event,0);
    panel.innerHTML='<div style="padding:5px 7px 7px;color:#91a6c0;border-bottom:1px solid #2d3b4f">Выбрать объект под курсором · '+candidates.length+'</div>'+
      candidates.map((candidate,index)=>'<button type="button" data-cycle-index="'+index+'" style="display:block;width:100%;text-align:left;border:0;border-radius:4px;background:transparent;color:#e6eef8;padding:7px 9px;cursor:pointer">'+(index+1)+'. '+selectionCandidateLabel(candidate)+'</button>').join("");
    panel.querySelectorAll("[data-cycle-index]").forEach(button=>{
      const index=Number(button.dataset.cycleIndex);
      button.onmouseenter=()=>applySelectionCycleIndex(index);
      button.onclick=()=>{applySelectionCycleIndex(index);hideObjectChooser();};
    });
    panel.style.display="block";
    const rect=panel.getBoundingClientRect(),margin=8;
    panel.style.left=Math.max(margin,Math.min(Number(event.clientX)||margin,window.innerWidth-rect.width-margin))+"px";
    panel.style.top=Math.max(margin,Math.min(Number(event.clientY)||margin,window.innerHeight-rect.height-margin))+"px";
    renderObjectChooserActive();
  }
  function hideObjectChooser(){if(objectChooser)objectChooser.style.display="none";}
  function onCanvasClick(event){
    if(event.button!==0)return;
    try{if(controls?.shouldSuppressSelection?.())return;}catch{}
    const direct=!!(event.ctrlKey||event.metaKey);
    const candidates=selectionCandidatesAtEvent(event,{direct});
    if(!candidates.length){resetSelectionCycle();return;}
    setSelectionCycle(candidates,event,0);
    const candidate=candidates[0];
    setSelectedKey(candidate.key,{additive:direct,toggle:direct});
    revealTreeKey(candidate.key);
  }
  function onCanvasDoubleClick(event){
    if(event.button!==0)return;
    const picked=pick3D(event);if(!picked)return;
    const target=assembliesApi()?.assemblyForEditEntry?.(picked.entry);
    if(!target)return;
    event.preventDefault();event.stopPropagation();
    assembliesApi()?.enterEdit?.(target.id);
  }

  function onCanvasContext(event){
    try{
      if(controls?.shouldSuppressSelection?.()){
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }catch{}
    const direct=!!(event.ctrlKey||event.metaKey);
    const candidates=selectionCandidatesAtEvent(event,{direct});
    const picked=candidates[0]??null;
    setSelectionCycle(candidates,event,0);
    event.preventDefault();
    event.stopPropagation();
    if(!picked){
      showContextMenu(event,{source:"3d",allowEmpty:true,selectionAvailable:false});
      return;
    }
    syncReferenceIntoSelection();
    const key=picked.key;
    if(!selected.has(key))setSelectedKey(key,{additive:false});
    revealTreeKey(key);
    showContextMenu(event,{source:"3d"});
  }

  function onTreeClick(event){
    if(!projectTreeForEvent(event))return;
    const row=treeRowFromTarget(event.target);
    if(!row)return;
    let key=keyForTreeRow(row);
    if(!key)return;
    const direct=!!(event.ctrlKey||event.metaKey);
    const original=parseKey(key);
    const assemblyResolved=original?assembliesApi()?.resolveInteraction?.(original,key):null;
    if(assemblyResolved?.blocked)return;
    let grouped=false;
    if(assemblyResolved?.handled){
      key=assemblyResolved.key;
    }else if(row.matches("[data-group-member-key]")&&!direct){
      key=groupKey(row.dataset.groupOwner);grouped=true;
    }else if(!row.matches("[data-project-group]")&&!direct){
      const parsed=parseKey(key);
      const group=parsed?groupsApi()?.primaryGroupForEntry?.(parsed):null;
      if(group){key=groupKey(group.id);grouped=true;}
    }
    if(row.matches("[data-ref-node]")&&!grouped&&!assemblyResolved?.handled){
      const replaceNonReference=!(event.ctrlKey||event.metaKey||event.shiftKey);
      setTimeout(()=>{
        adoptReferenceSelection({
          source:"tree",
          replaceNonReference
        });
      },0);
      return;
    }
    setSelectedKey(key,{additive:direct,toggle:direct});
  }
  function onTreeDoubleClick(event){
    if(!projectTreeForEvent(event))return;
    const row=treeRowFromTarget(event.target);if(!row)return;
    const key=keyForTreeRow(row),entry=key?parseKey(key):null;
    const target=entry?assembliesApi()?.assemblyForEditEntry?.(entry):null;
    if(!target)return;
    event.preventDefault();event.stopPropagation();
    assembliesApi()?.enterEdit?.(target.id);
  }

  function onTreeContext(event){
    if(!projectTreeForEvent(event))return;
    const row=treeRowFromTarget(event.target);
    if(!row){
      event.preventDefault();
      event.stopPropagation();
      showContextMenu(event,{source:"tree",allowEmpty:true,selectionAvailable:false});
      return;
    }
    let key=keyForTreeRow(row);
    if(!key)return;
    event.preventDefault();
    event.stopPropagation();
    const parsed=parseKey(key),resolved=parsed?assembliesApi()?.resolveInteraction?.(parsed,key):null;
    if(resolved?.blocked)return;
    if(resolved?.handled)key=resolved.key;
    syncReferenceIntoSelection();
    if(!selected.has(key))setSelectedKey(key,{additive:false});
    showContextMenu(event,{source:"tree"});
  }

  function projectTreeRows(host){
    if(!host)return [];
    return [...host.querySelectorAll(
      "[data-project-assembly],[data-assembly-member-key],[data-project-group],[data-group-member-key],[data-tree-tube],[data-tree-row],[data-tree-assembly],[data-tree-assembly-part],[data-tree-origin],[data-ref-scene-row],[data-ref-node]"
    )];
  }

  function decorateProjectTreeAsTreeView(){
    const host=document.getElementById("tbProjectTree");
    if(!host)return;
    host.classList.add("tb-project-treeview");
    host.setAttribute("role","tree");

    const rows=projectTreeRows(host);
    if(!rows.length)return;
    const paddings=rows.map((row)=>{
      const inline=parseFloat(row.style.paddingLeft);
      if(Number.isFinite(inline))return inline;
      try{
        const computed=parseFloat(getComputedStyle(row).paddingLeft);
        return Number.isFinite(computed)?computed:0;
      }catch{
        return 0;
      }
    });
    const minPadding=Math.min(...paddings);

    rows.forEach((row,index)=>{
      const padding=paddings[index];
      const depth=Math.max(0,Math.round((padding-minPadding)/18));
      row.classList.add("tb-treeview-row");
      row.dataset.treeviewDepth=String(depth);
      row.style.setProperty("--tb-treeview-depth",String(depth));
      row.style.setProperty("--tb-treeview-branch-x",(11+depth*18)+"px");
      row.setAttribute("role","treeitem");
      row.setAttribute("aria-level",String(depth+1));

      const expander=row.querySelector(
        ".tb-tree-icon,[data-ref-toggle],[data-ref-scene-toggle],[data-tree-toggle],[data-tree-expand]"
      );
      if(expander){
        row.classList.add("tb-treeview-expandable");
        const marker=String(expander.textContent??"").trim();
        if(marker==="▾"||marker==="▼"||marker==="−"){
          row.setAttribute("aria-expanded","true");
        }else if(marker==="▸"||marker==="▶"||marker==="+"){
          row.setAttribute("aria-expanded","false");
        }
      }
    });
  }

  function installStyles(){
    if(document.getElementById("tbObjectContextStyles"))return;
    const style=document.createElement("style");
    style.id="tbObjectContextStyles";
    style.textContent=
      '.tb-object-context-menu{position:fixed;z-index:120000;display:none;min-width:205px;padding:5px;background:#101927;border:1px solid #40536d;border-radius:7px;box-shadow:0 12px 34px rgba(0,0,0,.55);font:12px/1.2 Segoe UI,Arial,sans-serif;color:#e6eef8}'+
      '.tb-object-context-title{padding:5px 8px 7px;color:#91a6c0;font-size:11px;border-bottom:1px solid #2d3b4f;margin-bottom:3px}'+
      '.tb-object-context-menu button{display:flex;width:100%;align-items:center;gap:9px;text-align:left;border:0;border-radius:4px;background:transparent;color:#e6eef8;padding:7px 9px;cursor:pointer}'+
      '.tb-object-context-menu button:hover:not(:disabled){background:#233750}'+
      '.tb-object-context-menu button:disabled{opacity:.4;cursor:not-allowed}'+
      '.tb-object-context-menu button.diagnose{color:#ffb4b4}'+
      '.tb-object-context-menu button.diagnose:hover:not(:disabled){background:#4a232a;color:#ffd4d4}'+
      '.tb-object-issues-panel{position:fixed;z-index:120010;display:none;width:min(430px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 24px));overflow:auto;background:#101927;border:1px solid #65414a;border-radius:9px;box-shadow:0 18px 45px rgba(0,0,0,.62);font:12px/1.4 Segoe UI,Arial,sans-serif;color:#e6eef8}'+
      '.tb-object-issues-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #3d2d35;background:#24181d}'+
      '.tb-object-issues-head b{color:#ffb4b4;font-size:13px}'+
      '.tb-object-issues-head [data-issues-subtitle]{margin-top:2px;color:#aebed1;font-size:11px}'+
      '.tb-object-issues-head button{width:25px;height:25px;border:0;border-radius:4px;background:transparent;color:#dce7f4;cursor:pointer;font-size:19px;line-height:1}'+
      '.tb-object-issues-head button:hover{background:#4a2a32}'+
      '.tb-object-issues-list{display:flex;flex-direction:column;gap:6px;padding:10px 12px}'+
      '.tb-object-issue-row{display:grid;grid-template-columns:20px 1fr;gap:7px;align-items:start;padding:7px 8px;border:1px solid #4b3239;border-radius:6px;background:#1c1418;color:#ffd4d4}'+
      '.tb-object-issue-marker{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;border-radius:50%;background:#ff4c4c;color:#fff;font-weight:900;font-size:11px}'+
      '.tb-object-context-menu button.anchor-end{color:#ffd273}'+
      '.tb-object-context-menu button.anchor-end:hover:not(:disabled){background:#4a3a1e;color:#ffe0a0}'+
      '.tb-object-context-menu button.danger{color:#ff9b9b}'+
      '.tb-object-context-separator{height:1px;background:#2d3b4f;margin:3px 4px}'+
      '.tb-object-move-panel{position:fixed;z-index:120001;display:none;width:300px;padding:10px;background:#101927;border:1px solid #48607e;border-radius:8px;box-shadow:0 16px 42px rgba(0,0,0,.62);color:#e6eef8;font:12px Segoe UI,Arial,sans-serif}'+
      '.tb-object-move-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}.tb-object-move-head b{flex:1}.tb-object-move-head button{border:0;background:transparent;color:#b9c8da;font-size:18px;cursor:pointer}'+
      '.tb-object-move-grid{display:grid;grid-template-columns:80px 1fr;gap:7px;align-items:center}.tb-object-move-grid input{height:29px;border:1px solid #3a506b;border-radius:5px;background:#0b1320;color:#fff;padding:0 7px}'+
      '.tb-object-move-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:11px}.tb-object-move-actions button{height:29px;border:1px solid #3d536e;border-radius:5px;background:#17283d;color:#e5edf7;padding:0 10px;cursor:pointer}.tb-object-move-actions button.primary{background:#24558a;border-color:#3c7fc1}'+
      '#tbProjectTree .tb-object-selected{box-shadow:inset 3px 0 0 #ffd54a!important,0 0 0 1px rgba(255,213,74,.35)!important;background:rgba(255,213,74,.14)!important;color:#fff8cf!important}'+
      '#tbProjectTree.tb-project-treeview{padding:4px 3px 8px;overflow:auto;user-select:none}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row{position:relative;display:flex;align-items:center;min-height:26px;margin:1px 2px;padding-left:calc(8px + var(--tb-treeview-depth)*18px)!important;padding-right:4px;border-radius:4px;white-space:nowrap;box-sizing:border-box}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row:hover{background:rgba(105,148,196,.12)}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row[data-treeview-depth]:not([data-treeview-depth="0"])::before{content:"";position:absolute;left:var(--tb-treeview-branch-x);top:-14px;bottom:13px;border-left:1px solid rgba(128,151,178,.38);pointer-events:none}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row[data-treeview-depth]:not([data-treeview-depth="0"])::after{content:"";position:absolute;left:var(--tb-treeview-branch-x);top:13px;width:11px;border-top:1px solid rgba(128,151,178,.38);pointer-events:none}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-icon,#tbProjectTree.tb-project-treeview [data-ref-toggle],#tbProjectTree.tb-project-treeview [data-ref-scene-toggle],#tbProjectTree.tb-project-treeview [data-tree-toggle],#tbProjectTree.tb-project-treeview [data-tree-expand]{width:18px!important;min-width:18px!important;height:18px!important;padding:0!important;margin:0 2px 0 0!important;border:0!important;background:transparent!important;color:#aebed0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border-radius:3px!important;line-height:18px!important}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-icon:hover,#tbProjectTree.tb-project-treeview [data-ref-toggle]:hover,#tbProjectTree.tb-project-treeview [data-ref-scene-toggle]:hover,#tbProjectTree.tb-project-treeview [data-tree-toggle]:hover,#tbProjectTree.tb-project-treeview [data-tree-expand]:hover{background:rgba(117,157,202,.18)!important;color:#eaf2fb!important}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-label{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:24px}'+
      '#tbProjectTree.tb-project-treeview .tb-tree-eye{margin-left:auto;flex:0 0 auto;opacity:.75}'+
      '#tbProjectTree.tb-project-treeview input[type="checkbox"]{width:13px;height:13px;margin:0 5px 0 1px;flex:0 0 auto}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row.active{background:rgba(66,123,183,.20)}'+
      '#tbProjectTree.tb-project-treeview .tb-treeview-row.tb-object-selected{background:rgba(255,213,74,.14)!important}';
    document.head.appendChild(style);
  }

  function install(){
    if(installed)return;
    installed=true;
    installStyles();
    const canvas=document.getElementById("threeCanvas");
    canvas?.addEventListener("pointerdown",(event)=>{beginAreaSelection(event);},true);
    canvas?.addEventListener("pointermove",(event)=>{if(areaSelection)updateAreaSelection(event);},true);
    canvas?.addEventListener("pointerup",(event)=>{if(areaSelection)finishAreaSelection(event);},true);
        canvas?.addEventListener("click",onCanvasClick);
    canvas?.addEventListener("dblclick",onCanvasDoubleClick);
    canvas?.addEventListener("contextmenu",onCanvasContext);
    // Project tree is built dynamically by buildShell(), so bind through
    // document instead of capturing a possibly non-existent tree element.
    document.addEventListener("click",onTreeClick);
    document.addEventListener("dblclick",onTreeDoubleClick);
    document.addEventListener("contextmenu",onTreeContext,true);
    document.addEventListener("pointerdown",(event)=>{
      if(contextMenu?.style.display==="block"&&!event.target.closest("#tbObjectContextMenu"))hideContextMenu();
      if(movePanel?.style.display==="block"&&!event.target.closest("#tbObjectMovePanel")&&!event.target.closest('[data-object-action="move"]')){}
      if(issuesPanel?.style.display==="block"&&!event.target.closest("#tbObjectIssuesPanel")&&!event.target.closest('[data-object-action="diagnose"]')){
        issuesPanel.style.display="none";
      }
    });
    window.addEventListener("keydown",(event)=>{
      if(event.key==="Tab"&&selectionCycle.active){
        const snapActive=window.TubeBenderSnapTracking?.state?.()?.active===true;
        const textTarget=event.target&&(event.target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/i.test(String(event.target.tagName||"")));
        if(!snapActive&&!textTarget){
          event.preventDefault();event.stopPropagation();
          cycleSelection(event.shiftKey?-1:1);
          return;
        }
      }
      if(event.key==="Escape"){
        hideContextMenu();hideObjectChooser();
        closeMovePanel();
        if(issuesPanel)issuesPanel.style.display="none";
      }
    },true);

    // Re-apply hidden/transparency/selection state after every legacy 3D rebuild.
    if(typeof update3D==="function"&&!update3D._tbObjectContext){
      const original=update3D;
      update3D=function(...args){
        const result=original.apply(this,args);
        try{decorateRenderedObjects();}catch(error){console.warn("Object display state:",error);}
        return result;
      };
      update3D._tbObjectContext=true;
    }

    const treeObserver=new MutationObserver((mutations)=>{
      let treeChanged=false;
      for(const mutation of mutations){
        const target=mutation.target;
        if(
          target?.id==="tbProjectTree"||
          target?.closest?.("#tbProjectTree")||
          [...(mutation.addedNodes??[])].some((node)=>
            node?.nodeType===1&&(
              node.id==="tbProjectTree"||
              node.querySelector?.("#tbProjectTree")
            )
          )
        ){
          treeChanged=true;
          break;
        }
      }
      if(treeChanged){
        decorateProjectTreeAsTreeView();
        updateTreeSelectionStyles();
      }
    });
    treeObserver.observe(document.body,{childList:true,subtree:true});
    try{decorateRenderedObjects();}catch{}
    decorateProjectTreeAsTreeView();
    updateTreeSelectionStyles();
  }

  window.TubeBenderObjectContext=Object.freeze({
    install,
    clearSelection,
    replaceSelectionKeys,
    selectionKeys:()=>Object.freeze([...selected]),
    parseSelectionKey:parseKey,
    selectionEntries,
    applyAction,
    applyMove,
    beginAreaSelection,updateAreaSelection,finishAreaSelection,
    snapCandidatesAtEvent,
    selectionCandidatesAtEvent,cycleSelection,
    selectionCycleState:()=>structuredClone(selectionCycle),
    applyReferenceFrame,
    invalidElementDiagnosis,
    openInvalidElementDiagnosis,
    endConstraintSelection,
    toggleEndConstraint,
    revealTreeKey,
    adoptReferenceSelection,
    decorateProjectTreeAsTreeView,
    refresh:refreshVisualSelection
  });

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();