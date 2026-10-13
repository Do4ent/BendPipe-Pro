const clone=v=>v==null?v:structuredClone(v);
const DIRECT_KEYS=new Set(["ownerObjectId","externalRefId","external_ref_id","sourceGeometryId","editableGeometryId","source_geometry_id","editable_geometry_id"]);
function refValue(value){return typeof value==="string"&&value.trim()?value.trim():null;}
function walk(value,path,out){
  if(!value||typeof value!=="object")return;
  if(Array.isArray(value)){value.forEach((item,index)=>walk(item,path.concat(index),out));return;}
  for(const [key,child] of Object.entries(value)){
    const next=path.concat(key);
    if(DIRECT_KEYS.has(key)){
      const target=refValue(child);if(target)out.push({path:next,target_id:target,key});
    }else if(key==="object_id"&&path.some(part=>String(part)==="references")){
      const target=refValue(child);if(target)out.push({path:next,target_id:target,key});
    }
    if(child&&typeof child==="object")walk(child,next,out);
  }
}
export function collectCopyDependencies(objects=[]){
  const out=[];
  for(const object of objects??[]){
    const source_id=String(object?.id??"");if(!source_id)continue;
    const refs=[];walk(object,[],refs);
    for(const ref of refs)out.push(Object.freeze({source_id,...ref,path:Object.freeze([...ref.path])}));
  }
  return Object.freeze(out);
}
export function buildCopyDependencyPlan(objects=[]){
  const ids=new Set((objects??[]).map(object=>String(object?.id??"")).filter(Boolean));
  const dependencies=collectCopyDependencies(objects).map(dep=>Object.freeze({
    ...dep,
    scope:ids.has(dep.target_id)?"internal":"external"
  }));
  const internal=dependencies.filter(dep=>dep.scope==="internal");
  const external=dependencies.filter(dep=>dep.scope==="external");
  return Object.freeze({
    source_ids:Object.freeze([...ids]),
    dependencies:Object.freeze(dependencies),
    internal:Object.freeze(internal),
    external:Object.freeze(external),
    requires_external_choice:external.length>0
  });
}
function getAt(root,path){
  let value=root;for(let i=0;i<path.length-1;i++){value=value?.[path[i]];if(value==null)return null;}
  return {owner:value,key:path[path.length-1]};
}
function detachValue(current){return typeof current==="string"?"":null;}
export function applyCopyDependencyPolicy(copy,idMapInput,plan,{
  external_policy=null
}={}){
  if(!copy||typeof copy!=="object")throw new TypeError("copy is required");
  const idMap=idMapInput instanceof Map?idMapInput:new Map(Object.entries(idMapInput??{}).map(([a,b])=>[String(a),String(b)]));
  if(plan?.requires_external_choice&&!["Keep","Detach"].includes(String(external_policy??""))){
    const error=new Error("Внешние зависимости требуют явного выбора Keep или Detach");
    error.code="EXTERNAL_DEPENDENCY_CHOICE_REQUIRED";
    error.external_dependencies=plan.external;
    throw error;
  }
  const sourceId=String(copy.__copy_source_id??copy.id??"");
  for(const dep of plan?.dependencies??[]){
    if(String(dep.source_id)!==sourceId)continue;
    const slot=getAt(copy,dep.path);if(!slot?.owner)continue;
    if(dep.scope==="internal"){
      const mapped=idMap.get(String(dep.target_id));
      if(!mapped)throw new Error("Internal copy dependency target was not copied: "+dep.target_id);
      slot.owner[slot.key]=mapped;
    }else if(external_policy==="Detach"){
      slot.owner[slot.key]=detachValue(slot.owner[slot.key]);
    }else if(external_policy==="Keep"){
      slot.owner[slot.key]=dep.target_id;
    }
  }
  delete copy.__copy_source_id;
  return copy;
}
export function applyCopyDependencyBatch(copies,idMap,plan,options={}){
  return (copies??[]).map(copy=>applyCopyDependencyPolicy(copy,idMap,plan,options));
}
