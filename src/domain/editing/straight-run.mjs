function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function finite(value,name){
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return n;
}
function normalizeNodes(nodes,total){
  const list=[...new Set((nodes??[]).map((v)=>finite(v,"split node")).filter((v)=>v>0&&v<total).map((v)=>Number(v.toFixed(9))))].sort((a,b)=>a-b);
  return list;
}
export function createStraightRun({id=null,total_length_mm,nodes_mm=[],source_row_id=null}={}){
  const total=finite(total_length_mm,"total_length_mm");
  if(!(total>0))throw new RangeError("total_length_mm must be > 0");
  return freeze({
    id:String(id??(`straight-run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`)),
    source_row_id:source_row_id==null?null:String(source_row_id),
    total_length_mm:total,
    nodes_mm:normalizeNodes(nodes_mm,total)
  });
}
export function straightRunSegments(run){
  const points=[0,...run.nodes_mm,run.total_length_mm];
  return freeze(points.slice(0,-1).map((start,index)=>freeze({
    index,
    start_mm:start,
    end_mm:points[index+1],
    length_mm:points[index+1]-start
  })));
}
export function splitStraightAtDistance(run,distance_mm,{from="start",tolerance_mm=1e-6}={}){
  const d=finite(distance_mm,"distance_mm");
  if(!(d>0))throw new RangeError("split distance must be > 0");
  const total=run.total_length_mm;
  const position=from==="start"?d:from==="end"?total-d:NaN;
  if(!Number.isFinite(position))throw new RangeError("from must be start or end");
  if(position<=tolerance_mm||position>=total-tolerance_mm)throw new RangeError("split point must lie inside straight run");
  if(run.nodes_mm.some((node)=>Math.abs(node-position)<=tolerance_mm))return run;
  return createStraightRun({...run,nodes_mm:[...run.nodes_mm,position],id:run.id});
}
export function splitStraightAtNormalized(run,t,{tolerance_mm=1e-6}={}){
  const value=finite(t,"t");
  if(!(value>0&&value<1))throw new RangeError("t must be between 0 and 1");
  return splitStraightAtDistance(run,run.total_length_mm*value,{from:"start",tolerance_mm});
}
export function splitStraightEqual(run,count){
  const n=Math.trunc(finite(count,"count"));
  if(n<2)throw new RangeError("equal split count must be >= 2");
  const nodes=[];
  for(let i=1;i<n;i++)nodes.push(run.total_length_mm*i/n);
  return createStraightRun({...run,nodes_mm:[...run.nodes_mm,...nodes],id:run.id});
}
export function removeStraightSplit(run,nodeIndex){
  const i=Math.trunc(finite(nodeIndex,"nodeIndex"));
  if(i<0||i>=run.nodes_mm.length)throw new RangeError("split node index out of range");
  return createStraightRun({...run,nodes_mm:run.nodes_mm.filter((_,index)=>index!==i),id:run.id});
}
export function validateStraightRun(run,{lmin_mm=0,end_segments_exempt=false}={}){
  const lmin=Math.max(0,finite(lmin_mm,"lmin_mm"));
  const segments=straightRunSegments(run);
  const issues=[];
  for(const segment of segments){
    const endpoint=end_segments_exempt&&(segment.index===0||segment.index===segments.length-1);
    if(!endpoint&&segment.length_mm+1e-9<lmin){
      issues.push(freeze({
        severity:"Warning",
        code:"BELOW_LMIN",
        segment_index:segment.index,
        length_mm:segment.length_mm,
        lmin_mm:lmin,
        message:`Internal straight segment ${segment.length_mm} mm is shorter than Lmin ${lmin} mm`
      }));
    }
  }
  return freeze({
    valid:issues.length===0,
    status:issues.length?"Warning":"Valid",
    issues,
    segments
  });
}
export function straightRunSnapNodes(run,{origin={x:0,y:0,z:0},direction}={}){
  const o={x:finite(origin.x,"origin.x"),y:finite(origin.y,"origin.y"),z:finite(origin.z,"origin.z")};
  const d={x:finite(direction.x,"direction.x"),y:finite(direction.y,"direction.y"),z:finite(direction.z,"direction.z")};
  const len=Math.hypot(d.x,d.y,d.z);
  if(!(len>0))throw new RangeError("direction must be non-zero");
  const u={x:d.x/len,y:d.y/len,z:d.z/len};
  return freeze(run.nodes_mm.map((distance,index)=>freeze({
    id:`${run.id}:node:${index}`,
    type:"Node",
    distance_mm:distance,
    point:{x:o.x+u.x*distance,y:o.y+u.y*distance,z:o.z+u.z*distance}
  })));
}
export function serializeStraightRunToLegacy(run){
  return freeze({
    type:"LINE",
    L:run.total_length_mm,
    straightRun:{
      id:run.id,
      nodes_mm:[...run.nodes_mm],
      source_row_id:run.source_row_id
    }
  });
}
export function straightRunFromLegacy(row){
  if(!row||row.type!=="LINE")throw new TypeError("legacy row must be LINE");
  const total=finite(row.L,"row.L");
  const data=row.straightRun??{};
  return createStraightRun({
    id:data.id,
    total_length_mm:total,
    nodes_mm:data.nodes_mm??[],
    source_row_id:data.source_row_id??row.elementId??null
  });
}
