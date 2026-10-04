const IDENTITY_ROTATION=Object.freeze({x:0,y:0,z:0});
function clone(v){return v==null?v:structuredClone(v);}
function finite(value,name){const n=Number(value);if(!Number.isFinite(n))throw new TypeError(name+" must be finite");return n;}
function point(value={},name="point"){return Object.freeze({x:finite(value.x??0,name+".x"),y:finite(value.y??0,name+".y"),z:finite(value.z??0,name+".z")});}
function id(prefix="mesh-instance"){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);
}
export function editableMeshInstances(project,{create=true}={}){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.editable_mesh_instances)){
    if(!create)return [];
    project.editable_mesh_instances=[];
  }
  return project.editable_mesh_instances;
}
export function normalizeMeshInstance(input={}){
  const source=input.source??{};
  const sceneId=String(source.scene_id??input.scene_id??"").trim();
  const nodeId=String(source.node_id??input.node_id??"").trim();
  if(!sceneId||!nodeId)throw new Error("Mesh instance requires source scene_id and node_id");
  const linked=input.link_status!=="detached";
  return Object.freeze({
    id:String(input.id??id()),
    name:String(input.name??source.label??"Editable mesh instance"),
    kind:"EditableMeshInstance",
    source:Object.freeze({
      scene_id:sceneId,node_id:nodeId,
      source_file:String(source.source_file??""),
      label:String(source.label??nodeId)
    }),
    transform:Object.freeze({
      position_mm:point(input.transform?.position_mm??input.position_mm??{}, "position_mm"),
      rotation_deg:point(input.transform?.rotation_deg??input.rotation_deg??IDENTITY_ROTATION, "rotation_deg")
    }),
    link_status:linked?"linked":"detached",
    source_visible:input.source_visible===true,
    compare_source:input.compare_source===true,
    visible:input.visible!==false,
    detached_payload:input.detached_payload?clone(input.detached_payload):null,
    array_member:input.array_member?clone(input.array_member):null
  });
}
export function createMeshInstance(project,source,options={}){
  const instance=normalizeMeshInstance({...options,source});
  editableMeshInstances(project).push(clone(instance));
  return instance;
}
export function findMeshInstance(project,instanceId){
  return editableMeshInstances(project,{create:false}).find((x)=>String(x?.id)===String(instanceId))??null;
}
export function moveMeshInstance(project,instanceId,deltaMm){
  const instance=findMeshInstance(project,instanceId);if(!instance)throw new Error("Editable mesh instance not found");
  const d=point(deltaMm,"delta_mm"),p=point(instance.transform?.position_mm??{},"position_mm");
  instance.transform={...instance.transform,position_mm:{x:p.x+d.x,y:p.y+d.y,z:p.z+d.z}};
  return instance;
}
export function rotateMeshInstance(project,instanceId,deltaDeg){
  const instance=findMeshInstance(project,instanceId);if(!instance)throw new Error("Editable mesh instance not found");
  const d=point(deltaDeg,"rotation_delta_deg"),r=point(instance.transform?.rotation_deg??{},"rotation_deg");
  instance.transform={...instance.transform,rotation_deg:{x:r.x+d.x,y:r.y+d.y,z:r.z+d.z}};
  return instance;
}
export function copyMeshInstance(project,instanceId,{offset_mm={x:0,y:0,z:0},name=null}={}){
  const source=findMeshInstance(project,instanceId);if(!source)throw new Error("Editable mesh instance not found");
  const offset=point(offset_mm,"offset_mm"),p=point(source.transform?.position_mm??{},"position_mm");
  const copy=normalizeMeshInstance({
    ...clone(source),id:id(),name:name??(String(source.name)+" copy"),
    transform:{...clone(source.transform),position_mm:{x:p.x+offset.x,y:p.y+offset.y,z:p.z+offset.z}},
    array_member:null
  });
  editableMeshInstances(project).push(clone(copy));return copy;
}
export function linearArrayMeshInstances(project,instanceId,{count,step_mm}={}){
  const n=Math.trunc(finite(count,"count"));if(n<2)throw new RangeError("count must be >= 2");
  const step=point(step_mm,"step_mm"),source=findMeshInstance(project,instanceId);
  if(!source)throw new Error("Editable mesh instance not found");
  const created=[];
  for(let index=1;index<n;index++){
    const copy=copyMeshInstance(project,instanceId,{
      offset_mm:{x:step.x*index,y:step.y*index,z:step.z*index},
      name:String(source.name)+" ["+(index+1)+"]"
    });
    const live=findMeshInstance(project,copy.id);
    live.array_member={source_instance_id:String(instanceId),member_index:index,derived:false};
    created.push(live);
  }
  return created;
}
export function breakMeshInstanceLink(project,instanceId,{snapshotSource}={}){
  const instance=findMeshInstance(project,instanceId);if(!instance)throw new Error("Editable mesh instance not found");
  if(instance.link_status==="detached")return instance;
  if(typeof snapshotSource!=="function")throw new TypeError("snapshotSource callback is required");
  const payload=snapshotSource(clone(instance.source));
  if(!payload)throw new Error("Source mesh snapshot is unavailable");
  instance.detached_payload=clone(payload);
  instance.link_status="detached";
  instance.compare_source=false;
  instance.source_visible=false;
  return instance;
}
export function removeMeshInstance(project,instanceId){
  const list=editableMeshInstances(project,{create:false}),i=list.findIndex((x)=>String(x?.id)===String(instanceId));
  if(i<0)return false;list.splice(i,1);return true;
}
export function sourceKey(instance){return String(instance?.source?.scene_id??"")+"|"+String(instance?.source?.node_id??"");}
