const clone=(v)=>v==null?v:structuredClone(v);
const freeze=(v)=>{
  if(Array.isArray(v))return Object.freeze(v.map(freeze));
  if(v&&typeof v==="object"&&!Object.isFrozen(v)){for(const k of Object.keys(v))v[k]=freeze(v[k]);return Object.freeze(v);}
  return v;
};
function id(prefix="constraint"){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?prefix+"-"+uuid:prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
}
function required(value,name){
  const text=String(value??"").trim();if(!text)throw new TypeError(name+" is required");return text;
}
function finite(value,name){
  const n=Number(value);if(!Number.isFinite(n))throw new TypeError(name+" must be finite");return n;
}
export const GEOMETRIC_CONSTRAINT_TYPES=freeze([
  "Coincident","Collinear","Parallel","Perpendicular","Tangent","Concentric","Equal",
  "Horizontal","Vertical","FixedDirection","FixedPoint","FixedGeometry"
]);
export const DEFAULT_CONSTRAINT_TOLERANCES=freeze({
  point_mm:1e-6,
  direction_deg:1e-6,
  scalar:1e-9
});
export function normalizeConstraintReference(input={},index=0){
  if(!input||typeof input!=="object")throw new TypeError("reference "+index+" must be an object");
  const object_id=required(input.object_id,"reference "+index+" object_id");
  return freeze({
    object_id,
    subentity_id:input.subentity_id==null?null:String(input.subentity_id),
    role:input.role==null?null:String(input.role),
    assembly_context:clone(input.assembly_context??null),
    snap_type:input.snap_type==null?null:String(input.snap_type)
  });
}
export function createGeometricConstraint(input={},options={}){
  const type=required(input.type,"constraint type");
  if(!GEOMETRIC_CONSTRAINT_TYPES.includes(type))throw new RangeError("unsupported geometric constraint type");
  const references=(input.references??[]).map(normalizeConstraintReference);
  if(!references.length)throw new RangeError("constraint requires references");
  const target=input.target==null?null:clone(input.target);
  return freeze({
    id:required(options.id??input.id??id(),"constraint id"),
    type,
    name:String(input.name??type),
    references,
    target,
    enabled:input.enabled!==false,
    driving:input.driving!==false,
    status:String(input.status??"NeedsSolve"),
    tolerance:freeze({
      point_mm:Number.isFinite(Number(input.tolerance?.point_mm))?Math.max(0,Number(input.tolerance.point_mm)):DEFAULT_CONSTRAINT_TOLERANCES.point_mm,
      direction_deg:Number.isFinite(Number(input.tolerance?.direction_deg))?Math.max(0,Number(input.tolerance.direction_deg)):DEFAULT_CONSTRAINT_TOLERANCES.direction_deg,
      scalar:Number.isFinite(Number(input.tolerance?.scalar))?Math.max(0,Number(input.tolerance.scalar)):DEFAULT_CONSTRAINT_TOLERANCES.scalar
    }),
    note:input.note==null?null:String(input.note),
    cross_assembly:clone(input.cross_assembly??null),
    last_evaluation:clone(input.last_evaluation??null)
  });
}
function point(v){if(!v)return null;const x=Number(v.x??v[0]),y=Number(v.y??v[1]),z=Number(v.z??v[2]);return [x,y,z].every(Number.isFinite)?{x,y,z}:null;}
function vector(v){const p=point(v);if(!p)return null;const len=Math.hypot(p.x,p.y,p.z);return len>1e-12?{x:p.x/len,y:p.y/len,z:p.z/len}:null;}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function cross(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
function angleDeg(a,b){
  const u=vector(a),v=vector(b);if(!u||!v)return null;
  return Math.acos(Math.max(-1,Math.min(1,dot(u,v))))*180/Math.PI;
}
function lineDistance(p,line){
  const o=point(line?.point??line?.origin),d=vector(line?.direction);
  if(!o||!d||!p)return null;
  return Math.hypot(...Object.values(cross({x:p.x-o.x,y:p.y-o.y,z:p.z-o.z},d)));
}
function primitivePoint(value){return point(value?.point??value?.position??value?.center??value);}
function primitiveDirection(value){return vector(value?.direction??value?.axis??value?.normal);}
function primitiveRadius(value){
  const n=Number(value?.radius_mm??value?.radius??value?.clr);return Number.isFinite(n)?n:null;
}
function primitiveScalar(value){
  const n=Number(value?.value??value?.length_mm??value?.length??value?.radius_mm??value?.radius);return Number.isFinite(n)?n:null;
}
function evaluation(ok,details={}){return freeze({ok:ok===true,...clone(details)});}
export function evaluateGeometricConstraint(constraint,{resolveReference}={}){
  if(typeof resolveReference!=="function")throw new TypeError("resolveReference callback is required");
  if(constraint?.enabled===false)return evaluation(true,{status:"Disabled"});
  const resolved=[],missing=[];
  (constraint.references??[]).forEach((ref,index)=>{const value=resolveReference(ref,index,constraint);resolved.push(value);if(value==null)missing.push(index);});
  if(missing.length)return evaluation(false,{status:"LostReference",missing_reference_indexes:missing});
  const t=constraint.tolerance??DEFAULT_CONSTRAINT_TOLERANCES,type=constraint.type;
  let ok=false,error=null,actual=null;
  if(type==="Coincident"){
    const a=primitivePoint(resolved[0]),b=primitivePoint(resolved[1]);error=a&&b?distance(a,b):null;ok=error!=null&&error<=t.point_mm;actual=error;
  }else if(type==="Collinear"){
    const a=primitivePoint(resolved[0]),b=primitivePoint(resolved[1]),d1=primitiveDirection(resolved[0]),d2=primitiveDirection(resolved[1]);
    const ad=d1&&d2?Math.min(angleDeg(d1,d2),angleDeg(d1,{x:-d2.x,y:-d2.y,z:-d2.z})):null;
    const ld=a&&resolved[1]?lineDistance(a,{point:b,direction:d2}):null;
    error=ad==null||ld==null?null:{angle_deg:ad,distance_mm:ld};ok=!!error&&ad<=t.direction_deg&&ld<=t.point_mm;actual=error;
  }else if(type==="Parallel"){
    const a=primitiveDirection(resolved[0]),b=primitiveDirection(resolved[1]);const ang=a&&b?Math.min(angleDeg(a,b),angleDeg(a,{x:-b.x,y:-b.y,z:-b.z})):null;actual=ang;ok=ang!=null&&ang<=t.direction_deg;
  }else if(type==="Perpendicular"){
    const a=primitiveDirection(resolved[0]),b=primitiveDirection(resolved[1]);const ang=a&&b?angleDeg(a,b):null;actual=ang;ok=ang!=null&&Math.abs(90-ang)<=t.direction_deg;
  }else if(type==="Tangent"){
    const a=resolved[0],b=resolved[1],ca=primitivePoint(a),cb=primitivePoint(b),ra=primitiveRadius(a),rb=primitiveRadius(b);
    if(ca&&cb&&ra!=null&&rb!=null){const d=distance(ca,cb),e=Math.min(Math.abs(d-(ra+rb)),Math.abs(d-Math.abs(ra-rb)));actual=e;ok=e<=t.point_mm;}
    else{
      const da=primitiveDirection(a),db=primitiveDirection(b),ang=da&&db?Math.min(angleDeg(da,db),angleDeg(da,{x:-db.x,y:-db.y,z:-db.z})):null;actual=ang;ok=ang!=null&&ang<=t.direction_deg;
    }
  }else if(type==="Concentric"){
    const a=primitivePoint(resolved[0]),b=primitivePoint(resolved[1]);error=a&&b?distance(a,b):null;actual=error;ok=error!=null&&error<=t.point_mm;
  }else if(type==="Equal"){
    const a=primitiveScalar(resolved[0]),b=primitiveScalar(resolved[1]);error=a!=null&&b!=null?Math.abs(a-b):null;actual=error;ok=error!=null&&error<=t.scalar;
  }else if(type==="Horizontal"||type==="Vertical"){
    const d=primitiveDirection(resolved[0]);if(d){const target=type==="Horizontal"?{x:1,y:0,z:0}:{x:0,y:1,z:0};const ang=Math.min(angleDeg(d,target),angleDeg(d,{x:-target.x,y:-target.y,z:-target.z}));actual=ang;ok=ang<=t.direction_deg;}
  }else if(type==="FixedDirection"){
    const d=primitiveDirection(resolved[0]),target=vector(constraint.target?.direction??constraint.target);const ang=d&&target?Math.min(angleDeg(d,target),angleDeg(d,{x:-target.x,y:-target.y,z:-target.z})):null;actual=ang;ok=ang!=null&&ang<=t.direction_deg;
  }else if(type==="FixedPoint"){
    const p=primitivePoint(resolved[0]),target=point(constraint.target?.point??constraint.target);error=p&&target?distance(p,target):null;actual=error;ok=error!=null&&error<=t.point_mm;
  }else if(type==="FixedGeometry"){
    const current=JSON.stringify(resolved[0]?.signature??resolved[0]),target=JSON.stringify(constraint.target?.signature??constraint.target);actual=current;ok=current===target;
  }
  if(actual==null&&ok===false)return evaluation(false,{status:"Error",reason:"Constraint geometry cannot be evaluated fail-closed"});
  return evaluation(ok,{status:ok?"Valid":"Conflict",actual});
}
export function recalculateGeometricConstraint(constraint,callbacks={}){
  const result=evaluateGeometricConstraint(constraint,callbacks);
  return freeze({...clone(constraint),status:result.status,last_evaluation:result});
}
export function geometricConstraintSolvePlan(constraint,{resolveReference,planSolve}={}){
  const evaluation=evaluateGeometricConstraint(constraint,{resolveReference});
  if(evaluation.ok)return freeze({ok:true,status:"AlreadySatisfied",changes:[]});
  if(evaluation.status==="LostReference"||evaluation.status==="Error")return freeze({ok:false,status:evaluation.status,changes:[],reason:evaluation.reason??"Constraint cannot be resolved"});
  if(typeof planSolve!=="function")return freeze({ok:false,status:"Conflict",changes:[],reason:"No geometric constraint solver available"});
  const plan=planSolve({constraint:clone(constraint),evaluation:clone(evaluation)});
  if(!plan||plan.ok===false)return freeze({ok:false,status:"Conflict",changes:freeze(clone(plan?.changes??[])),reason:String(plan?.reason??"Constraint solve failed")});
  return freeze({ok:true,status:"Ready",changes:freeze(clone(plan.changes??[]))});
}
export function ensureConstraintState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.geometric_constraints))project.geometric_constraints=[];
  return project.geometric_constraints;
}
export function upsertGeometricConstraint(project,constraintInput){
  const list=ensureConstraintState(project);
  const constraint=createGeometricConstraint(constraintInput,{id:constraintInput?.id??undefined});
  const index=list.findIndex(x=>String(x?.id)===String(constraint.id));
  if(index>=0)list[index]=clone(constraint);else list.push(clone(constraint));
  return list[index>=0?index:list.length-1];
}
export function removeGeometricConstraint(project,idValue){
  const list=ensureConstraintState(project),before=list.length;
  project.geometric_constraints=list.filter(x=>String(x?.id)!==String(idValue));
  return project.geometric_constraints.length!==before;
}
