export const FITTED_USAGE=Object.freeze({
  Snap:"Snap",
  Measurement:"Measurement",
  Construction:"Construction",
  ReferenceDimension:"ReferenceDimension",
  DrivingDimension:"DrivingDimension",
  GeometricConstraint:"GeometricConstraint",
  TubeFixation:"TubeFixation",
  ArrayAxis:"ArrayAxis",
  TechnologyCalculation:"TechnologyCalculation"
});

const SAFE_USAGES=new Set([
  FITTED_USAGE.Snap,
  FITTED_USAGE.Measurement,
  FITTED_USAGE.Construction,
  FITTED_USAGE.ReferenceDimension
]);

const CONFIRM_USAGES=new Set([
  FITTED_USAGE.DrivingDimension,
  FITTED_USAGE.GeometricConstraint,
  FITTED_USAGE.TubeFixation,
  FITTED_USAGE.ArrayAxis,
  FITTED_USAGE.TechnologyCalculation
]);

function clone(v){return v==null?v:structuredClone(v);}
function status(value){
  const text=String(value??"").trim().toLowerCase();
  if(text==="fitted")return "Fitted";
  if(text==="exact")return "Exact";
  return null;
}
function directEvidence(value,path){
  if(!value||typeof value!=="object")return null;
  const geometryStatus=status(value.geometry_status??value.geometryStatus);
  const fitted=value.fitted===true||geometryStatus==="Fitted";
  if(!fitted&&geometryStatus!=="Exact")return null;
  return Object.freeze({
    path,
    geometry_status:fitted?"Fitted":"Exact",
    fitting_error:clone(value.fitting_error??value.fit_error??value.max_fit_error_mm??null),
    confidence:value.confidence==null?null:Number(value.confidence),
    evidence:clone(value.evidence??value.geometry_evidence??null),
    id:value.id??value.object_id??value.subentity_id??null
  });
}
export function collectGeometryEvidence(input,{max_depth=6}={}){
  const out=[],seen=new Set();
  const visit=(value,path,depth)=>{
    if(value==null||depth>max_depth)return;
    if(typeof value!=="object")return;
    if(seen.has(value))return;seen.add(value);
    const direct=directEvidence(value,path);
    if(direct)out.push(direct);
    if(direct?.geometry_status==="Exact"&&value?.normalization_provenance?.operation==="FittedToExact")return;
    if(Array.isArray(value)){
      value.forEach((item,index)=>visit(item,path+"["+index+"]",depth+1));
      return;
    }
    for(const [key,child] of Object.entries(value)){
      if(["parent","project","scene","runtime","geometry"].includes(key)&&depth>2)continue;
      visit(child,path?path+"."+key:key,depth+1);
    }
  };
  const roots=Array.isArray(input)?input:[input];
  roots.forEach((item,index)=>visit(item,"item["+index+"]",0));
  return Object.freeze(out);
}
export function fittedGeometryEvidence(input){
  return Object.freeze(collectGeometryEvidence(input).filter(item=>item.geometry_status==="Fitted"));
}
export function hasFittedGeometry(input){return fittedGeometryEvidence(input).length>0;}

export function assessFittedGeometryUsage(input,usage){
  const key=String(usage??"");
  if(!SAFE_USAGES.has(key)&&!CONFIRM_USAGES.has(key))throw new RangeError("unsupported fitted geometry usage: "+key);
  const fitted=fittedGeometryEvidence(input);
  const hasFitted=fitted.length>0;
  const requiresConfirmation=hasFitted&&CONFIRM_USAGES.has(key);
  return Object.freeze({
    usage:key,
    has_fitted_geometry:hasFitted,
    allowed:!requiresConfirmation,
    requires_confirmation:requiresConfirmation,
    warning:requiresConfirmation
      ?"Операция использует Fitted-геометрию. Результат будет зависеть от аппроксимации и fitting error."
      :null,
    fitted_evidence:fitted
  });
}
export function confirmFittedGeometryUsage(input,usage,{confirmed=false}={}){
  const assessment=assessFittedGeometryUsage(input,usage);
  if(!assessment.requires_confirmation)return Object.freeze({...assessment,allowed:true,confirmed:false});
  return Object.freeze({...assessment,allowed:confirmed===true,confirmed:confirmed===true});
}
