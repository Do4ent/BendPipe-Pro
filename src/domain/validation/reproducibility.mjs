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
export const REPRODUCIBILITY_TOLERANCES=freeze({
  point_mm:1e-6,
  length_mm:1e-6,
  angle_deg:1e-7,
  scalar:1e-9
});
function toleranceForPath(path,tolerances){
  const key=String(path).toLowerCase();
  if(/angle|rotation|rot_deg|deg/.test(key))return tolerances.angle_deg;
  if(/point|origin|position|center|closest|xyz|\.x$|\.y$|\.z$/.test(key))return tolerances.point_mm;
  if(/length|radius|clr|diameter|wall|feed|distance|_mm/.test(key))return tolerances.length_mm;
  return tolerances.scalar;
}
function compareNode(a,b,path,tolerances,diffs){
  if(typeof a==="number"||typeof b==="number"){
    if(typeof a!=="number"||typeof b!=="number"||!Number.isFinite(a)||!Number.isFinite(b)){
      if(!Object.is(a,b))diffs.push({path,a,b,reason:"type_or_nonfinite"});
      return;
    }
    const tol=toleranceForPath(path,tolerances),delta=Math.abs(a-b);
    if(delta>tol)diffs.push({path,a,b,delta,tolerance:tol,reason:"numeric_mismatch"});
    return;
  }
  if(Array.isArray(a)||Array.isArray(b)){
    if(!Array.isArray(a)||!Array.isArray(b)){diffs.push({path,a,b,reason:"type_mismatch"});return;}
    if(a.length!==b.length)diffs.push({path:path+".length",a:a.length,b:b.length,reason:"length_mismatch"});
    const n=Math.min(a.length,b.length);
    for(let i=0;i<n;i++)compareNode(a[i],b[i],path+"["+i+"]",tolerances,diffs);
    return;
  }
  if(a&&typeof a==="object"||b&&typeof b==="object"){
    if(!a||!b||typeof a!=="object"||typeof b!=="object"){diffs.push({path,a,b,reason:"type_mismatch"});return;}
    const keys=[...new Set([...Object.keys(a),...Object.keys(b)])].sort();
    for(const key of keys){
      if(!(key in a)||!(key in b)){diffs.push({path:path+"."+key,a:a?.[key],b:b?.[key],reason:"missing_key"});continue;}
      compareNode(a[key],b[key],path?path+"."+key:key,tolerances,diffs);
    }
    return;
  }
  if(!Object.is(a,b))diffs.push({path,a,b,reason:"value_mismatch"});
}
export function createReproducibilityEvidence({backend,payload,engine_version=null,device=null}={}){
  const b=String(backend??"").toLowerCase();
  if(!["cpu","gpu"].includes(b))throw new RangeError("backend must be cpu or gpu");
  if(payload===undefined)throw new TypeError("payload is required");
  return freeze({backend:b,payload:structuredClone(payload),engine_version:engine_version==null?null:String(engine_version),device:device==null?null:String(device)});
}
export function compareCpuGpuEvidence(cpu,gpu,{tolerances=REPRODUCIBILITY_TOLERANCES}={}){
  if(!cpu||!gpu)return freeze({status:"NotChecked",ok:false,reason:"Both CPU and GPU evidence are required",differences:[]});
  if(cpu.backend!=="cpu"||gpu.backend!=="gpu")throw new Error("CPU/GPU evidence roles are invalid");
  const normalized=freeze({
    point_mm:finite(tolerances.point_mm,"point_mm"),
    length_mm:finite(tolerances.length_mm,"length_mm"),
    angle_deg:finite(tolerances.angle_deg,"angle_deg"),
    scalar:finite(tolerances.scalar,"scalar")
  });
  const differences=[];
  compareNode(cpu.payload,gpu.payload,"",normalized,differences);
  return freeze({
    status:differences.length?"Mismatch":"Match",
    ok:differences.length===0,
    differences,
    tolerances:normalized,
    cpu_engine_version:cpu.engine_version,
    gpu_engine_version:gpu.engine_version
  });
}
export function reproducibilityReleaseGate(report){
  if(!report||report.status==="NotChecked")return freeze({ok:false,status:"Blocked",reason:"CPU/GPU reproducibility is not checked"});
  if(report.status!=="Match")return freeze({ok:false,status:"Blocked",reason:"CPU/GPU reproducibility mismatch"});
  return freeze({ok:true,status:"Passed",reason:null});
}
