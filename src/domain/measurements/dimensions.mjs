function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function clone(value){return value===undefined?undefined:structuredClone(value);}
function requiredString(value,name){
  if(typeof value!=="string"||value.trim()==="")throw new TypeError(`${name} must be a non-empty string`);
  return value.trim();
}
function id(prefix="dim"){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?`${prefix}-${uuid}`:`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}
function finiteOrNull(value,name){
  if(value===null||value===undefined||value==="")return null;
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite or null`);
  return n;
}
function normalizeReference(ref,index){
  if(!ref||typeof ref!=="object")throw new TypeError(`reference ${index} must be an object`);
  return freeze({
    object_id:requiredString(ref.object_id,`reference ${index} object_id`),
    subentity_id:ref.subentity_id==null?null:String(ref.subentity_id),
    snap_type:ref.snap_type==null?null:String(ref.snap_type),
    role:ref.role==null?null:String(ref.role)
  });
}
export const DEFAULT_DIMENSION_FORMAT=freeze({
  length_unit:"mm",
  length_decimals:1,
  angle_unit:"deg",
  angle_decimals:2,
  trailing_zeros:true
});
export function createDimension(input={}, {dimensionId=null}={}){
  const kind=requiredString(input.kind,"dimension kind");
  const mode=input.mode??"Reference";
  if(!["Reference","Driving"].includes(mode))throw new RangeError("dimension mode must be Reference or Driving");
  const refs=(input.references??[]).map(normalizeReference);
  if(!refs.length)throw new RangeError("dimension requires at least one associative reference");
  return freeze({
    id:requiredString(dimensionId??input.id??id(),"dimension id"),
    kind,
    mode,
    references:refs,
    local_plane:clone(input.local_plane??null),
    text_position:clone(input.text_position??null),
    leader:clone(input.leader??null),
    format:freeze({...DEFAULT_DIMENSION_FORMAT,...clone(input.format??{})}),
    value:finiteOrNull(input.value,"dimension value"),
    target_value:finiteOrNull(input.target_value,"dimension target_value"),
    status:input.status??"NeedsUpdate",
    visible:input.visible!==false,
    note:input.note==null?null:String(input.note)
  });
}
export function updateDimensionStyle(dimension,patch={}){
  return freeze({
    ...clone(dimension),
    local_plane:patch.local_plane===undefined?clone(dimension.local_plane):clone(patch.local_plane),
    text_position:patch.text_position===undefined?clone(dimension.text_position):clone(patch.text_position),
    leader:patch.leader===undefined?clone(dimension.leader):clone(patch.leader),
    format:freeze({...clone(dimension.format),...clone(patch.format??{})}),
    visible:patch.visible===undefined?dimension.visible:patch.visible!==false
  });
}
export function setDimensionMode(dimension,mode){
  if(!["Reference","Driving"].includes(mode))throw new RangeError("dimension mode must be Reference or Driving");
  return freeze({
    ...clone(dimension),
    mode,
    target_value:mode==="Driving"?(dimension.target_value??dimension.value):null
  });
}
export function setDrivingTarget(dimension,value){
  if(dimension.mode!=="Driving")throw new Error("only Driving dimensions can receive a target value");
  const target=finiteOrNull(value,"driving target");
  if(target===null)throw new TypeError("driving target is required");
  return freeze({...clone(dimension),target_value:target,status:"NeedsSolve"});
}
export function recalculateDimension(dimension,{resolveReference,measure}={}){
  if(typeof resolveReference!=="function")throw new TypeError("resolveReference callback is required");
  if(typeof measure!=="function")throw new TypeError("measure callback is required");
  const resolved=[];
  const missing=[];
  dimension.references.forEach((ref,index)=>{
    const value=resolveReference(ref);
    if(value===null||value===undefined)missing.push(index);
    resolved.push(value);
  });
  if(missing.length){
    return freeze({
      ...clone(dimension),
      value:null,
      status:"LostReference",
      lost_reference_indexes:missing
    });
  }
  let result;
  try{result=measure(dimension.kind,resolved,dimension);}
  catch(error){
    return freeze({
      ...clone(dimension),
      value:null,
      status:"Error",
      calculation_error:String(error?.message??error)
    });
  }
  const value=typeof result==="number"?result:Number(result?.value??result?.length_mm??result?.angle_deg);
  if(!Number.isFinite(value)){
    return freeze({
      ...clone(dimension),
      value:null,
      status:"Error",
      calculation_error:"measurement did not return a finite value"
    });
  }
  return freeze({
    ...clone(dimension),
    value,
    status:dimension.mode==="Driving"&&dimension.target_value!=null&&Math.abs(value-dimension.target_value)>1e-9?"NeedsSolve":"Valid",
    lost_reference_indexes:[]
  });
}
export function drivingSolvePlan(dimension,{resolveReference,planSolve}={}){
  if(dimension.mode!=="Driving")throw new Error("dimension is not Driving");
  if(dimension.target_value===null||dimension.target_value===undefined)throw new Error("Driving dimension has no target value");
  if(typeof resolveReference!=="function")throw new TypeError("resolveReference callback is required");
  if(typeof planSolve!=="function")throw new TypeError("planSolve callback is required");
  const refs=dimension.references.map((ref,index)=>{
    const resolved=resolveReference(ref);
    if(resolved===null||resolved===undefined)throw new Error(`Driving dimension lost reference ${index}`);
    return resolved;
  });
  const plan=planSolve({
    kind:dimension.kind,
    references:refs,
    current_value:dimension.value,
    target_value:dimension.target_value,
    dimension
  });
  if(!plan||typeof plan!=="object")throw new Error("Driving solver did not return a plan");
  if(plan.ok===false){
    return freeze({
      ok:false,
      status:"Conflict",
      conflicts:freeze(clone(plan.conflicts??[])),
      changes:freeze([])
    });
  }
  return freeze({
    ok:true,
    status:"Ready",
    conflicts:freeze([]),
    changes:freeze(clone(plan.changes??[])),
    scope:plan.scope??"local"
  });
}
export function formatDimensionValue(dimension){
  if(dimension.value===null||dimension.value===undefined)return "—";
  const isAngle=/angle/i.test(dimension.kind);
  const decimals=Math.max(0,Math.min(12,Math.trunc(Number(isAngle?dimension.format.angle_decimals:dimension.format.length_decimals)||0)));
  let text=Number(dimension.value).toFixed(decimals);
  if(dimension.format.trailing_zeros===false&&text.includes("."))text=text.replace(/\.?0+$/,"");
  if(isAngle)return text+"°";
  const unit=dimension.format.length_unit??"mm";
  return text+" "+unit;
}
export function removeDimensionRepresentation(dimension,representationId){
  const reps=Array.isArray(dimension.representations)?dimension.representations:[];
  return freeze({...clone(dimension),representations:reps.filter((x)=>x.id!==representationId)});
}
export function upsertDimensionRepresentation(dimension,representation){
  if(!representation||typeof representation!=="object")throw new TypeError("representation must be an object");
  const rid=requiredString(representation.id,"representation id");
  const reps=Array.isArray(dimension.representations)?clone(dimension.representations):[];
  const index=reps.findIndex((x)=>x.id===rid);
  const next=freeze({
    id:rid,
    surface:requiredString(representation.surface??"3D","representation surface"),
    view_id:representation.view_id==null?null:String(representation.view_id),
    text_position:clone(representation.text_position??null),
    line_position:clone(representation.line_position??null),
    leader_direction:clone(representation.leader_direction??null),
    text_orientation:clone(representation.text_orientation??null),
    display_scale:finiteOrNull(representation.display_scale,"display_scale"),
    visible:representation.visible!==false
  });
  if(index>=0)reps[index]=next;else reps.push(next);
  return freeze({...clone(dimension),representations:reps});
}
