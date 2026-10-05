const freeze=(v)=>{
  if(Array.isArray(v))return Object.freeze(v.map(freeze));
  if(v&&typeof v==="object"&&!Object.isFrozen(v)){for(const k of Object.keys(v))v[k]=freeze(v[k]);return Object.freeze(v);}
  return v;
};
const clone=(v)=>v==null?v:structuredClone(v);
const RIGID_AXES=Object.freeze(["Tx","Ty","Tz","Rx","Ry","Rz"]);
function objectIds(constraint){
  return [...new Set((constraint?.references??[]).map(ref=>String(ref?.object_id??"")).filter(Boolean))];
}
function refKey(ref){return String(ref?.object_id??"")+"|"+String(ref?.subentity_id??"");}
function variable(objectId,axis){return String(objectId)+":"+String(axis);}
function scalarVariable(ref){return "scalar:"+refKey(ref);}
function row(entries={},meta={}){
  return {entries:{...entries},meta:{...meta}};
}
function relative(a,b,axis,meta){
  return row({[variable(a,axis)]:1,[variable(b,axis)]:-1},meta);
}
function fixed(a,axis,meta){return row({[variable(a,axis)]:1},meta);}
function relationRows(constraint){
  const refs=constraint?.references??[],ids=objectIds(constraint),type=String(constraint?.type??""),meta={constraint_id:String(constraint?.id??""),type};
  const a=ids[0],b=ids[1]??ids[0],out=[];
  if(!a)return out;
  const rel=(axis)=>out.push(relative(a,b,axis,meta));
  const fix=(axis)=>out.push(fixed(a,axis,meta));
  if(type==="Coincident"){["Tx","Ty","Tz"].forEach(rel);}
  else if(type==="Concentric"){["Tx","Ty","Tz"].forEach(rel);}
  else if(type==="Collinear"){["Tx","Ty","Rx","Ry"].forEach(rel);}
  else if(type==="Parallel"){["Rx","Ry"].forEach(rel);}
  else if(type==="Perpendicular"){rel("Rz");}
  else if(type==="Tangent"){rel("Tz");}
  else if(type==="Horizontal"||type==="Vertical"){["Rx","Ry"].forEach(fix);}
  else if(type==="FixedDirection"){["Rx","Ry"].forEach(fix);}
  else if(type==="FixedPoint"){["Tx","Ty","Tz"].forEach(fix);}
  else if(type==="FixedGeometry"){RIGID_AXES.forEach(fix);}
  else if(type==="Equal"&&refs.length>=2){
    out.push(row({[scalarVariable(refs[0])]:1,[scalarVariable(refs[1])]:-1},meta));
  }
  return out;
}
function gaussianRank(rows,variables,{epsilon=1e-10}={}){
  const cols=[...variables],matrix=rows.map(r=>cols.map(c=>Number(r.entries[c]??0)));
  let rank=0,col=0;const pivots=[],dependent=[];
  const sourceIndexes=rows.map((_,i)=>i);
  while(rank<matrix.length&&col<cols.length){
    let pivot=-1,best=epsilon;
    for(let r=rank;r<matrix.length;r++){
      const value=Math.abs(matrix[r][col]);
      if(value>best){best=value;pivot=r;}
    }
    if(pivot<0){col++;continue;}
    [matrix[rank],matrix[pivot]]=[matrix[pivot],matrix[rank]];
    [sourceIndexes[rank],sourceIndexes[pivot]]=[sourceIndexes[pivot],sourceIndexes[rank]];
    const p=matrix[rank][col];
    for(let c=col;c<cols.length;c++)matrix[rank][c]/=p;
    for(let r=0;r<matrix.length;r++){
      if(r===rank)continue;
      const factor=matrix[r][col];if(Math.abs(factor)<=epsilon)continue;
      for(let c=col;c<cols.length;c++)matrix[r][c]-=factor*matrix[rank][c];
    }
    pivots.push({row_index:sourceIndexes[rank],column:cols[col]});
    rank++;col++;
  }
  const pivotRows=new Set(pivots.map(p=>p.row_index));
  for(let i=0;i<rows.length;i++)if(!pivotRows.has(i))dependent.push(i);
  return {rank,pivots,dependent_rows:dependent,free_columns:cols.filter(c=>!pivots.some(p=>p.column===c))};
}
function classifyAxis(variableName){
  const split=String(variableName).lastIndexOf(":");
  const object_id=split>=0?String(variableName).slice(0,split):"";
  const axis=split>=0?String(variableName).slice(split+1):String(variableName);
  if(String(variableName).startsWith("scalar:"))return {object_id:null,axis:"Scalar",variable:variableName};
  return {object_id,axis,variable:variableName};
}
export function analyzeConstraintDoF(project,{
  include_disabled=false,
  object_ids=[]
}={}){
  const constraints=Array.isArray(project?.geometric_constraints)?project.geometric_constraints:[];
  const active=constraints.filter(c=>include_disabled||c?.enabled!==false);
  const invalid=active.filter(c=>["LostReference","Error","Invalid"].includes(String(c?.status)));
  const conflicts=active.filter(c=>String(c?.status)==="Conflict");
  const refs=active.flatMap(c=>c?.references??[]);
  const scopedIds=(object_ids??[]).map(String).filter(Boolean);
  const ids=[...new Set([...refs.map(r=>String(r?.object_id??"")).filter(Boolean),...scopedIds])];
  const variableSet=new Set();
  for(const id of ids)for(const axis of RIGID_AXES)variableSet.add(variable(id,axis));
  for(const c of active)if(c?.type==="Equal")for(const ref of c.references??[])variableSet.add(scalarVariable(ref));
  const rows=[];
  for(const c of active){
    if(["LostReference","Error","Invalid","Disabled"].includes(String(c?.status)))continue;
    rows.push(...relationRows(c));
  }
  const linear=gaussianRank(rows,variableSet);
  const dependentConstraints=[...new Set(linear.dependent_rows.map(index=>rows[index]?.meta?.constraint_id).filter(Boolean))];
  const total=variableSet.size,free=Math.max(0,total-linear.rank);
  let status;
  if(invalid.length)status="Invalid";
  else if(conflicts.length||dependentConstraints.length)status="Over-constrained";
  else if(total===0||free>0)status="Under-constrained";
  else status="Fully constrained";
  const freeVariables=linear.free_columns.map(classifyAxis);
  const byObject={};
  for(const id of ids)byObject[id]={object_id:id,free_translation:[],free_rotation:[],free_scalar:[],free_variables:[]};
  for(const item of freeVariables){
    if(item.object_id&&byObject[item.object_id]){
      byObject[item.object_id].free_variables.push(item.axis);
      if(item.axis.startsWith("T"))byObject[item.object_id].free_translation.push(item.axis);
      else if(item.axis.startsWith("R"))byObject[item.object_id].free_rotation.push(item.axis);
    }
  }
  for(const item of freeVariables.filter(v=>v.axis==="Scalar")){
    const key=String(item.variable).slice("scalar:".length),objectId=key.split("|")[0];
    if(byObject[objectId])byObject[objectId].free_scalar.push(key);
  }
  const reasons=[];
  if(invalid.length)reasons.push("Есть потерянные или невычислимые ссылки Constraints.");
  if(conflicts.length)reasons.push("Есть конфликтующие Driving Constraints.");
  if(dependentConstraints.length)reasons.push("Есть избыточные зависимые Constraints.");
  if(status==="Under-constrained"&&free>0)reasons.push("Остались свободные степени перемещения, вращения или параметров.");
  if(status==="Fully constrained")reasons.push("Все структурные степени свободы ограничены независимыми Constraints.");
  return freeze({
    status,
    total_dof:total,
    constrained_dof:linear.rank,
    remaining_dof:free,
    variables:Object.freeze([...variableSet]),
    free_variables:freeVariables,
    objects:Object.freeze(Object.values(byObject).map(freeze)),
    invalid_constraint_ids:Object.freeze(invalid.map(c=>String(c.id))),
    conflict_constraint_ids:Object.freeze(conflicts.map(c=>String(c.id))),
    redundant_constraint_ids:Object.freeze(dependentConstraints),
    reasons:Object.freeze(reasons),
    equation_count:rows.length,
    structural_rank:linear.rank
  });
}
export function dofLabel(axis){
  return ({
    Tx:"Move X",Ty:"Move Y",Tz:"Move Z",
    Rx:"Rotate X",Ry:"Rotate Y",Rz:"Rotate Z",
    Scalar:"Parameter"
  })[String(axis)]??String(axis);
}
