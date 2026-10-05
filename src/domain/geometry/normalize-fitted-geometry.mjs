function clone(v){return v==null?v:structuredClone(v);}
function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function finiteNumber(value){const n=Number(value);return Number.isFinite(n)?n:null;}
const SKIP_KEYS=new Set([
  "normalization","normalization_provenance","normalized_from","history",
  "evidence","source_chain","fitted_snapshot","exact_snapshot"
]);
function numericLeaves(value,path="",out=new Map(),depth=0){
  if(depth>12||value==null)return out;
  if(typeof value==="number"){
    if(Number.isFinite(value))out.set(path,value);
    return out;
  }
  if(typeof value!=="object")return out;
  if(Array.isArray(value)){
    value.forEach((item,index)=>numericLeaves(item,path+"["+index+"]",out,depth+1));
    return out;
  }
  for(const [key,child] of Object.entries(value)){
    if(SKIP_KEYS.has(key))continue;
    numericLeaves(child,path?path+"."+key:key,out,depth+1);
  }
  return out;
}
export function geometryCorrectionReport(fittedGeometry,exactGeometry){
  if(!fittedGeometry||typeof fittedGeometry!=="object")throw new TypeError("fittedGeometry is required");
  if(!exactGeometry||typeof exactGeometry!=="object")throw new TypeError("exactGeometry is required");
  const before=numericLeaves(fittedGeometry),after=numericLeaves(exactGeometry);
  const deltas=[];
  for(const [path,b] of before){
    if(!after.has(path))continue;
    const a=after.get(path),delta=a-b;
    if(Math.abs(delta)>1e-15)deltas.push({path,before:b,after:a,delta});
  }
  const abs=deltas.map(item=>Math.abs(item.delta));
  const squared=deltas.map(item=>item.delta*item.delta);
  return freeze({
    changed_numeric_fields:deltas.length,
    max_abs_correction:abs.length?Math.max(...abs):0,
    rms_correction:squared.length?Math.sqrt(squared.reduce((a,b)=>a+b,0)/squared.length):0,
    deltas
  });
}
export function isFittedGeometry(value){
  const seen=new Set();
  const visit=(v,depth=0)=>{
    if(v==null||depth>8||typeof v!=="object"||seen.has(v))return false;
    seen.add(v);
    const status=String(v.geometry_status??v.geometryStatus??"").toLowerCase();
    if(status==="fitted"||v.fitted===true)return true;
    if(Array.isArray(v))return v.some(item=>visit(item,depth+1));
    return Object.entries(v).some(([key,child])=>!SKIP_KEYS.has(key)&&visit(child,depth+1));
  };
  return visit(value);
}
export function createExactNormalizedGeometry({
  fitted_geometry,
  exact_geometry,
  source_chain=[],
  method="Normalize Geometry",
  note=null,
  fitted_object_id=null,
  source_object_id=null
}={}){
  if(!isFittedGeometry(fitted_geometry))throw new Error("Normalize Geometry requires Fitted source geometry");
  if(!exact_geometry||typeof exact_geometry!=="object")throw new TypeError("exact_geometry is required");
  const exact=clone(exact_geometry);
  exact.geometry_status="Exact";
  exact.fitted=false;
  const correction=geometryCorrectionReport(fitted_geometry,exact_geometry);
  const provenance=freeze({
    operation:"FittedToExact",
    method:String(method||"Normalize Geometry"),
    from_status:"Fitted",
    to_status:"Exact",
    fitted_object_id:fitted_object_id==null?null:String(fitted_object_id),
    source_object_id:source_object_id==null?null:String(source_object_id),
    source_chain:clone(Array.isArray(source_chain)?source_chain:[source_chain]),
    correction,
    note:note==null?null:String(note),
    source_preserved:true,
    fitted_preserved:true,
    comparison_available:true
  });
  exact.normalization_provenance=clone(provenance);
  return freeze({status:"Exact",exact_geometry:exact,provenance,correction});
}
export function normalizedGeometryComparison(normalized,fitted){
  const exact=normalized?.exact_geometry??normalized;
  const source=fitted??normalized?.provenance?.fitted_snapshot??null;
  if(!source)throw new Error("Fitted comparison geometry is required");
  return geometryCorrectionReport(source,exact);
}
