(() => {
  const runtimes=new Map();
  const templates=new Map();
  const meshPerformance={templateBuilds:0,templateCacheHits:0,buildTimeMs:0,maxBuildTimeMs:0,largeMeshes:[]};
  const meshNow=()=>typeof performance!=="undefined"&&typeof performance.now==="function"?performance.now():Date.now();
  let selected=null;
  const bulkSelected=new Set();
  let rangeAnchorKey=null;

  const escHtml=(value)=>String(value??"").replace(/[&<>"']/g,(ch)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[ch]));

  function runtimeKey(scene){
    return String(scene?.runtime_scene_id??scene?.id??"");
  }

  function registerRuntime(runtime){
    if(!runtime||typeof runtime!=="object")return false;
    const key=String(runtime.scene_id??"");
    if(!key||!Array.isArray(runtime.assets))return false;
    const assetsById=new Map(
      runtime.assets.map((asset)=>[String(asset?.id??""),asset])
    );
    if(runtimes.has(key)||cachedScene)invalidateSceneCache();
    bumpRevision("geometry");
    runtimes.set(key,{...runtime,assetsById});
    for(const cacheKey of [...templates.keys()]){
      if(cacheKey.startsWith(key+"|"))templates.delete(cacheKey);
    }
    return true;
  }

  function rgbHex(rgb,fallback=0x8f9baa){
    if(!Array.isArray(rgb)||rgb.length<3)return fallback;
    const c=rgb.slice(0,3).map((x)=>Math.max(0,Math.min(255,Number(x)||0)));
    return (c[0]<<16)|(c[1]<<8)|c[2];
  }

  const preparedMeshBuffers=new WeakMap();

  function buildAssetTemplate(runtime,asset,THREE,displayMode="normal"){
    const transparent=displayMode==="transparent";
    const key=String(runtime.scene_id)+"|"+String(asset.id)+"|"+displayMode;
    if(templates.has(key)){
      meshPerformance.templateCacheHits++;
      return templates.get(key);
    }
    const buildStart=meshNow();

    const group=new THREE.Group();
    group.userData.referenceShared=true;
    group.userData.referenceAssetId=asset.id;

    if(asset.kind==="mesh"){
      for(const item of asset.meshes??[]){
        const vertices=item.vertices??[];
        const faces=item.faces??[];
        if(!vertices.length||!faces.length)continue;

        const prepared=preparedMeshBuffers.get(item);
        const positions=prepared?.positions??new Float32Array(vertices.length*3);
        for(let i=prepared?vertices.length:0;i<vertices.length;i+=1){
          positions[i*3]=Number(vertices[i]?.[0])||0;
          positions[i*3+1]=Number(vertices[i]?.[1])||0;
          positions[i*3+2]=Number(vertices[i]?.[2])||0;
        }
        const indices=prepared?.indices??new Uint32Array(faces.length*3);
        for(let i=prepared?faces.length:0;i<faces.length;i+=1){
          indices[i*3]=Number(faces[i]?.[0])||0;
          indices[i*3+1]=Number(faces[i]?.[1])||0;
          indices[i*3+2]=Number(faces[i]?.[2])||0;
        }

        const geometry=new THREE.BufferGeometry();
        // StaticDrawUsage is the correct GPU usage hint for immutable CAD meshes.
        const positionAttribute=new THREE.BufferAttribute(positions,3);
        if(typeof positionAttribute.setUsage==="function"&&THREE.StaticDrawUsage!=null)
          positionAttribute.setUsage(THREE.StaticDrawUsage);
        geometry.setAttribute("position",positionAttribute);
        const indexAttribute=new THREE.BufferAttribute(indices,1);
        if(typeof indexAttribute.setUsage==="function"&&THREE.StaticDrawUsage!=null)
          indexAttribute.setUsage(THREE.StaticDrawUsage);
        geometry.setIndex(indexAttribute);
        if(prepared?.normals){
          geometry.setAttribute("normal",new THREE.BufferAttribute(prepared.normals,3));
        }else{
          geometry.computeVertexNormals();
        }

        const material=new THREE.MeshStandardMaterial({
          color:rgbHex(item.color_rgb),
          roughness:.7,
          metalness:.04,
          transparent,
          opacity:transparent ? .24 : 1,
          depthWrite:!transparent,
          side:THREE.DoubleSide
        });
        const mesh=new THREE.Mesh(geometry,material);
        mesh.userData.referenceShared=true;
        mesh.userData.referenceGeometry=true;
        if(Array.isArray(item.matrix)&&item.matrix.length===16){
          mesh.matrix.fromArray(item.matrix);
          mesh.matrixAutoUpdate=false;
        }
        group.add(mesh);
      }
    }else if(asset.kind==="line_segments"){
      const source=asset.line_segments?.positions??[];
      if(source.length>=6){
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(Float32Array.from(source),3)
        );
        const material=new THREE.LineBasicMaterial({
          color:rgbHex(asset.line_segments?.color_rgb,0x8795a8),
          transparent,
          opacity:transparent ? .28 : 1
        });
        const lines=new THREE.LineSegments(geometry,material);
        lines.userData.referenceShared=true;
        lines.userData.referenceGeometry=true;
        group.add(lines);
      }
    }

    for(const instance of asset.nested_instances??[]){
      if(instance?.status!=="exact")continue;
      const child=runtime.assetsById.get(String(instance.asset_id));
      if(!child||child.status!=="exact")continue;
      const childTemplate=buildAssetTemplate(runtime,child,THREE,displayMode);
      const placed=childTemplate.clone(true);
      placed.userData.referenceShared=true;
      placed.userData.referenceGeometry=true;
      if(Array.isArray(instance.placement_matrix)&&instance.placement_matrix.length===16){
        placed.matrix.fromArray(instance.placement_matrix);
        placed.matrixAutoUpdate=false;
      }
      group.add(placed);
    }

    templates.set(key,group);
    const elapsed=Math.max(0,meshNow()-buildStart);
    meshPerformance.templateBuilds++;
    meshPerformance.buildTimeMs+=elapsed;
    meshPerformance.maxBuildTimeMs=Math.max(meshPerformance.maxBuildTimeMs,elapsed);
    if(elapsed>=16){
      meshPerformance.largeMeshes.push({assetId:String(asset.id),sceneId:String(runtime.scene_id),elapsedMs:elapsed});
      if(meshPerformance.largeMeshes.length>20)meshPerformance.largeMeshes.shift();
    }
    return group;
  }

  function hiddenSet(scene){
    return new Set(
      Array.isArray(scene?.hiddenNodeIds)
        ? scene.hiddenNodeIds.map(String)
        : []
    );
  }

  function transparentSet(scene){
    return new Set(
      Array.isArray(scene?.transparentNodeIds)
        ? scene.transparentNodeIds.map(String)
        : []
    );
  }

  function editablePartSet(project){
    return new Set(
      (project?.tubes??[])
        .flatMap((tube)=>[
          tube?.partNumber,
          tube?.part_number,
          tube?.importEvidence?.part_number,
          tube?.currentProjectImport?.part_number
        ])
        .filter((value)=>value!=null&&String(value)!=="")
        .map(String)
    );
  }

  function clonePlain(value){
    return value==null?value:JSON.parse(JSON.stringify(value));
  }

  function sourceLink(tube){
    const link=tube?.currentProjectImport?.source_link;
    return link&&typeof link==="object"?link:null;
  }

  function linkedEditableTubes(project){
    return (project?.tubes??[]).filter((tube)=>
      tube?.currentProjectImport?.source_format==="DWFx"||
      !!sourceLink(tube)
    );
  }

  function linkedTubeForSource(project,sceneId,nodeId){
    const sid=String(sceneId??""),nid=String(nodeId??"");
    return linkedEditableTubes(project).find((tube)=>{
      const link=sourceLink(tube);
      return link&&link.detached!==true&&
        String(link.scene_id??"")===sid&&
        String(link.node_id??"")===nid;
    })??null;
  }

  function anyEditableTubeForSource(project,sceneId,nodeId){
    const sid=String(sceneId??""),nid=String(nodeId??"");
    return linkedEditableTubes(project).find((tube)=>{
      const link=sourceLink(tube);
      return link&&
        String(link.scene_id??"")===sid&&
        String(link.node_id??"")===nid;
    })??null;
  }

  function sourceNodeForTube(project,tube){
    const link=sourceLink(tube);
    if(!link||link.detached===true)return null;
    const scene=(project?.referenceScenes??[]).find((item)=>
      String(item?.id??"")===String(link.scene_id??"")
    )??null;
    if(!scene)return null;
    const node=findNode(scene.tree,link.node_id);
    return node?{scene,node,link}:null;
  }

  function selectedEditableTubeIds(){
    try{
      return new Set(
        (window.TubeBenderObjectContext?.selectionEntries?.()??[])
          .filter((entry)=>entry?.kind==="tube")
          .map((entry)=>String(entry.tubeId))
      );
    }catch{
      return new Set();
    }
  }

  function meshInstancesForSource(project,sceneId,nodeId){
    return editableMeshInstanceList(project,{create:false}).filter((instance)=>
      instance?.link_status!=="detached"&&
      String(instance?.source?.scene_id??"")===String(sceneId??"")&&
      String(instance?.source?.node_id??"")===String(nodeId??"")
    );
  }

  // PERF-001: build source-link and mesh-instance lookups once per rendered
  // reference scene rather than rescanning the entire project for every node.
  // This index is deliberately short-lived: conservative signature checks still
  // detect direct writes from legacy modules between render requests.
  // Build one project-wide snapshot for an entire synchronous or cooperative
  // DWFx render pass. Do not memoize it across renders: legacy source writers
  // can mutate links without revision bumps, and the conservative signature
  // must remain the authoritative reuse guard.
  function buildProjectSourceRenderIndex(project){
    const byScene=new Map();
    const ensureScene=(sceneId)=>{
      const key=String(sceneId??"");
      let entry=byScene.get(key);
      if(!entry){
        entry={firstLinked:new Map(),firstAny:new Map(),meshByNode:new Map()};
        byScene.set(key,entry);
      }
      return entry;
    };
    for(const tube of linkedEditableTubes(project)){
      const link=sourceLink(tube);
      if(!link)continue;
      const scene=ensureScene(link.scene_id);
      const nodeId=String(link.node_id??"");
      if(!scene.firstAny.has(nodeId))scene.firstAny.set(nodeId,tube);
      if(link.detached!==true&&!scene.firstLinked.has(nodeId))
        scene.firstLinked.set(nodeId,tube);
    }
    for(const instance of editableMeshInstanceList(project,{create:false})){
      if(instance?.link_status==="detached")continue;
      const scene=ensureScene(instance?.source?.scene_id);
      const nodeId=String(instance?.source?.node_id??"");
      if(!scene.meshByNode.has(nodeId))scene.meshByNode.set(nodeId,[]);
      scene.meshByNode.get(nodeId).push(instance);
    }
    let entries=[];
    try{entries=window.TubeBenderObjectContext?.selectionEntries?.()??[];}
    catch{}
    if(!Array.isArray(entries))entries=[];
    const selectedTubeIds=new Set(entries.filter(entry=>entry?.kind==="tube")
      .map(entry=>String(entry.tubeId)));
    const selectedInstanceIds=new Set(entries.filter(entry=>entry?.kind==="mesh-instance")
      .map(entry=>String(entry.instanceId)));
    const common={
      selectedTubeIds,selectedInstanceIds,
      editableParts:editablePartSet(project),
      selectedKeys:selectedKeySet()
    };
    const empty={firstLinked:new Map(),firstAny:new Map(),meshByNode:new Map()};
    sceneReuseStats.sourceIndexBuilds++;
    return {
      forScene(sceneId){
        return {...(byScene.get(String(sceneId??""))??empty),...common};
      }
    };
  }

  // Preserves the existing single-scene adapter for callers and test helpers.
  function buildSourceRenderIndex(project,sceneId){
    return buildProjectSourceRenderIndex(project).forScene(sceneId);
  }

  function meshSourceDisplayState(project,scene,node,lookup=null){
    const instances=lookup
      ? (lookup.meshByNode.get(String(node?.id??""))??[])
      : meshInstancesForSource(project,scene?.id,node?.id);
    if(!instances.length)return null;
    const selectedInstanceIds=lookup?.selectedInstanceIds??new Set(
      (window.TubeBenderObjectContext?.selectionEntries?.()??[])
        .filter((entry)=>entry?.kind==="mesh-instance")
        .map((entry)=>String(entry.instanceId))
    );
    const selectedInstance=instances.find((instance)=>selectedInstanceIds.has(String(instance.id)))??null;
    const compare=instances.some((instance)=>instance.compare_source===true);
    const explicit=instances.some((instance)=>instance.source_visible===true);
    return {
      instances,
      visible:compare||explicit||!!selectedInstance,
      transparent:compare||!!selectedInstance,
      compare,
      selectedInstance
    };
  }

  function sourceDisplayState(project,scene,node,lookup=null){
    const linked=lookup
      ? (lookup.firstLinked.get(String(node?.id??""))??null)
      : linkedTubeForSource(project,scene?.id,node?.id);
    if(!linked)return null;
    const link=sourceLink(linked);
    const selectedEditable=(lookup?.selectedTubeIds??selectedEditableTubeIds()).has(String(linked.id));
    const display=String(link?.display??"hidden");
    return {
      tube:linked,
      link,
      selectedEditable,
      visible:selectedEditable||display==="shown"||display==="compare",
      transparent:selectedEditable||display==="compare",
      compare:display==="compare"
    };
  }

  function restoreLinkedTubeGeometry(tube){
    const snapshot=tube?.currentProjectImport?.source_geometry_snapshot;
    if(!snapshot||snapshot.schema!=="dwfx_editable_source_geometry_v1"){
      throw new Error("Source geometry snapshot is unavailable");
    }
    const fields=[
      "origin","startVector","startAxis","startDir","rows",
      "diameter","diameter_mm","outerDiameterMm","outer_diameter_mm","OD","OD_mm",
      "wall","wall_mm","wallThicknessMm","wall_thickness_mm"
    ];
    for(const key of fields){
      if(Object.prototype.hasOwnProperty.call(snapshot,key)){
        tube[key]=clonePlain(snapshot[key]);
      }
    }
    return true;
  }

  function editableMeshInstanceList(project,{create=true}={}){
    if(!project||typeof project!=="object")return [];
    if(!Array.isArray(project.editable_mesh_instances)){
      if(!create)return [];
      project.editable_mesh_instances=[];
    }
    return project.editable_mesh_instances;
  }

  function meshInstanceId(){
    const uuid=globalThis.crypto?.randomUUID?.();
    return uuid?"mesh-instance-"+uuid:"mesh-instance-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
  }

  function meshInstanceById(project,id){
    return editableMeshInstanceList(project,{create:false}).find((item)=>String(item?.id??"")===String(id??""))??null;
  }

  function meshInstanceSource(project,instance){
    if(!instance)return null;
    const source=instance.source??{};
    const scene=findScene(project,source.scene_id);
    const node=findNode(scene?.tree,source.node_id);
    return scene&&node?{scene,node}:null;
  }

  function createEditableMeshInstance(project,scene,node,{name=null,position_mm=null,rotation_deg=null}={}){
    if(!project||!scene||!node)throw new Error("Source scene/node is required");
    const instance={
      id:meshInstanceId(),
      kind:"EditableMeshInstance",
      name:String(name??(node.label??node.id)+" instance"),
      source:{
        scene_id:String(scene.id),
        node_id:String(node.id),
        source_file:String(scene.source_file??scene.name??""),
        label:String(node.label??node.id)
      },
      transform:{
        position_mm:{
          x:Number(position_mm?.x)||0,
          y:Number(position_mm?.y)||0,
          z:Number(position_mm?.z)||0
        },
        rotation_deg:{
          x:Number(rotation_deg?.x)||0,
          y:Number(rotation_deg?.y)||0,
          z:Number(rotation_deg?.z)||0
        },
        rotation_quaternion:{x:0,y:0,z:0,w:1}
      },
      link_status:"linked",
      source_visible:false,
      compare_source:false,
      visible:true,
      detached_payload:null
    };
    editableMeshInstanceList(project).push(instance);
    return instance;
  }

  function createEditableMeshInstanceByRef(project,sceneId,nodeId,options={}){
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node)throw new Error("Source mesh node is unavailable");
    return createEditableMeshInstance(project,scene,node,options);
  }

  function ensureEditableMeshInstanceByRef(project,sceneId,nodeId){
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node)throw new Error("Source mesh node is unavailable");
    return ensureEditableMeshInstance(project,scene,node);
  }

  function ensureEditableMeshInstance(project,scene,node){
    const existing=editableMeshInstanceList(project,{create:false}).find((item)=>
      item?.link_status!=="detached"&&
      String(item?.source?.scene_id??"")===String(scene?.id??"")&&
      String(item?.source?.node_id??"")===String(node?.id??"")&&
      item?.source_seed===true
    );
    if(existing)return existing;
    const created=createEditableMeshInstance(project,scene,node);
    created.source_seed=true;
    return created;
  }

  function moveEditableMeshInstance(project,instanceId,deltaMm){
    bumpRevision("geometry");
    const instance=meshInstanceById(project,instanceId);
    if(!instance)throw new Error("Editable mesh instance not found");
    const p=instance.transform?.position_mm??{x:0,y:0,z:0};
    instance.transform={
      ...(instance.transform??{}),
      position_mm:{
        x:Number((Number(p.x||0)+Number(deltaMm?.x||0)).toFixed(6)),
        y:Number((Number(p.y||0)+Number(deltaMm?.y||0)).toFixed(6)),
        z:Number((Number(p.z||0)+Number(deltaMm?.z||0)).toFixed(6))
      }
    };
    return instance;
  }

  function normalizedQuaternion(value={}){
    const x=Number(value.x)||0,y=Number(value.y)||0,z=Number(value.z)||0,w=Number.isFinite(Number(value.w))?Number(value.w):1;
    const len=Math.hypot(x,y,z,w)||1;
    return {x:x/len,y:y/len,z:z/len,w:w/len};
  }

  function multiplyQuaternion(aValue,bValue){
    const a=normalizedQuaternion(aValue),b=normalizedQuaternion(bValue);
    return normalizedQuaternion({
      x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,
      y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
      z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,
      w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z
    });
  }

  function axisAngleQuaternion(axis,angleDeg){
    const x=Number(axis?.x)||0,y=Number(axis?.y)||0,z=Number(axis?.z)||0;
    const len=Math.hypot(x,y,z);
    if(!(len>1e-12))throw new Error("Rotation axis is invalid");
    const half=Number(angleDeg)*Math.PI/360,s=Math.sin(half)/len;
    return normalizedQuaternion({x:x*s,y:y*s,z:z*s,w:Math.cos(half)});
  }

  function rotateEditableMeshInstanceAxis(project,instanceId,{axis,angle_deg}={}){
    bumpRevision("geometry");
    const instance=meshInstanceById(project,instanceId);
    if(!instance)throw new Error("Editable mesh instance not found");
    const current=instance.transform?.rotation_quaternion??{x:0,y:0,z:0,w:1};
    const delta=axisAngleQuaternion(axis,Number(angle_deg)||0);
    instance.transform={
      ...(instance.transform??{}),
      rotation_quaternion:multiplyQuaternion(delta,current)
    };
    return instance;
  }

  function rotateEditableMeshInstance(project,instanceId,deltaDeg){
    bumpRevision("geometry");
    const instance=meshInstanceById(project,instanceId);
    if(!instance)throw new Error("Editable mesh instance not found");
    const r=instance.transform?.rotation_deg??{x:0,y:0,z:0};
    instance.transform={
      ...(instance.transform??{}),
      rotation_deg:{
        x:Number((Number(r.x||0)+Number(deltaDeg?.x||0)).toFixed(6)),
        y:Number((Number(r.y||0)+Number(deltaDeg?.y||0)).toFixed(6)),
        z:Number((Number(r.z||0)+Number(deltaDeg?.z||0)).toFixed(6))
      }
    };
    return instance;
  }

  function copyEditableMeshInstance(project,instanceId,{offset_mm={x:0,y:0,z:0},name=null}={}){
    bumpRevision("geometry");
    const source=meshInstanceById(project,instanceId);
    if(!source)throw new Error("Editable mesh instance not found");
    const p=source.transform?.position_mm??{x:0,y:0,z:0};
    const copy=clonePlain(source);
    copy.id=meshInstanceId();
    copy.name=String(name??String(source.name??"Editable mesh")+" copy");
    copy.source_seed=false;
    copy.array_member=null;
    copy.transform={
      ...(copy.transform??{}),
      position_mm:{
        x:Number(p.x||0)+Number(offset_mm?.x||0),
        y:Number(p.y||0)+Number(offset_mm?.y||0),
        z:Number(p.z||0)+Number(offset_mm?.z||0)
      }
    };
    editableMeshInstanceList(project).push(copy);
    return copy;
  }

  function arrayEditableMeshInstance(project,instanceId,{count=2,step_mm={x:0,y:0,z:0}}={}){
    bumpRevision("geometry");
    const n=Math.trunc(Number(count));
    if(!(n>=2))throw new RangeError("Array count must be >= 2");
    const created=[];
    for(let index=1;index<n;index++){
      const copy=copyEditableMeshInstance(project,instanceId,{
        offset_mm:{
          x:Number(step_mm?.x||0)*index,
          y:Number(step_mm?.y||0)*index,
          z:Number(step_mm?.z||0)*index
        }
      });
      copy.array_member={source_instance_id:String(instanceId),member_index:index,derived:false};
      created.push(copy);
    }
    return created;
  }

  function collectDetachedAssets(runtime,node){
    const ids=new Set();
    const visitAsset=(assetId)=>{
      const key=String(assetId??"");
      if(!key||ids.has(key))return;
      const asset=runtime?.assetsById?.get(key);
      if(!asset)return;
      ids.add(key);
      for(const nested of asset.nested_instances??[])visitAsset(nested?.asset_id);
    };
    const visitNode=(item)=>{
      for(const gi of item?.geometry_instances??[])visitAsset(gi?.asset_id);
      for(const child of item?.children??[])visitNode(child);
    };
    visitNode(node);
    return [...ids].map((key)=>clonePlain(runtime.assetsById.get(key))).filter(Boolean);
  }

  function snapshotMeshInstanceSource(project,instance){
    const linked=meshInstanceSource(project,instance);
    if(!linked)throw new Error("Source mesh is unavailable");
    const runtime=runtimeForScene(linked.scene);
    if(!runtime)throw new Error("Source mesh runtime is unavailable");
    return {
      schema:"detached_mesh_instance_v1",
      source_scene_id:String(linked.scene.id),
      source_node_id:String(linked.node.id),
      scale_mm_per_source_unit:Number(linked.scene.scale_mm_per_source_unit)||Number(runtime.scale_mm_per_source_unit)||1,
      node:clonePlain(linked.node),
      assets:collectDetachedAssets(runtime,linked.node)
    };
  }

  function breakEditableMeshInstanceLink(project,instanceId){
    bumpRevision("geometry");
    const instance=meshInstanceById(project,instanceId);
    if(!instance)throw new Error("Editable mesh instance not found");
    if(instance.link_status==="detached")return instance;
    instance.detached_payload=snapshotMeshInstanceSource(project,instance);
    instance.link_status="detached";
    instance.source_seed=false;
    instance.compare_source=false;
    instance.source_visible=false;
    return instance;
  }

  function nodeTranslationMm(node){
    const value=node?.translation_mm;
    const source=Array.isArray(value)
      ? {x:value[0],y:value[1],z:value[2]}
      : value&&typeof value==="object"
        ? value
        : {};
    const out={
      x:Number(source.x)||0,
      y:Number(source.y)||0,
      z:Number(source.z)||0
    };
    return out;
  }

  function addTranslationMm(a,b){
    return {
      x:(Number(a?.x)||0)+(Number(b?.x)||0),
      y:(Number(a?.y)||0)+(Number(b?.y)||0),
      z:(Number(a?.z)||0)+(Number(b?.z)||0)
    };
  }

  function selectedKeySet(){
    return new Set(bulkSelected);
  }

  const FRAME_IDENTITY=Object.freeze([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    0,0,0,1
  ]);

  function frameMatrix16(value){
    if(!Array.isArray(value)||value.length!==16)return FRAME_IDENTITY;
    const out=value.map(Number);
    return out.every(Number.isFinite)?out:FRAME_IDENTITY;
  }

  function frameMultiply4(a,b){
    const left=frameMatrix16(a),right=frameMatrix16(b);
    const out=new Array(16).fill(0);
    for(let col=0;col<4;col+=1){
      for(let row=0;row<4;row+=1){
        let sum=0;
        for(let k=0;k<4;k+=1){
          sum+=left[k*4+row]*right[col*4+k];
        }
        out[col*4+row]=sum;
      }
    }
    return out;
  }

  function frameTransformPoint(point,matrix){
    if(!Array.isArray(point)||point.length<3)return null;
    const x=Number(point[0]),y=Number(point[1]),z=Number(point[2]);
    if(![x,y,z].every(Number.isFinite))return null;
    const m=frameMatrix16(matrix);
    const w=m[3]*x+m[7]*y+m[11]*z+m[15];
    const denom=Number.isFinite(w)&&Math.abs(w)>1e-12?w:1;
    return [
      (m[0]*x+m[4]*y+m[8]*z+m[12])/denom,
      (m[1]*x+m[5]*y+m[9]*z+m[13])/denom,
      (m[2]*x+m[6]*y+m[10]*z+m[14])/denom
    ];
  }

  function runtimeForScene(scene){
    let runtime=runtimes.get(runtimeKey(scene));
    if(!runtime&&scene?.display_runtime){
      registerRuntime(scene.display_runtime);
      runtime=runtimes.get(runtimeKey(scene));
    }
    return runtime??null;
  }

  function emptyFrameBounds(){
    return {
      min:[Infinity,Infinity,Infinity],
      max:[-Infinity,-Infinity,-Infinity],
      point_count:0
    };
  }

  function expandFrameBounds(bounds,pointMm){
    if(!Array.isArray(pointMm)||pointMm.length<3)return;
    const point=pointMm.slice(0,3).map(Number);
    if(!point.every(Number.isFinite))return;
    for(let axis=0;axis<3;axis+=1){
      bounds.min[axis]=Math.min(bounds.min[axis],point[axis]);
      bounds.max[axis]=Math.max(bounds.max[axis],point[axis]);
    }
    bounds.point_count+=1;
  }

  function appendAssetBounds({
    runtime,
    assetId,
    matrix,
    translationMm,
    scaleMm,
    bounds,
    stack=new Set()
  }){
    const key=String(assetId??"");
    if(!key||stack.has(key))return;
    const asset=runtime?.assetsById?.get(key);
    if(!asset||asset.status!=="exact")return;
    const nextStack=new Set(stack);
    nextStack.add(key);

    const appendPoint=(point,transform)=>{
      const source=frameTransformPoint(point,transform);
      if(!source)return;
      expandFrameBounds(bounds,[
        source[0]*scaleMm+translationMm.x,
        source[1]*scaleMm+translationMm.y,
        source[2]*scaleMm+translationMm.z
      ]);
    };

    for(const mesh of asset.meshes??[]){
      const meshMatrix=frameMultiply4(matrix,mesh?.matrix);
      for(const vertex of mesh?.vertices??[])appendPoint(vertex,meshMatrix);
    }

    const positions=asset.line_segments?.positions??[];
    for(let index=0;index+2<positions.length;index+=3){
      appendPoint(
        [positions[index],positions[index+1],positions[index+2]],
        matrix
      );
    }

    for(const nested of asset.nested_instances??[]){
      if(nested?.status!=="exact")continue;
      appendAssetBounds({
        runtime,
        assetId:nested.asset_id,
        matrix:frameMultiply4(matrix,nested.placement_matrix),
        translationMm,
        scaleMm,
        bounds,
        stack:nextStack
      });
    }
  }

  function currentReferenceProjectBounds(project){
    const bounds=emptyFrameBounds();
    for(const scene of project?.referenceScenes??[]){
      const runtime=runtimeForScene(scene);
      if(!runtime){
        return Object.freeze({
          status:"unresolved",
          reason:"Reference-scene runtime is unavailable.",
          point_count:bounds.point_count
        });
      }
      const scaleMm=Number(scene?.scale_mm_per_source_unit)||
        Number(runtime?.scale_mm_per_source_unit)||1;
      if(!Number.isFinite(scaleMm)||scaleMm<=0){
        return Object.freeze({
          status:"unresolved",
          reason:"Reference-scene scale is invalid.",
          point_count:bounds.point_count
        });
      }

      const visit=(node,parentTranslation={x:0,y:0,z:0})=>{
        const translation=addTranslationMm(parentTranslation,nodeTranslationMm(node));
        for(const instance of node?.geometry_instances??[]){
          if(instance?.status!=="exact")continue;
          appendAssetBounds({
            runtime,
            assetId:instance.asset_id,
            matrix:frameMatrix16(instance.placement_matrix),
            translationMm:translation,
            scaleMm,
            bounds
          });
        }
        for(const child of node?.children??[])visit(child,translation);
      };
      for(const root of scene?.tree??[])visit(root);
    }

    if(bounds.point_count===0){
      return Object.freeze({
        status:"empty",
        point_count:0,
        min:null,
        max:null,
        size:null
      });
    }
    const size=bounds.max.map((value,index)=>value-bounds.min[index]);
    return Object.freeze({
      status:"exact",
      point_count:bounds.point_count,
      min:Object.freeze([...bounds.min]),
      max:Object.freeze([...bounds.max]),
      size:Object.freeze(size)
    });
  }

  function automaticFrameFromCurrentBounds(bounds){
    if(bounds?.status!=="exact")return Object.freeze({
      status:bounds?.status??"unresolved",
      reason:bounds?.reason??"Reference bounds are unavailable."
    });
    const min=bounds.min.map(Math.floor);
    const max=bounds.max.map(Math.ceil);
    const size=max.map((value,index)=>value-min[index]);
    if(!size.every((value)=>Number.isFinite(value)&&value>0)){
      return Object.freeze({
        status:"unresolved",
        reason:"Remaining imported geometry does not define a positive 3D frame."
      });
    }
    return Object.freeze({
      status:"exact",
      bbox:Object.freeze({x:size[0],y:size[1],z:size[2]}),
      bboxAnchor:Object.freeze({x:0,y:0,z:0}),
      coordinateOffset:Object.freeze({x:min[0],y:min[1],z:min[2]}),
      exactBoundsMm:Object.freeze({
        min:Object.freeze([...bounds.min]),
        max:Object.freeze([...bounds.max]),
        size:Object.freeze([...bounds.size])
      }),
      frameBoundsMm:Object.freeze({
        min:Object.freeze([...min]),
        max:Object.freeze([...max]),
        size:Object.freeze([...size])
      }),
      roundingRule:"floor_min_ceil_max_mm"
    });
  }

  function renderSceneTree({
    parent,
    sceneMeta,
    runtime,
    project,
    THREE,
    geomScale,
    sourceLookup=null
  }){
    if(sceneMeta?.visible===false)return;
    const sceneGroup=new THREE.Group();
    sceneGroup.name="DWFx reference: "+String(sceneMeta?.source_file??sceneMeta?.name??"");
    sceneGroup.userData.referenceGeometry=true;
    sceneGroup.userData.referenceSceneId=sceneMeta.id;
    const scaleMm=Number(sceneMeta?.scale_mm_per_source_unit)||
      Number(runtime.scale_mm_per_source_unit)||1;
    sceneGroup.scale.setScalar(scaleMm*Number(geomScale||1));

    const hidden=hiddenSet(sceneMeta);
    const transparent=transparentSet(sceneMeta);
    const renderLookup=sourceLookup??buildSourceRenderIndex(project,sceneMeta.id);
    const editable=renderLookup.editableParts;
    const selectedKeys=renderLookup.selectedKeys;
    const selectedGroups=[];

    const visit=(
      node,
      parentHidden=false,
      parentTransparent=false,
      parentTranslation={x:0,y:0,z:0}
    )=>{
      const nodeHidden=parentHidden||hidden.has(String(node.id))||node.visible===false;
      if(nodeHidden)return;
      const nodeTransparent=parentTransparent||transparent.has(String(node.id));
      const translation=addTranslationMm(parentTranslation,nodeTranslationMm(node));

      const recognizedPart=String(node.editable_part_number??"");
      const linkedState=sourceDisplayState(project,sceneMeta,node,renderLookup);
      const meshState=meshSourceDisplayState(project,sceneMeta,node,renderLookup);
      const sourceTube=renderLookup.firstAny.get(String(node.id))??null;
      const detachedSource=sourceLink(sourceTube)?.detached===true;
      const suppressEditable=meshState
        ? !meshState.visible
        : linkedState
          ? !linkedState.visible
          : detachedSource
            ? false
            : !!(recognizedPart&&editable.has(recognizedPart));

      if(!suppressEditable){
        const nodeGroup=new THREE.Group();
        nodeGroup.userData.referenceShared=true;
        nodeGroup.userData.referenceGeometry=true;
        nodeGroup.userData.referenceNodeId=String(node.id);
        nodeGroup.userData.referenceSceneId=String(sceneMeta.id);
        if(linkedState?.tube?.id){
          nodeGroup.userData.sourceLinkedEditableTubeId=String(linkedState.tube.id);
          nodeGroup.userData.sourceEditableHighlight=linkedState.selectedEditable===true;
          nodeGroup.userData.sourceCompare=linkedState.compare===true;
        }
        nodeGroup.position.set(
          translation.x/scaleMm,
          translation.y/scaleMm,
          translation.z/scaleMm
        );
        let instanceCount=0;
        for(const instance of node.geometry_instances??[]){
          if(instance?.status!=="exact")continue;
          const asset=runtime.assetsById.get(String(instance.asset_id));
          if(!asset||asset.status!=="exact")continue;
          const template=buildAssetTemplate(
            runtime,
            asset,
            THREE,
            (nodeTransparent||linkedState?.transparent||meshState?.transparent)?"transparent":"normal"
          );
          const placed=template.clone(true);
          placed.userData.referenceShared=true;
          placed.userData.referenceGeometry=true;
          placed.userData.referenceNodeId=String(node.id);
          placed.userData.referenceSceneId=String(sceneMeta.id);
          if(linkedState?.tube?.id){
            placed.userData.sourceLinkedEditableTubeId=String(linkedState.tube.id);
            placed.userData.sourceEditableHighlight=linkedState.selectedEditable===true;
            placed.userData.sourceCompare=linkedState.compare===true;
          }
          if(Array.isArray(instance.placement_matrix)&&instance.placement_matrix.length===16){
            placed.matrix.fromArray(instance.placement_matrix);
            placed.matrixAutoUpdate=false;
          }
          nodeGroup.add(placed);
          instanceCount+=1;
        }
        if(instanceCount){
          sceneGroup.add(nodeGroup);
          if(selectedKeys.has(selectionKey(sceneMeta.id,node.id))){
            selectedGroups.push(nodeGroup);
          }
        }
      }

      for(const child of node.children??[]){
        visit(child,nodeHidden,nodeTransparent,translation);
      }
    };

    for(const root of sceneMeta?.tree??[]){
      visit(root,false,false,{x:0,y:0,z:0});
    }
    parent.add(sceneGroup);

    if(selectedGroups.length){
      sceneGroup.updateMatrixWorld(true);
      for(const group of selectedGroups){
        const box=new THREE.Box3().setFromObject(group);
        if(box.isEmpty())continue;
        const helper=new THREE.Box3Helper(box,0x4da3ff);
        helper.userData.helper=true;
        helper.userData.referenceSelectionHelper=true;
        parent.add(helper);
      }
    }
  }

  function detachedRuntime(payload){
    if(!payload?.assets)return null;
    return {
      scale_mm_per_source_unit:Number(payload.scale_mm_per_source_unit)||1,
      assetsById:new Map((payload.assets??[]).map((asset)=>[String(asset.id),asset]))
    };
  }

  function renderMeshInstanceNode({
    parent,node,runtime,THREE,instanceId,sceneId,sourceNodeId,transparent=false
  }){
    const nodeGroup=new THREE.Group();
    const t=nodeTranslationMm(node);
    const scaleMm=Number(runtime?.scale_mm_per_source_unit)||1;
    nodeGroup.position.set(t.x/scaleMm,t.y/scaleMm,t.z/scaleMm);
    nodeGroup.userData={
      helper:false,
      referenceEditableInstanceId:String(instanceId),
      sourceReferenceSceneId:String(sceneId??""),
      sourceReferenceNodeId:String(sourceNodeId??""),
      editableMeshInstance:true
    };
    let count=0;
    for(const geometryInstance of node?.geometry_instances??[]){
      if(geometryInstance?.status!=="exact")continue;
      const asset=runtime?.assetsById?.get(String(geometryInstance.asset_id));
      if(!asset||asset.status!=="exact")continue;
      const placed=buildAssetTemplate(runtime,asset,THREE,transparent?"transparent":"normal").clone(true);
      placed.userData={
        ...(placed.userData??{}),
        referenceEditableInstanceId:String(instanceId),
        sourceReferenceSceneId:String(sceneId??""),
        sourceReferenceNodeId:String(sourceNodeId??""),
        editableMeshInstance:true
      };
      if(Array.isArray(geometryInstance.placement_matrix)&&geometryInstance.placement_matrix.length===16){
        placed.matrix.fromArray(geometryInstance.placement_matrix);
        placed.matrixAutoUpdate=false;
      }
      nodeGroup.add(placed);count+=1;
    }
    for(const child of node?.children??[]){
      count+=renderMeshInstanceNode({
        parent:nodeGroup,node:child,runtime,THREE,instanceId,sceneId,sourceNodeId,transparent
      });
    }
    if(count)parent.add(nodeGroup);
    return count;
  }

  function renderEditableMeshInstances({parent,project,THREE,geomScale}){
    let rendered=0;
    for(const instance of editableMeshInstanceList(project,{create:false})){
      if(instance?.visible===false)continue;
      let sourceScene=null,sourceNode=null,runtime=null,scaleMm=1;
      if(instance.link_status==="detached"&&instance.detached_payload){
        sourceNode=instance.detached_payload.node;
        runtime=detachedRuntime(instance.detached_payload);
        scaleMm=Number(instance.detached_payload.scale_mm_per_source_unit)||1;
      }else{
        const linked=meshInstanceSource(project,instance);
        if(!linked)continue;
        sourceScene=linked.scene;sourceNode=linked.node;
        runtime=runtimeForScene(sourceScene);
        scaleMm=Number(sourceScene?.scale_mm_per_source_unit)||Number(runtime?.scale_mm_per_source_unit)||1;
      }
      if(!sourceNode||!runtime)continue;
      const sceneGroup=new THREE.Group();
      sceneGroup.name="Editable mesh instance: "+String(instance.name??instance.id);
      sceneGroup.scale.setScalar(scaleMm*Number(geomScale||1));
      sceneGroup.userData={
        referenceEditableInstanceId:String(instance.id),
        editableMeshInstance:true,
        sourceReferenceSceneId:String(instance.source?.scene_id??""),
        sourceReferenceNodeId:String(instance.source?.node_id??"")
      };
      const transform=instance.transform??{};
      const p=transform.position_mm??{};
      sceneGroup.position.set(
        (Number(p.x)||0)*Number(geomScale||1),
        (Number(p.y)||0)*Number(geomScale||1),
        (Number(p.z)||0)*Number(geomScale||1)
      );
      const q=transform.rotation_quaternion;
      if(q&&[q.x,q.y,q.z,q.w].every((value)=>Number.isFinite(Number(value)))){
        sceneGroup.quaternion.set(Number(q.x),Number(q.y),Number(q.z),Number(q.w)).normalize();
      }else{
        const r=transform.rotation_deg??{};
        sceneGroup.rotation.set(
          THREE.MathUtils.degToRad(Number(r.x)||0),
          THREE.MathUtils.degToRad(Number(r.y)||0),
          THREE.MathUtils.degToRad(Number(r.z)||0),
          "XYZ"
        );
      }
      const count=renderMeshInstanceNode({
        parent:sceneGroup,node:sourceNode,runtime:{...runtime,scale_mm_per_source_unit:scaleMm},
        THREE,instanceId:instance.id,
        sceneId:instance.source?.scene_id,nodeId:instance.source?.node_id,
        sourceNodeId:instance.source?.node_id,
        transparent:false
      });
      if(count){
        parent.add(sceneGroup);rendered+=1;
      }
    }
    return rendered;
  }

  function render3D({parent,project,THREE,geomScale}){
    if(!parent||!project||!THREE)return 0;
    let count=0;
    let sourceIndex=null;
    for(const sceneMeta of project.referenceScenes??[]){
      let runtime=runtimes.get(runtimeKey(sceneMeta));
      if(!runtime&&sceneMeta?.display_runtime){
        registerRuntime(sceneMeta.display_runtime);
        runtime=runtimes.get(runtimeKey(sceneMeta));
      }
      if(!runtime)continue;
      if(!sourceIndex)sourceIndex=buildProjectSourceRenderIndex(project);
      renderSceneTree({
        parent,sceneMeta,runtime,project,THREE,geomScale,
        sourceLookup:sourceIndex.forScene(sceneMeta.id)
      });
      count+=1;
    }
    count+=renderEditableMeshInstances({parent,project,THREE,geomScale});
    return count;
  }

  // PERF-001: cooperative DWFx geometry construction, with an atomic commit.
  // The existing render3D entry point remains synchronous for legacy callers.
  // Consumers can opt in and provide a render callback after commit.
  let cooperativeGeneration=0;
  let activeCooperativeHandle=null;
  let cachedScene=null;
  const revisions={geometry:0,display:0,selection:0};
  function bumpRevision(kind){
    if(!Object.prototype.hasOwnProperty.call(revisions,kind))throw new RangeError("Unknown DWFx revision kind");
    revisions[kind]++;
    return revisions[kind];
  }
  function revisionSnapshot(){return {...revisions};}
  // An opt-in token is safe only if every external source-state writer invokes
  // markSceneChanged; otherwise use the full conservative signature.
  function markSceneChanged(project,kind="geometry"){
    bumpRevision(kind);
    invalidateSceneCache();
  }
  const sceneReuseStats={hits:0,misses:0,invalidations:0,signatureCalls:0,signatureTimeMs:0,maxSignatureTimeMs:0,lastSignatureTimeMs:0,lastSignatureBytes:0,emptyFastPaths:0,lastLinksTimeMs:0,lastSerializeTimeMs:0,sourceIndexBuilds:0,staleBuilds:0};
  // Explicit invalidation for import/replacement and renderer disposal.
  // Uninstrumented mutation paths still use the conservative source signature.
  function invalidateSceneCache(){
    cooperativeGeneration++;
    if(activeCooperativeHandle)activeCooperativeHandle.cancel();
    activeCooperativeHandle=null;
    cachedScene=null;
    sceneReuseStats.invalidations++;
  }
  // Only source/reference properties influence the cache key. Ordinary tube
  // bend/length edits do not, but source link/visibility edits do.
  function referenceSignature(project,geomScale){
    // Empty reference projects have no DWFx geometry to rebuild. Avoid walking
    // potentially large tube arrays on every ordinary editing frame.
    if(!(project?.referenceScenes?.length) && !(project?.editable_mesh_instances?.length)){
      sceneReuseStats.emptyFastPaths++;
      return "empty-reference-scenes";
    }
    // Include link collection in measured time: it can dominate serialization
    // for projects with many editable tubes. Legacy mutation safety is unchanged.
    const started=meshNow();
    const sourceLinks=(project?.tubes??[]).map(tube=>({
      id:tube?.id,
      partNumber:tube?.partNumber??tube?.part_number,
      source:tube?.currentProjectImport?.source_link,
      sourceFormat:tube?.currentProjectImport?.source_format,
      importedPart:tube?.currentProjectImport?.part_number
    }));
    const linksFinished=meshNow();
    const signature=JSON.stringify({
      scenes:project?.referenceScenes??[],
      meshInstances:project?.editable_mesh_instances??[],
      links:sourceLinks,
      selected:[...bulkSelected].sort(),
      objectSelection:(window.TubeBenderObjectContext?.selectionEntries?.()??[]).map(entry=>({kind:entry?.kind,tubeId:entry?.tubeId,instanceId:entry?.instanceId})),
      geomScale,
      revisions:revisionSnapshot()
    });
    const finished=meshNow();
    const elapsed=Math.max(0,finished-started);
    sceneReuseStats.lastLinksTimeMs=Math.max(0,linksFinished-started);
    sceneReuseStats.lastSerializeTimeMs=Math.max(0,finished-linksFinished);
    sceneReuseStats.signatureCalls++;
    sceneReuseStats.signatureTimeMs+=elapsed;
    sceneReuseStats.lastSignatureTimeMs=elapsed;
    sceneReuseStats.maxSignatureTimeMs=Math.max(sceneReuseStats.maxSignatureTimeMs,elapsed);
    sceneReuseStats.lastSignatureBytes=signature.length;
    return signature;
  }

  // Preserve shared imported scene across disposal of the old CAD parent group.
  // This only detaches the cached group; its shared GPU resources remain alive.
  function beforeParentDispose(root){
    const group=cachedScene?.group;
    if(!root||!group||!group.parent)return false;
    let ancestor=group.parent;
    while(ancestor){
      if(ancestor===root){
        group.parent.remove(group);
        return true;
      }
      ancestor=ancestor.parent;
    }
    return false;
  }

  function render3DCooperative({
    parent,project,THREE,geomScale,batchSize=8,
    postTask=(fn)=>setTimeout(fn,0),
    cancelTask=(id)=>clearTimeout(id),
    onCommit=()=>{},
    onError=()=>{},
    progressive=false,
    onProgress=()=>{},
    onStale=()=>{}
  }){
    if(!parent||!project||!THREE)throw new TypeError("3D parent, project and THREE required");
    if(!Number.isSafeInteger(batchSize)||batchSize<1)throw new RangeError("Invalid batch size");
    const generation=++cooperativeGeneration;
    if(activeCooperativeHandle)activeCooperativeHandle.cancel();
    // Lazy runtime registration bumps geometry revision. Resolve loaded
    // reference runtimes before taking the cache signature, so a first render
    // is reusable immediately after its cooperative build commits.
    for(const scene of project.referenceScenes??[]){
      if(scene?.visible!==false&&scene?.display_runtime&&
         !runtimes.has(runtimeKey(scene)))runtimeForScene(scene);
    }
    // A previously completed staging group is referenced only by cachedScene.
    // No geometry/material is disposed here: templates are shared by design.
    const signature=referenceSignature(project,geomScale);
    const snapshot=revisionSnapshot();
    if(cachedScene?.signature===signature&&cachedScene.project===project&&
       cachedScene.THREE===THREE&&cachedScene.group){
      if(cachedScene.group.parent!==parent)parent.add(cachedScene.group);
      sceneReuseStats.hits++;
      const result={total:0,processed:0,failures:0,committed:true,reused:true};
      try{onCommit({...result});}catch{}
      const handle=Object.freeze({
        cancel(){},
        get status(){return {...result,pending:false};},
        get group(){return cachedScene.group;}
      });
      activeCooperativeHandle=handle;
      return handle;
    }
    sceneReuseStats.misses++;
    const staging=new THREE.Group();
    let sourceIndex=null;
    staging.name="DWFx cooperative geometry";
    const work=[];
    for(const sceneMeta of project.referenceScenes??[]){
      if(!sceneMeta||sceneMeta.visible===false)continue;
      const runtime=runtimeForScene(sceneMeta);
      if(!runtime)continue;
      for(const root of sceneMeta.tree??[]){
        work.push({sceneMeta,runtime,root});
      }
    }
    // Prepare large mesh buffers in bounded slices before THREE object creation.
    // Each mesh is staged privately and published only once fully copied.
    const meshJobs=[],seenMeshes=new Set();
    for(const runtime of new Set(work.map(entry=>entry.runtime))){
      for(const asset of runtime.assetsById.values()){
        if(asset?.kind!=="mesh")continue;
        for(const mesh of asset.meshes??[]){
          if(!mesh||seenMeshes.has(mesh)||preparedMeshBuffers.has(mesh))continue;
          seenMeshes.add(mesh);
          if(!(mesh.vertices?.length&&mesh.faces?.length))continue;
          meshJobs.push({
            mesh,positions:new Float32Array(mesh.vertices.length*3),
            indices:new Uint32Array(mesh.faces.length*3),
            normals:new Float32Array(mesh.vertices.length*3),v:0,f:0,n:0,normalized:0
          });
        }
      }
    }
    let meshJobIndex=0;
    let index=0,pending=null,done=false,failures=0,attached=false;
    const attach=()=>{
      if(attached)return;
      parent.add(staging);attached=true;
    };
    const result={total:work.length,processed:0,failures:0,committed:false,stale:false};
    const revisionChanged=()=>Object.keys(snapshot).some(key=>revisions[key]!==snapshot[key]);
    const stop=()=>{
      if(done)return;
      done=true;
      if(pending!==null){try{cancelTask(pending);}catch{}pending=null;}
      // Progressive staging might already be attached; remove it on cancel.
      if(attached&&staging.parent)staging.parent.remove(staging);
      staging.clear();
    };
    const discardStale=()=>{
      result.stale=true;
      sceneReuseStats.staleBuilds++;
      stop();
      try{onStale({...result,pending:false});}catch(error){
        try{onError(error,index);}catch{}
      }
    };
    function step(){
      pending=null;
      if(done||generation!==cooperativeGeneration){stop();return;}
      // O(1) counter checks on each task: no full project scan per mesh batch.
      if(revisionChanged()){discardStale();return;}
      if(meshJobIndex<meshJobs.length){
        let remaining=2048;
        while(remaining>0&&meshJobIndex<meshJobs.length){
          const job=meshJobs[meshJobIndex];
          const vertices=job.mesh.vertices,faces=job.mesh.faces;
          while(remaining>0&&job.v<vertices.length){
            const i=job.v++,vertex=vertices[i];
            job.positions[i*3]=Number(vertex?.[0])||0;
            job.positions[i*3+1]=Number(vertex?.[1])||0;
            job.positions[i*3+2]=Number(vertex?.[2])||0;
            remaining--;
          }
          while(remaining>0&&job.f<faces.length){
            const i=job.f++,face=faces[i];
            job.indices[i*3]=Number(face?.[0])||0;
            job.indices[i*3+1]=Number(face?.[1])||0;
            job.indices[i*3+2]=Number(face?.[2])||0;
            remaining--;
          }
          if(job.v===vertices.length&&job.f===faces.length){
            // Match indexed Three.js normals: add unnormalized triangle cross
            // products to each participating vertex, then normalize vectors.
            while(remaining>0&&job.n<faces.length){
              const k=job.n++*3;
              const a=job.indices[k],b=job.indices[k+1],c=job.indices[k+2];
              if(a<vertices.length&&b<vertices.length&&c<vertices.length){
                const p=job.positions;
                const ax=p[a*3],ay=p[a*3+1],az=p[a*3+2];
                const bx=p[b*3],by=p[b*3+1],bz=p[b*3+2];
                const cx=p[c*3],cy=p[c*3+1],cz=p[c*3+2];
                const ux=cx-bx,uy=cy-by,uz=cz-bz;
                const vx=ax-bx,vy=ay-by,vz=az-bz;
                const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
                for(const id of [a,b,c]){
                  job.normals[id*3]+=nx;job.normals[id*3+1]+=ny;job.normals[id*3+2]+=nz;
                }
              }
              remaining--;
            }
            while(remaining>0&&job.n===faces.length&&job.normalized<vertices.length){
              const i=job.normalized++*3,n=job.normals;
              const length=Math.hypot(n[i],n[i+1],n[i+2]);
              if(length>0){n[i]/=length;n[i+1]/=length;n[i+2]/=length;}
              remaining--;
            }
          }
          if(job.v===vertices.length&&job.f===faces.length&&
             job.n===faces.length&&job.normalized===vertices.length){
            preparedMeshBuffers.set(job.mesh,{positions:job.positions,indices:job.indices,normals:job.normals});
            meshJobIndex++;
          }
        }
        try{pending=postTask(step);}
        catch(error){try{onError(error,index);}catch{}stop();}
        return;
      }
      const limit=Math.min(index+batchSize,work.length);
      for(;index<limit;index++){
        const {sceneMeta,runtime,root}=work[index];
        try{
          if(!sourceIndex)sourceIndex=buildProjectSourceRenderIndex(project);
          const sourceLookup=sourceIndex.forScene(sceneMeta.id);
          renderSceneTree({
            parent:staging,
            sceneMeta:{...sceneMeta,tree:[root]},
            runtime,project,THREE,geomScale,sourceLookup
          });
        }catch(error){
          failures++;
          try{onError(error,index);}catch{}
        }
        result.processed++;
      }
      result.failures=failures;
      if(revisionChanged()){discardStale();return;}
      if(progressive&&index>0&&index<work.length){
        attach();
        try{onProgress({...result,committed:false});}catch{}
      }
      if(index<work.length){
        try{pending=postTask(step);}
        catch(error){try{onError(error,index);}catch{}stop();}
        return;
      }
      if(done||generation!==cooperativeGeneration){stop();return;}
      // Direct writes from legacy modules may not bump revisions; perform
      // one conservative signature comparison before the final scene commit.
      if(revisionChanged()||referenceSignature(project,geomScale)!==signature){
        discardStale();
        return;
      }
      try{renderEditableMeshInstances({parent:staging,project,THREE,geomScale});}
      catch(error){failures++;try{onError(error,index);}catch{}}
      result.failures=failures;
      attach();
      done=true;
      result.committed=true;
      cachedScene={signature,project,THREE,group:staging};
      try{onCommit({...result});}catch{}
    }
    try{pending=postTask(step);}
    catch(error){try{onError(error,0);}catch{}stop();}
    const handle=Object.freeze({
      cancel:stop,
      get status(){return {...result,pending:!done};},
      get group(){return attached?staging:null;}
    });
    activeCooperativeHandle=handle;
    return handle;
  }

  function matchNode(node,query){
    if(!query)return true;
    if(String(node?.label??"").toLowerCase().includes(query))return true;
    return (node?.children??[]).some((child)=>matchNode(child,query));
  }

  function selectionKey(sceneId,nodeId){
    return String(sceneId)+"|"+String(nodeId);
  }

  function selectableNode(node){
    return !!node && !node.editable_part_number;
  }

  function collectSelectableNodes(nodes,out=[]){
    for(const node of nodes??[]){
      if(selectableNode(node))out.push(node);
      collectSelectableNodes(node?.children,out);
    }
    return out;
  }

  function collectSelectableSubtree(node,out=[]){
    if(!node)return out;
    if(selectableNode(node))out.push(node);
    for(const child of node.children??[])collectSelectableSubtree(child,out);
    return out;
  }

  function selectedEntries(project){
    const entries=[];
    for(const scene of project?.referenceScenes??[]){
      const byId=new Map();
      const stack=[...(scene?.tree??[])];
      while(stack.length){
        const node=stack.shift();
        byId.set(String(node.id),node);
        stack.unshift(...(node.children??[]));
      }
      for(const key of bulkSelected){
        const prefix=String(scene.id)+"|";
        if(!key.startsWith(prefix))continue;
        const node=byId.get(key.slice(prefix.length));
        if(node&&selectableNode(node))entries.push({scene,node});
      }
    }
    return entries;
  }

  function pruneBulkSelection(project){
    const valid=new Set(
      selectedEntries(project).map(({scene,node})=>selectionKey(scene.id,node.id))
    );
    for(const key of [...bulkSelected]){
      if(!valid.has(key))bulkSelected.delete(key);
    }
  }

  function selectedCount(project){
    pruneBulkSelection(project);
    return bulkSelected.size;
  }

  function treeItems({project,query="",escape=escHtml}){
    const rows=[];
    const q=String(query??"").trim().toLowerCase();
    const scenes=(project?.referenceScenes??[]).filter(Boolean);
    const editableTubes=linkedEditableTubes(project);
    const editableMeshes=editableMeshInstanceList(project,{create:false});
    if(!scenes.length&&!editableTubes.length&&!editableMeshes.length)return rows;

    pruneBulkSelection(project);
    const bulkCount=bulkSelected.size;
    const rootCollapsed=q?false:project?.referenceGeometryTreeCollapsed===true;
    const sourceCollapsed=q?false:project?.referenceSourceTreeCollapsed===true;
    const editableCollapsed=q?false:project?.referenceEditableTreeCollapsed===true;
    const allSelectable=scenes.flatMap((scene)=>collectSelectableNodes(scene.tree??[]));
    const allSelectedCount=scenes.reduce((sum,scene)=>
      sum+collectSelectableNodes(scene.tree??[]).filter((node)=>
        bulkSelected.has(selectionKey(scene.id,node.id))
      ).length
    ,0);
    const rootChecked=allSelectable.length>0&&allSelectedCount===allSelectable.length;
    const rootIndeterminate=allSelectedCount>0&&!rootChecked;

    rows.push(
      '<div class="tb-tree-node level1 tb-ref-root" data-ref-root-row="1">'+
      '<input type="checkbox" data-ref-root-select="1" '+
      (rootChecked?'checked ':'')+
      (allSelectable.length?'':'disabled ')+
      'data-ref-indeterminate="'+(rootIndeterminate?'1':'0')+'" title="Выбрать Source / Reference геометрию">'+
      '<button class="tb-tree-icon" data-ref-root-toggle="1" title="Свернуть/развернуть импортированную геометрию">'+
      (rootCollapsed?'▸':'▾')+
      '</button>'+
      '<span class="tb-tree-label">🌐 Импортированная геометрия <small>· Source: '+scenes.length+' · Editable: '+(editableTubes.length+editableMeshes.length)+'</small></span>'+
      '</div>'
    );

    if(rootCollapsed)return rows;

    rows.push(
      '<div class="tb-tree-node level2 tb-ref-source-root" style="padding-left:30px" data-ref-source-root="1">'+
      '<button class="tb-tree-icon" data-ref-source-toggle="1" title="Свернуть/развернуть Source / Reference">'+
      (sourceCollapsed?'▸':'▾')+
      '</button>'+
      '<span class="tb-tree-label">🔒 Source / Reference <small>· неизменяемый исходник</small></span>'+
      '</div>'
    );

    if(!sourceCollapsed){
      rows.push(
        '<div class="tb-tree-node tb-ref-bulk-toolbar" data-ref-bulk-toolbar="1" '+
        'style="gap:6px;align-items:center;flex-wrap:wrap;padding:6px 8px 6px 48px">'+
        '<span class="tb-tree-label" style="min-width:86px">Выбрано: '+bulkCount+'</span>'+
        '<small title="Групповой выбор: Ctrl+клик; диапазон: Shift+клик">Ctrl+клик · Shift+клик</small>'+
        '<button data-ref-bulk-action="show" '+(bulkCount?'':'disabled')+' title="Показать выбранные Source-компоненты">Показать</button>'+
        '<button data-ref-bulk-action="hide" '+(bulkCount?'':'disabled')+' title="Скрыть выбранные Source-компоненты">Скрыть</button>'+
        '<button data-ref-bulk-action="transparent" '+(bulkCount?'':'disabled')+' title="Переключить прозрачность Source">Прозрачность</button>'+
        '<button data-ref-bulk-action="clear" '+(bulkCount?'':'disabled')+' title="Снять выбор">Снять выбор</button>'+
        '</div>'
      );

      for(const scene of scenes){
        const collapsedScenes=new Set(
          Array.isArray(scene.collapsedNodeIds)
            ? scene.collapsedNodeIds.map(String)
            : []
        );
        const hidden=hiddenSet(scene);
        const transparent=transparentSet(scene);
        const sceneSelectable=collectSelectableNodes(scene.tree??[]);
        const sceneSelectedCount=sceneSelectable.filter((node)=>
          bulkSelected.has(selectionKey(scene.id,node.id))
        ).length;
        const sceneChecked=sceneSelectable.length>0&&sceneSelectedCount===sceneSelectable.length;
        const sceneIndeterminate=sceneSelectedCount>0&&!sceneChecked;
        const sceneLabel=String(scene.name??scene.source_file??"DWFx");
        const sceneMatches=
          !q||
          sceneLabel.toLowerCase().includes(q)||
          (scene.tree??[]).some((node)=>matchNode(node,q));
        if(!sceneMatches)continue;

        const sceneCollapsed=q?false:scene.treeCollapsed===true;
        rows.push(
          '<div class="tb-tree-node tb-ref-scene" style="padding-left:48px" data-ref-scene-row="'+escape(scene.id)+'">'+
          '<input type="checkbox" data-ref-scene-select="'+escape(scene.id)+'" '+
          (sceneChecked?'checked ':'')+
          'data-ref-indeterminate="'+(sceneIndeterminate?'1':'0')+'" title="Выбрать readonly-компоненты файла">'+
          '<button class="tb-tree-icon" data-ref-scene-toggle="'+escape(scene.id)+'" title="Свернуть/развернуть файл">'+
          (sceneCollapsed?'▸':'▾')+
          '</button>'+
          '<span class="tb-tree-label">📦 '+escape(sceneLabel)+' <small>· DWFx · Source readonly</small></span>'+
          '<button class="tb-tree-eye" data-ref-scene-eye="'+escape(scene.id)+'" title="Видимость Source">'+
          (scene.visible===false?'○':'◉')+
          '</button></div>'
        );

        if(sceneCollapsed)continue;

        const append=(node,depth)=>{
          if(q&&!matchNode(node,q))return;
          const hasChildren=(node.children??[]).length>0;
          const collapsed=q?false:collapsedScenes.has(String(node.id));
          const isHidden=hidden.has(String(node.id));
          const isTransparent=transparent.has(String(node.id));
          const status=String(node.geometry_status??"");
          const editable=!!node.editable_part_number;
          const linked=linkedTubeForSource(project,scene.id,node.id);
          const selectable=!editable;
          const checked=selectable&&bulkSelected.has(selectionKey(scene.id,node.id));
          const icon=hasChildren
            ? (collapsed?'▸':'▾')
            : editable
              ? '🔗'
              : status==="unresolved"||status==="partial"
                ? '⚠'
                : status==="metadata_only"
                  ? '◇'
                  : '◆';
          const pad=Math.min(260,66+depth*18);
          const cls=
            selected?.sceneId===String(scene.id)&&
            selected?.nodeId===String(node.id)
              ? " active"
              : "";
          rows.push(
            '<div class="tb-tree-node clickable tb-ref-node'+cls+'" '+
            'style="padding-left:'+pad+'px" '+
            'data-ref-scene="'+escape(scene.id)+'" data-ref-node="'+escape(node.id)+'" '+
            (node.editable_part_number?'data-ref-editable-part="'+escape(node.editable_part_number)+'" ':'')+
            '>'+
            (selectable
              ? '<input type="checkbox" data-ref-select="'+escape(node.id)+'" '+(checked?'checked ':'')+'title="Выбрать Source компонент/группу">'
              : '<span style="width:13px;display:inline-block"></span>')+
            '<button class="tb-tree-icon" '+(hasChildren?'data-ref-toggle="'+escape(node.id)+'"':'disabled')+'>'+
            icon+'</button>'+
            '<span class="tb-tree-label">'+escape(node.label??node.id)+
            (editable
              ? ' <small>· Source'+(linked?' ↔ Editable':' · recognized')+'</small>'
              : status==="metadata_only"
                ? ' <small>· Source · без геометрии</small>'
                : ' <small>· Source · только чтение'+(isTransparent?' · прозрачно':'')+'</small>')+
            '</span>'+
            '<button class="tb-tree-eye" data-ref-eye="'+escape(node.id)+'" title="Видимость Source">'+
            (isHidden?'○':'◉')+
            '</button></div>'
          );
          if(hasChildren&&!collapsed){
            for(const child of node.children??[])append(child,depth+1);
          }
        };
        for(const root of scene.tree??[])append(root,0);
      }
    }

    const editableMatches=editableTubes.filter((tube)=>{
      if(!q)return true;
      const link=sourceLink(tube);
      return [
        tube?.name,tube?.partNumber,tube?.part_number,
        link?.source_label,link?.part_number,link?.source_file
      ].filter(Boolean).some((value)=>String(value).toLowerCase().includes(q));
    });
    rows.push(
      '<div class="tb-tree-node level2 tb-ref-editable-root" style="padding-left:30px" data-ref-editable-root="1">'+
      '<button class="tb-tree-icon" data-ref-editable-toggle="1" title="Свернуть/развернуть Editable geometry">'+
      (editableCollapsed?'▸':'▾')+
      '</button>'+
      '<span class="tb-tree-label">✎ Editable geometry <small>· '+(editableTubes.length+editableMeshes.length)+'</small></span>'+
      '</div>'
    );
    if(!editableCollapsed){
      for(const tube of editableMatches){
        const link=sourceLink(tube);
        const linked=!!link&&link.detached!==true&&!!sourceNodeForTube(project,tube);
        const display=String(link?.display??"hidden");
        rows.push(
          '<div class="tb-tree-node clickable tb-import-editable" style="padding-left:50px" '+
          'data-tree-tube="'+escape(tube.id)+'" data-import-editable-tube="'+escape(tube.id)+'">'+
          '<span style="width:13px;display:inline-block"></span>'+
          '<span class="tb-tree-icon">'+(linked?'🔗':'⛓̸')+'</span>'+
          '<span class="tb-tree-label">'+escape(tube.name??tube.partNumber??tube.id)+
          ' <small>· Editable'+(linked?' · source '+escape(link.part_number??""):' · link broken')+
          (linked&&display!=="hidden"?' · Source '+escape(display):'')+
          '</small></span></div>'
        );
      }
      const meshMatches=editableMeshes.filter((instance)=>{
        if(!q)return true;
        return [
          instance?.name,instance?.source?.label,instance?.source?.source_file
        ].filter(Boolean).some((value)=>String(value).toLowerCase().includes(q));
      });
      for(const instance of meshMatches){
        const linked=instance.link_status!=="detached";
        const p=instance.transform?.position_mm??{x:0,y:0,z:0};
        rows.push(
          '<div class="tb-tree-node clickable tb-import-mesh-instance" style="padding-left:50px" '+
          'data-import-mesh-instance="'+escape(instance.id)+'">'+
          '<span style="width:13px;display:inline-block"></span>'+
          '<span class="tb-tree-icon">'+(linked?'◇':'◆')+'</span>'+
          '<span class="tb-tree-label">'+escape(instance.name??instance.id)+
          ' <small>· Mesh Instance · '+(linked?'shared Source':'detached')+
          ' · Δ '+escape(Number(p.x||0).toFixed(1))+','+escape(Number(p.y||0).toFixed(1))+','+escape(Number(p.z||0).toFixed(1))+
          '</small></span></div>'
        );
      }
    }
    return rows;
  }

  function findScene(project,id){
    return (project?.referenceScenes??[]).find(
      (scene)=>String(scene?.id)===String(id)
    )??null;
  }

  function findNode(tree,id){
    const target=String(id);
    const stack=[...(tree??[])];
    while(stack.length){
      const node=stack.shift();
      if(String(node?.id)===target)return node;
      stack.unshift(...(node?.children??[]));
    }
    return null;
  }

  function ancestorsFor(tree,targetId){
    const target=String(targetId);
    const path=[];
    const walk=(nodes)=>{
      for(const node of nodes??[]){
        path.push(String(node.id));
        if(String(node.id)===target)return true;
        if(walk(node.children))return true;
        path.pop();
      }
      return false;
    };
    walk(tree??[]);
    return path;
  }

  function toggleSceneSelection(scene,checked){
    bumpRevision("selection");
    for(const node of collectSelectableNodes(scene?.tree??[])){
      const key=selectionKey(scene.id,node.id);
      if(checked)bulkSelected.add(key);else bulkSelected.delete(key);
    }
  }

  function toggleNodeSelection(scene,node,checked){
    bumpRevision("selection");
    for(const item of collectSelectableSubtree(node)){
      const key=selectionKey(scene.id,item.id);
      if(checked)bulkSelected.add(key);else bulkSelected.delete(key);
    }
  }

  function applyBulkVisibility(project,visible){
    bumpRevision("display");
    for(const {scene,node} of selectedEntries(project)){
      const hidden=hiddenSet(scene);
      if(visible){
        hidden.delete(String(node.id));
        for(const ancestorId of ancestorsFor(scene.tree,node.id))hidden.delete(String(ancestorId));
      }else{
        hidden.add(String(node.id));
      }
      scene.hiddenNodeIds=[...hidden];
    }
  }

  function isolateSelection(project){
    bumpRevision("display");
    const selectedTop=selectedTopLevelEntries(project);
    const selectedByScene=new Map();
    for(const {scene,node} of selectedTop){
      const key=String(scene.id);
      const list=selectedByScene.get(key)??[];
      list.push(node);
      selectedByScene.set(key,list);
    }

    for(const scene of project?.referenceScenes??[]){
      const chosen=selectedByScene.get(String(scene.id))??[];
      if(!chosen.length){
        scene.visible=false;
        continue;
      }

      scene.visible=true;
      const keep=new Set();
      for(const selectedNode of chosen){
        for(const id of ancestorsFor(scene.tree,selectedNode.id))keep.add(String(id));
        for(const item of collectSelectableSubtree(selectedNode))keep.add(String(item.id));

        // A selected group may contain metadata/editable descendants that are not
        // bulk-selectable but are still required to preserve the complete subtree.
        const stack=[...(selectedNode.children??[])];
        while(stack.length){
          const child=stack.shift();
          keep.add(String(child.id));
          stack.unshift(...(child.children??[]));
        }
      }

      const hidden=new Set();
      const stack=[...(scene.tree??[])];
      while(stack.length){
        const node=stack.shift();
        if(!keep.has(String(node.id)))hidden.add(String(node.id));
        stack.unshift(...(node.children??[]));
      }
      scene.hiddenNodeIds=[...hidden];
    }
    return selectedTop.length;
  }

  function showAll(project){
    bumpRevision("display");
    let changed=0;
    for(const scene of project?.referenceScenes??[]){
      if(scene?.visible===false)changed+=1;
      if(Array.isArray(scene?.hiddenNodeIds)&&scene.hiddenNodeIds.length)changed+=scene.hiddenNodeIds.length;
      scene.visible=true;
      scene.hiddenNodeIds=[];
    }
    return changed;
  }

  function applyBulkTransparency(project){
    bumpRevision("display");
    const entries=selectedEntries(project);
    if(!entries.length)return;
    const allTransparent=entries.every(({scene,node})=>
      transparentSet(scene).has(String(node.id))
    );
    const byScene=new Map();
    for(const {scene,node} of entries){
      const key=String(scene.id);
      const set=byScene.get(key)??transparentSet(scene);
      if(allTransparent)set.delete(String(node.id));
      else set.add(String(node.id));
      byScene.set(key,set);
    }
    for(const scene of project.referenceScenes??[]){
      const set=byScene.get(String(scene.id));
      if(set)scene.transparentNodeIds=[...set];
    }
  }

  function subtreeHasEditable(node){
    if(node?.editable_part_number)return true;
    return (node?.children??[]).some(subtreeHasEditable);
  }

  function deleteSelectedFromTree(scene,nodes){
    const removeIds=new Set(
      selectedEntries({referenceScenes:[scene]}).map(({node})=>String(node.id))
    );
    const prune=(node)=>{
      const selectedForDelete=removeIds.has(String(node.id))&&selectableNode(node);
      if(selectedForDelete&&!subtreeHasEditable(node))return null;
      const children=(node.children??[]).map(prune).filter(Boolean);
      if(selectedForDelete){
        return {
          ...node,
          geometry_instances:[],
          geometry_status:children.length?"group":"metadata_only",
          children
        };
      }
      return {...node,children};
    };
    return (nodes??[]).map(prune).filter(Boolean);
  }

  function previewDeleteFrame(project){
    const selectedNow=selectedEntries(project);
    if(!selectedNow.length){
      return Object.freeze({
        status:"no_selection",
        frame:null,
        selected_count:0
      });
    }
    const affected=new Set(selectedNow.map(({scene})=>String(scene.id)));
    const scenes=[];
    for(const source of project?.referenceScenes??[]){
      const scene=JSON.parse(JSON.stringify(source));
      if(affected.has(String(scene.id))){
        scene.tree=deleteSelectedFromTree(scene,scene.tree);
      }
      if(Array.isArray(scene.tree)&&scene.tree.length)scenes.push(scene);
    }
    const bounds=currentReferenceProjectBounds({referenceScenes:scenes});
    const frame=automaticFrameFromCurrentBounds(bounds);
    return Object.freeze({
      status:frame.status,
      frame:frame.status==="exact"?frame:null,
      bounds,
      selected_count:selectedNow.length,
      reason:frame.status==="exact"?null:frame.reason??bounds.reason??null
    });
  }

  function applyBulkDelete(project){
    const affected=new Set(
      selectedEntries(project).map(({scene})=>String(scene.id))
    );
    for(const scene of project.referenceScenes??[]){
      if(!affected.has(String(scene.id)))continue;
      scene.tree=deleteSelectedFromTree(scene,scene.tree);
    }
    const kept=[];
    for(const scene of project.referenceScenes??[]){
      if(Array.isArray(scene.tree)&&scene.tree.length>0){
        kept.push(scene);
        continue;
      }
      const runtimeId=runtimeKey(scene);
      runtimes.delete(runtimeId);
      for(const key of [...templates.keys()]){
        if(key.startsWith(runtimeId+"|"))templates.delete(key);
      }
    }
    project.referenceScenes=kept;
    bulkSelected.clear();
  }

  function selectScene(project,sceneId,checked=true){
    const scene=findScene(project,sceneId);
    if(!scene)return 0;
    toggleSceneSelection(scene,checked);
    return selectedCount(project);
  }

  function selectNode(project,sceneId,nodeId,checked=true){
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node||!selectableNode(node))return selectedCount(project);
    toggleNodeSelection(scene,node,checked);
    return selectedCount(project);
  }

  function clearSelection(){
    bumpRevision("selection");
    bulkSelected.clear();
    rangeAnchorKey=null;
    selected=null;
    return 0;
  }

  function sceneNodeFromKey(project,key){
    const text=String(key??"");
    const split=text.indexOf("|");
    if(split<0)return null;
    const sceneId=text.slice(0,split);
    const nodeId=text.slice(split+1);
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    return scene&&node?{scene,node}:null;
  }

  function visibleSelectionKeys(host){
    return [...host.querySelectorAll("[data-ref-node]")]
      .filter((row)=>!row.dataset.refEditablePart)
      .map((row)=>selectionKey(row.dataset.refScene,row.dataset.refNode));
  }

  function applyModifierSelection(
    project,
    orderedKeys,
    targetKey,
    {ctrlKey=false,metaKey=false,shiftKey=false}={}
  ){
    const additive=!!(ctrlKey||metaKey);
    const target=sceneNodeFromKey(project,targetKey);
    if(!target||!selectableNode(target.node))return selectedCount(project);
    bumpRevision("selection");

    if(shiftKey){
      const keys=Array.isArray(orderedKeys)?orderedKeys.map(String):[];
      const targetIndex=keys.indexOf(String(targetKey));
      let anchorIndex=keys.indexOf(String(rangeAnchorKey??""));
      if(targetIndex<0)return selectedCount(project);
      if(anchorIndex<0){
        anchorIndex=targetIndex;
        rangeAnchorKey=String(targetKey);
      }
      if(!additive)bulkSelected.clear();
      const from=Math.min(anchorIndex,targetIndex);
      const to=Math.max(anchorIndex,targetIndex);
      for(let index=from;index<=to;index+=1){
        const entry=sceneNodeFromKey(project,keys[index]);
        if(entry&&selectableNode(entry.node)){
          toggleNodeSelection(entry.scene,entry.node,true);
        }
      }
      return selectedCount(project);
    }

    if(additive){
      const key=selectionKey(target.scene.id,target.node.id);
      toggleNodeSelection(
        target.scene,
        target.node,
        !bulkSelected.has(key)
      );
      rangeAnchorKey=key;
      return selectedCount(project);
    }

    rangeAnchorKey=selectionKey(target.scene.id,target.node.id);
    return selectedCount(project);
  }

  function selectedKeys(project){
    pruneBulkSelection(project);
    return Object.freeze([...bulkSelected]);
  }

  function replaceSelection(project,keys=[]){
    bumpRevision("selection");
    bulkSelected.clear();
    let active=null;
    for(const key of keys??[]){
      const entry=sceneNodeFromKey(project,key);
      if(entry&&selectableNode(entry.node)){
        const normalized=selectionKey(entry.scene.id,entry.node.id);
        bulkSelected.add(normalized);
        active={sceneId:String(entry.scene.id),nodeId:String(entry.node.id)};
      }
    }
    selected=active;
    rangeAnchorKey=active?selectionKey(active.sceneId,active.nodeId):null;
    return selectedCount(project);
  }

  function selectOnlyNode(project,sceneId,nodeId){
    bumpRevision("selection");
    bulkSelected.clear();
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node||!selectableNode(node))return 0;
    bulkSelected.add(selectionKey(scene.id,node.id));
    rangeAnchorKey=selectionKey(scene.id,node.id);
    selected={sceneId:String(scene.id),nodeId:String(node.id)};
    return selectedCount(project);
  }

  function selectedTopLevelEntries(project){
    const entries=selectedEntries(project);
    const selectedSet=new Set(
      entries.map(({scene,node})=>selectionKey(scene.id,node.id))
    );
    return entries.filter(({scene,node})=>
      !ancestorsFor(scene.tree,node.id)
        .filter((ancestorId)=>String(ancestorId)!==String(node.id))
        .some((ancestorId)=>
          selectedSet.has(selectionKey(scene.id,ancestorId))
        )
    );
  }

  function moveSelection(project,deltaMm){
    bumpRevision("geometry");
    const delta={
      x:Number(deltaMm?.x)||0,
      y:Number(deltaMm?.y)||0,
      z:Number(deltaMm?.z)||0
    };
    if(!delta.x&&!delta.y&&!delta.z)return {count:0,instance_ids:[]};
    const entries=selectedTopLevelEntries(project);
    const instanceIds=[];
    for(const {scene,node} of entries){
      const instance=ensureEditableMeshInstance(project,scene,node);
      moveEditableMeshInstance(project,instance.id,delta);
      instanceIds.push(String(instance.id));
    }
    return {count:instanceIds.length,instance_ids:instanceIds};
  }

  function applyBulkAction(project,action){
    const command=String(action??"");
    if(command==="clear")return clearSelection();
    if(!["show","hide","transparent"].includes(command)){
      throw new RangeError("Immutable Source / Reference does not support bulk action: "+command);
    }
    if(!bulkSelected.size)return 0;
    bumpRevision("display");
    if(command==="show")applyBulkVisibility(project,true);
    else if(command==="hide")applyBulkVisibility(project,false);
    else if(command==="transparent")applyBulkTransparency(project);
    return selectedCount(project);
  }

  function revealNode(project,sceneId,nodeId){
    const scene=findScene(project,sceneId);
    const node=findNode(scene?.tree,nodeId);
    if(!scene||!node)return false;
    project.referenceGeometryTreeCollapsed=false;
    scene.treeCollapsed=false;
    const collapsed=new Set(
      Array.isArray(scene.collapsedNodeIds)
        ? scene.collapsedNodeIds.map(String)
        : []
    );
    for(const ancestorId of ancestorsFor(scene.tree,node.id)){
      if(String(ancestorId)!==String(node.id))collapsed.delete(String(ancestorId));
    }
    scene.collapsedNodeIds=[...collapsed];
    selected={sceneId:String(scene.id),nodeId:String(node.id)};
    return true;
  }

  function notifyExternalSelection(source="tree"){
    queueMicrotask(()=>{
      try{
        window.TubeBenderObjectContext?.adoptReferenceSelection?.({source});
      }catch(error){
        console.warn("Reference selection synchronization:",error);
      }
    });
  }

  function importedEditableTubeById(project,id){
    return (project?.tubes??[]).find((tube)=>
      String(tube?.id??"")===String(id??"")&&
      (tube?.currentProjectImport?.source_format==="DWFx"||!!sourceLink(tube))
    )??null;
  }

  function mutateSourceLinkDisplay(tube,display){
    const link=sourceLink(tube);
    if(!link||link.detached===true)throw new Error("Editable object is not linked to Source");
    if(!["hidden","shown","compare"].includes(display))throw new RangeError("Unknown Source display mode");
    link.display=display;
    link.status="linked";
    return true;
  }

  function breakSourceLink(tube){
    const link=sourceLink(tube);
    if(!link||link.detached===true)return false;
    link.detached=true;
    link.status="detached";
    link.display="hidden";
    return true;
  }

  function runSourceLinkCommand(label,mutate,{modelCommand,save,renderAll,refreshProjectTree,reloadActiveTube}={}){
    const ok=typeof modelCommand==="function"?modelCommand(label,mutate):mutate();
    if(ok===false)return false;
    save?.();
    reloadActiveTube?.();
    renderAll?.();
    refreshProjectTree?.();
    return true;
  }

  function ensureSourceLinkMenu(){
    let menu=document.getElementById("tbSourceLinkMenu");
    if(menu)return menu;
    menu=document.createElement("div");
    menu.id="tbSourceLinkMenu";
    menu.style.cssText="position:fixed;display:none;z-index:120700;min-width:230px;padding:5px;border:1px solid #42566d;border-radius:7px;background:#111c28;color:#eef5ff;box-shadow:0 10px 30px rgba(0,0,0,.45);font:12px system-ui";
    document.body.appendChild(menu);
    document.addEventListener("pointerdown",(event)=>{
      if(menu.style.display!=="none"&&!menu.contains(event.target))menu.style.display="none";
    },true);
    return menu;
  }

  function showSourceLinkMenu(event,project,tube,callbacks={}){
    const link=sourceLink(tube);
    if(!link)return false;
    const menu=ensureSourceLinkMenu();
    const linked=link.detached!==true&&!!sourceNodeForTube(project,tube);
    const button=(action,label,disabled=false)=>
      '<button data-source-link-action="'+action+'" '+(disabled?'disabled ':'')+
      'style="display:block;width:100%;text-align:left;padding:6px 8px;border:0;border-radius:4px;background:transparent;color:'+
      (disabled?'#65778b':'#eef5ff')+';cursor:'+(disabled?'default':'pointer')+'">'+label+'</button>';
    menu.innerHTML=
      '<div style="padding:5px 8px;color:#8fa4ba;border-bottom:1px solid #2b3a4b;margin-bottom:4px">'+
      escHtml(tube.name??tube.partNumber??tube.id)+'</div>'+
      button("show","Показать исходник",!linked)+
      button("hide","Скрыть исходник",!linked)+
      button("compare","Сравнить с исходником",!linked)+
      button("restore","Восстановить из исходника",!linked||!tube?.currentProjectImport?.source_geometry_snapshot)+
      button("break","Разорвать связь с исходником",!linked);
    menu.style.left=Math.min(window.innerWidth-245,Math.max(6,event.clientX))+"px";
    menu.style.top=Math.min(window.innerHeight-190,Math.max(6,event.clientY))+"px";
    menu.style.display="block";
    menu.querySelectorAll("[data-source-link-action]").forEach((item)=>{
      item.addEventListener("click",(click)=>{
        click.stopPropagation();
        if(item.disabled)return;
        const action=item.dataset.sourceLinkAction;
        menu.style.display="none";
        if(action==="show"){
          runSourceLinkCommand("Показать исходник",()=>mutateSourceLinkDisplay(tube,"shown"),callbacks);
        }else if(action==="hide"){
          runSourceLinkCommand("Скрыть исходник",()=>mutateSourceLinkDisplay(tube,"hidden"),callbacks);
        }else if(action==="compare"){
          runSourceLinkCommand("Сравнить с исходником",()=>mutateSourceLinkDisplay(tube,"compare"),callbacks);
        }else if(action==="restore"){
          runSourceLinkCommand("Восстановить из исходника",()=>restoreLinkedTubeGeometry(tube),callbacks);
        }else if(action==="break"){
          runSourceLinkCommand("Разорвать связь с исходником",()=>breakSourceLink(tube),callbacks);
        }
      });
    });
    event.preventDefault();event.stopPropagation();
    return true;
  }

  function bindTree(host,project,{switchTube,save,renderAll,refreshProjectTree,modelCommand,reloadActiveTube}={}){
    if(!host||!project)return;

    host.querySelector("[data-ref-root-toggle]")?.addEventListener("click",(event)=>{
      event.stopPropagation();
      project.referenceGeometryTreeCollapsed=project.referenceGeometryTreeCollapsed!==true;
      save?.();
      refreshProjectTree?.();
    });

    host.querySelector("[data-ref-source-toggle]")?.addEventListener("click",(event)=>{
      event.stopPropagation();
      project.referenceSourceTreeCollapsed=project.referenceSourceTreeCollapsed!==true;
      save?.();refreshProjectTree?.();
    });
    host.querySelector("[data-ref-editable-toggle]")?.addEventListener("click",(event)=>{
      event.stopPropagation();
      project.referenceEditableTreeCollapsed=project.referenceEditableTreeCollapsed!==true;
      save?.();refreshProjectTree?.();
    });

    const rootSelect=host.querySelector("[data-ref-root-select]");
    if(rootSelect){
      rootSelect.indeterminate=rootSelect.dataset.refIndeterminate==="1";
      rootSelect.addEventListener("change",(event)=>{
        event.stopPropagation();
        for(const scene of project.referenceScenes??[])toggleSceneSelection(scene,rootSelect.checked);
        const firstScene=(project.referenceScenes??[])[0]??null;
        const firstNode=firstScene?collectSelectableNodes(firstScene.tree??[])[0]??null:null;
        rangeAnchorKey=firstScene&&firstNode?selectionKey(firstScene.id,firstNode.id):null;
        selected=firstScene&&firstNode
          ? {sceneId:String(firstScene.id),nodeId:String(firstNode.id)}
          : null;
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    }

    host.querySelectorAll("[data-ref-scene-toggle]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const scene=findScene(project,button.dataset.refSceneToggle);
        if(!scene)return;
        scene.treeCollapsed=scene.treeCollapsed!==true;
        save?.();
        refreshProjectTree?.();
      });
    });

    host.querySelectorAll("[data-ref-scene-select]").forEach((input)=>{
      input.indeterminate=input.dataset.refIndeterminate==="1";
      input.addEventListener("change",(event)=>{
        event.stopPropagation();
        const scene=findScene(project,input.dataset.refSceneSelect);
        if(!scene)return;
        toggleSceneSelection(scene,input.checked);
        const first=collectSelectableNodes(scene.tree??[])[0]??null;
        rangeAnchorKey=first?selectionKey(scene.id,first.id):null;
        selected=first?{sceneId:String(scene.id),nodeId:String(first.id)}:null;
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    });

    host.querySelectorAll("[data-ref-select]").forEach((input)=>{
      input.addEventListener("change",(event)=>{
        event.stopPropagation();
        const row=input.closest("[data-ref-scene]");
        const scene=findScene(project,row?.dataset.refScene);
        const node=findNode(scene?.tree,input.dataset.refSelect);
        if(!scene||!node)return;
        toggleNodeSelection(scene,node,input.checked);
        rangeAnchorKey=selectionKey(scene.id,node.id);
        selected=input.checked
          ? {sceneId:String(scene.id),nodeId:String(node.id)}
          : selected;
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    });

    host.querySelectorAll("[data-ref-bulk-action]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const action=button.dataset.refBulkAction;
        if(action==="clear"){
          clearSelection();
          refreshProjectTree?.();
          return;
        }
        if(!bulkSelected.size)return;
        const mutate=()=>applyBulkAction(project,action);
        mutate();
        save?.();
        renderAll?.();
        refreshProjectTree?.();
      });
    });

    host.querySelectorAll("[data-ref-scene-eye]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const scene=findScene(project,button.dataset.refSceneEye);
        if(!scene)return;
        scene.visible=scene.visible===false;
        bumpRevision("display");
        save?.();
        renderAll?.();
      });
    });

    host.querySelectorAll("[data-ref-toggle]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const row=button.closest("[data-ref-scene]");
        const scene=findScene(project,row?.dataset.refScene);
        if(!scene)return;
        const id=String(button.dataset.refToggle);
        const set=new Set(Array.isArray(scene.collapsedNodeIds)?scene.collapsedNodeIds.map(String):[]);
        if(set.has(id))set.delete(id);else set.add(id);
        scene.collapsedNodeIds=[...set];
        save?.();
        refreshProjectTree?.();
      });
    });

    host.querySelectorAll("[data-ref-eye]").forEach((button)=>{
      button.addEventListener("click",(event)=>{
        event.stopPropagation();
        const row=button.closest("[data-ref-scene]");
        const scene=findScene(project,row?.dataset.refScene);
        if(!scene)return;
        const id=String(button.dataset.refEye);
        const set=new Set(Array.isArray(scene.hiddenNodeIds)?scene.hiddenNodeIds.map(String):[]);
        if(set.has(id))set.delete(id);else set.add(id);
        scene.hiddenNodeIds=[...set];
        bumpRevision("display");
        save?.();
        renderAll?.();
      });
    });

    host.querySelectorAll("[data-import-editable-tube]").forEach((row)=>{
      const tube=importedEditableTubeById(project,row.dataset.importEditableTube);
      if(!tube)return;
      row.addEventListener("click",(event)=>{
        if(event.button!==0)return;
        if(typeof switchTube==="function")switchTube(tube.id);
      });
      row.addEventListener("contextmenu",(event)=>{
        showSourceLinkMenu(event,project,tube,{
          modelCommand,save,renderAll,refreshProjectTree,reloadActiveTube
        });
      });
    });

    host.querySelectorAll("[data-ref-node]").forEach((row)=>{
      row.addEventListener("click",(event)=>{
        if(event.target.closest("button,input"))return;
        const scene=findScene(project,row.dataset.refScene);
        const node=findNode(scene?.tree,row.dataset.refNode);
        if(!scene||!node)return;

        const key=selectionKey(scene.id,node.id);
        if(!node.editable_part_number&&(event.ctrlKey||event.metaKey||event.shiftKey)){
          event.preventDefault();
          applyModifierSelection(
            project,
            visibleSelectionKeys(host),
            key,
            {
              ctrlKey:event.ctrlKey,
              metaKey:event.metaKey,
              shiftKey:event.shiftKey
            }
          );
          selected={sceneId:String(scene.id),nodeId:String(node.id)};
          refreshProjectTree?.();
          notifyExternalSelection("tree");
          return;
        }

        const part=String(node.editable_part_number??"");
        if(part&&typeof switchTube==="function"){
          const tube=(project.tubes??[]).find((item)=>
            [
              item?.partNumber,
              item?.part_number,
              item?.importEvidence?.part_number,
              item?.currentProjectImport?.part_number
            ].filter(Boolean).map(String).includes(part)
          );
          if(tube){
            switchTube(tube.id);
            return;
          }
        }

        selected={sceneId:String(scene.id),nodeId:String(node.id)};
        if(!node.editable_part_number){
          bulkSelected.clear();
          bulkSelected.add(key);
          rangeAnchorKey=key;
        }
        refreshProjectTree?.();
        notifyExternalSelection("tree");
      });
    });
  }

  function restorePersistedRuntimes(project){
    // A restored project may replace links and source scenes wholesale.
    // Revision bump is intentionally explicit even if no runtime is embedded.
    markSceneChanged(project,"geometry");
    let count=0;
    for(const scene of project?.referenceScenes??[]){
      if(scene?.display_runtime&&registerRuntime(scene.display_runtime))count+=1;
    }
    return count;
  }

  function runtimeSummary(){
    return [...runtimes.values()].map((runtime)=>({
      scene_id:runtime.scene_id,
      asset_count:runtime.assetsById.size
    }));
  }

  window.TubeBenderReferenceSceneUi=Object.freeze({
    registerRuntime,
    render3D,
    render3DCooperative,
    treeItems,
    bindTree,
    selectScene,
    selectNode,
    selectOnlyNode,
    selectedKeys,
    replaceSelection,
    revealNode,
    moveSelection,
    editableMeshInstances:(project)=>editableMeshInstanceList(project,{create:false}),
    meshInstanceById,
    createEditableMeshInstance,
    createEditableMeshInstanceByRef,
    ensureEditableMeshInstance,
    ensureEditableMeshInstanceByRef,
    moveEditableMeshInstance,
    rotateEditableMeshInstance,
    rotateEditableMeshInstanceAxis,
    copyEditableMeshInstance,
    arrayEditableMeshInstance,
    breakEditableMeshInstanceLink,
    clearSelection,
    isolateSelection,
    showAll,
    currentReferenceProjectBounds,
    previewDeleteFrame,
    applyBulkAction,
    applyModifierSelection,
    selectedCount,
    restorePersistedRuntimes,
    runtimeSummary,
    performanceStats:()=>({...meshPerformance,largeMeshes:meshPerformance.largeMeshes.map(x=>({...x}))}),
    sceneReuseStats:()=>({...sceneReuseStats}),
    revisionSnapshot,
    markSceneChanged,
    invalidateSceneCache,
    beforeParentDispose
  });
})();
