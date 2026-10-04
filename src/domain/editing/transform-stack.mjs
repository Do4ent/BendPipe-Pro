import {
  assertRigidTransformMatrix,
  createTransformOperation,
  mirrorMatrix,
  reorderTransformStack,
  rotationMatrix,
  toggleTransformOperation,
  translationMatrix
} from "./transform-commands.mjs";
import {
  mirrorLegacyTubeRigid,
  rotateLegacyTubeRigid,
  translateLegacyTubeRigid
} from "./legacy-rigid-transform.mjs";

function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function clone(value){return value==null?value:structuredClone(value);}
function finite(value,name){
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return n;
}
function point(value,name){
  if(!value||typeof value!=="object")throw new TypeError(`${name} must be a point/vector`);
  const result={x:finite(value.x,`${name}.x`),y:finite(value.y,`${name}.y`),z:finite(value.z,`${name}.z`)};
  return result;
}
function nonZero(value,name){
  const p=point(value,name);
  if(Math.hypot(p.x,p.y,p.z)<=1e-12)throw new RangeError(`${name} must be non-zero`);
  return p;
}
function makeId(prefix){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?`${prefix}-${uuid}`:`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}
function stripRuntimeFields(tube){
  const base=clone(tube);
  delete base.transform_stack;
  delete base.transform_stack_base;
  delete base.transform_stack_state;
  delete base.transform_stack_fingerprint;
  return base;
}
function normalizeOperation(op){
  if(!op||typeof op!=="object")throw new TypeError("transform operation is required");
  if(!["Move","Rotate","Mirror"].includes(op.kind))throw new RangeError(`unsupported transform stack operation: ${op.kind}`);
  assertRigidTransformMatrix(op.matrix);
  return createTransformOperation({
    id:op.id??makeId("transform"),
    kind:op.kind,
    matrix:op.matrix,
    enabled:op.enabled!==false,
    associative:true,
    metadata:clone(op.metadata??{})
  });
}

export function createMoveOperation(delta,{id=null,enabled=true}={}){
  const d=point(delta,"delta");
  return createTransformOperation({
    id:id??makeId("move"),
    kind:"Move",
    matrix:translationMatrix(d),
    enabled,
    associative:true,
    metadata:{delta:d}
  });
}
export function createRotateOperation({axis,center={x:0,y:0,z:0},angle_deg,id=null,enabled=true}={}){
  const a=nonZero(axis,"axis"),c=point(center,"center"),angle=finite(angle_deg,"angle_deg");
  return createTransformOperation({
    id:id??makeId("rotate"),
    kind:"Rotate",
    matrix:rotationMatrix({axis:a,center:c,angle_deg:angle}),
    enabled,
    associative:true,
    metadata:{axis:a,center:c,angle_deg:angle}
  });
}
export function createMirrorOperation({plane_point={x:0,y:0,z:0},plane_normal,id=null,enabled=true}={}){
  const p=point(plane_point,"plane_point"),n=nonZero(plane_normal,"plane_normal");
  return createTransformOperation({
    id:id??makeId("mirror"),
    kind:"Mirror",
    matrix:mirrorMatrix({plane_point:p,plane_normal:n}),
    enabled,
    associative:true,
    metadata:{plane_point:p,plane_normal:n}
  });
}

export function createTubeTransformStack(tube,{id=null,operations=[]}={}){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  if(!Array.isArray(tube.rows)||!tube.rows.length)throw new RangeError("tube rows are required");
  if(!Array.isArray(operations))throw new TypeError("operations must be an array");
  return freeze({
    id:String(id??makeId("transform-stack")),
    object_id:String(tube.id??""),
    base_tube:stripRuntimeFields(tube),
    operations:operations.map(normalizeOperation),
    associative:true,
    state:"Valid"
  });
}
export function appendTransformOperation(stack,operation){
  if(!stack||!Array.isArray(stack.operations))throw new TypeError("transform stack is invalid");
  return freeze({...clone(stack),operations:[...stack.operations,normalizeOperation(operation)],state:"NeedsRebuild"});
}
export function removeTransformOperation(stack,operationId){
  const id=String(operationId);
  if(!stack.operations.some((op)=>op.id===id))throw new RangeError(`transform operation not found: ${id}`);
  return freeze({...clone(stack),operations:stack.operations.filter((op)=>op.id!==id),state:"NeedsRebuild"});
}
export function reorderTubeTransformOperation(stack,fromIndex,toIndex){
  return freeze({...clone(stack),operations:reorderTransformStack(stack.operations,fromIndex,toIndex),state:"NeedsRebuild"});
}
export function setTransformOperationEnabled(stack,operationId,enabled){
  const id=String(operationId);
  if(!stack.operations.some((op)=>op.id===id))throw new RangeError(`transform operation not found: ${id}`);
  return freeze({...clone(stack),operations:toggleTransformOperation(stack.operations,id,enabled),state:"NeedsRebuild"});
}
export function replaceTransformOperation(stack,operationId,replacement){
  const id=String(operationId);
  let found=false;
  const next=stack.operations.map((op)=>{
    if(op.id!==id)return op;
    found=true;
    const normalized=normalizeOperation({...replacement,id});
    return normalized;
  });
  if(!found)throw new RangeError(`transform operation not found: ${id}`);
  return freeze({...clone(stack),operations:next,state:"NeedsRebuild"});
}

function applyOperation(tube,op){
  if(op.enabled===false)return {status:"exact",tube:clone(tube),skipped:true};
  if(op.kind==="Move"){
    return translateLegacyTubeRigid(tube,point(op.metadata?.delta,"Move delta"));
  }
  if(op.kind==="Rotate"){
    return rotateLegacyTubeRigid(tube,{
      axis:nonZero(op.metadata?.axis,"Rotate axis"),
      center:point(op.metadata?.center??{x:0,y:0,z:0},"Rotate center"),
      angle_deg:finite(op.metadata?.angle_deg,"Rotate angle")
    });
  }
  if(op.kind==="Mirror"){
    return mirrorLegacyTubeRigid(tube,{
      plane_point:point(op.metadata?.plane_point??{x:0,y:0,z:0},"Mirror plane point"),
      plane_normal:nonZero(op.metadata?.plane_normal,"Mirror plane normal")
    });
  }
  throw new RangeError(`unsupported transform operation: ${op.kind}`);
}

export function applyTubeTransformStack(stack){
  if(!stack||!Array.isArray(stack.operations)||!stack.base_tube)throw new TypeError("transform stack is invalid");
  let current=clone(stack.base_tube);
  const applied=[];
  let reflections=0;
  for(const op of stack.operations){
    if(op.enabled===false){
      applied.push(freeze({id:op.id,kind:op.kind,enabled:false,status:"Skipped"}));
      continue;
    }
    const result=applyOperation(current,op);
    if(result?.status!=="exact"||!result.tube){
      return freeze({
        status:"blocked",
        tube:null,
        failed_operation_id:op.id,
        failed_operation_kind:op.kind,
        reason:result?.reason??"Transform operation failed",
        applied
      });
    }
    current=clone(result.tube);
    if(op.kind==="Mirror")reflections+=1;
    applied.push(freeze({id:op.id,kind:op.kind,enabled:true,status:"Applied"}));
  }
  current.transform_stack_state="Evaluated";
  current.transform_stack_fingerprint=transformStackFingerprint(stack);
  current.transform_stack={
    id:stack.id,
    operation_count:stack.operations.length,
    enabled_operation_count:stack.operations.filter((op)=>op.enabled!==false).length,
    reflection_count:reflections,
    associative:true
  };
  return freeze({
    status:"exact",
    tube:current,
    applied,
    reflection_count:reflections,
    right_handed_output:true,
    nominal_scalars_preserved:true
  });
}

export function bakeTubeTransformStack(stack){
  const evaluated=applyTubeTransformStack(stack);
  if(evaluated.status!=="exact")return evaluated;
  const tube=stripRuntimeFields(evaluated.tube);
  tube.transform_stack_baked=true;
  tube.transform_stack_baked_from=stack.id;
  tube.mirror_handedness=evaluated.reflection_count>0?"right-handed-reencoded":tube.mirror_handedness;
  return freeze({
    status:"exact",
    tube,
    stack_id:stack.id,
    operation_count:stack.operations.filter((op)=>op.enabled!==false).length,
    source_base_unchanged:true,
    associative:false,
    right_handed_output:true
  });
}

export function transformStackFingerprint(stack){
  const payload={
    id:stack?.id??null,
    object_id:stack?.object_id??null,
    operations:(stack?.operations??[]).map((op)=>({
      id:op.id,kind:op.kind,enabled:op.enabled!==false,
      metadata:op.metadata??{}
    }))
  };
  let hash=2166136261;
  const text=JSON.stringify(payload);
  for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return "stack-"+(hash>>>0).toString(16).padStart(8,"0");
}

export function summarizeTransformStack(stack){
  const operations=stack?.operations??[];
  return freeze({
    id:stack?.id??null,
    object_id:stack?.object_id??null,
    total:operations.length,
    enabled:operations.filter((op)=>op.enabled!==false).length,
    moves:operations.filter((op)=>op.kind==="Move").length,
    rotations:operations.filter((op)=>op.kind==="Rotate").length,
    mirrors:operations.filter((op)=>op.kind==="Mirror").length,
    order:operations.map((op)=>op.id),
    associative:stack?.associative===true
  });
}
