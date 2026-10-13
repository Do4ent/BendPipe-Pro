function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function requiredString(value,name){
  const text=String(value??"").trim();
  if(!text)throw new TypeError(name+" must be a non-empty string");
  return text;
}
function finite(value,name,{nonNegative=false}={}){
  if(value===null||value===undefined||value==="")return null;
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(name+" must be finite");
  if(nonNegative&&n<0)throw new RangeError(name+" must be >= 0");
  return n;
}
function makeId(){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?"clearance-"+uuid:"clearance-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
}
export const ClearanceStatus=Object.freeze({
  NOT_CHECKED:"NotChecked",
  GREEN:"Green",
  YELLOW:"Yellow",
  RED:"Red"
});

export function createClearanceMonitor(input={}, {monitorId=null}={}){
  const warning=finite(input.warning_clearance_mm??5,"warning_clearance_mm",{nonNegative:true});
  const minimum=finite(input.minimum_clearance_mm??0,"minimum_clearance_mm",{nonNegative:true});
  if(warning!==null&&minimum!==null&&warning<minimum){
    throw new RangeError("warning_clearance_mm cannot be below minimum_clearance_mm");
  }
  const members=Array.isArray(input.members)?input.members.map((x)=>freeze({
    kind:requiredString(x?.kind??"object","member kind"),
    id:requiredString(x?.id,"member id")
  })):[];
  if(members.length<2)throw new RangeError("clearance monitor requires at least two members");
  return freeze({
    id:requiredString(monitorId??input.id??makeId(),"clearance monitor id"),
    name:requiredString(input.name??"Clearance Monitor","clearance monitor name"),
    members,
    warning_clearance_mm:warning??5,
    minimum_clearance_mm:minimum??0,
    enabled:input.enabled!==false,
    exclude_from_collision:input.exclude_from_collision===true,
    notes:input.notes==null?"":String(input.notes)
  });
}

export function classifyClearance(distanceMm,monitor){
  const distance=finite(distanceMm,"distanceMm");
  if(distance===null)return freeze({status:ClearanceStatus.NOT_CHECKED,distance_mm:null});
  if(distance<monitor.minimum_clearance_mm){
    return freeze({status:ClearanceStatus.RED,distance_mm:distance});
  }
  if(distance<monitor.warning_clearance_mm){
    return freeze({status:ClearanceStatus.YELLOW,distance_mm:distance});
  }
  return freeze({status:ClearanceStatus.GREEN,distance_mm:distance});
}

export function evaluateClearanceMonitor(monitor,measurement=null){
  if(!monitor?.enabled){
    return freeze({monitor_id:monitor?.id??null,status:ClearanceStatus.NOT_CHECKED,enabled:false,distance_mm:null,message:"Monitor disabled"});
  }
  const distance=measurement?.distance_mm;
  const classified=classifyClearance(distance,monitor);
  return freeze({
    monitor_id:monitor.id,
    name:monitor.name,
    enabled:true,
    status:classified.status,
    distance_mm:classified.distance_mm,
    closest_points:measurement?.closest_points??null,
    source:measurement?.source??null,
    checked_at:measurement?.checked_at??null,
    message:measurement?.message??null
  });
}

export function evaluateClearanceMonitors(monitors=[],measurements={}){
  const results=(monitors??[]).map((monitor)=>{
    const measurement=measurements instanceof Map
      ?measurements.get(monitor.id)
      :measurements?.[monitor.id];
    return evaluateClearanceMonitor(monitor,measurement??null);
  });
  const rank={NotChecked:0,Green:1,Yellow:2,Red:3};
  const overall=results.reduce((worst,item)=>rank[item.status]>rank[worst]?item.status:worst,ClearanceStatus.NOT_CHECKED);
  return freeze({
    status:overall,
    red_count:results.filter((x)=>x.status===ClearanceStatus.RED).length,
    yellow_count:results.filter((x)=>x.status===ClearanceStatus.YELLOW).length,
    green_count:results.filter((x)=>x.status===ClearanceStatus.GREEN).length,
    not_checked_count:results.filter((x)=>x.status===ClearanceStatus.NOT_CHECKED).length,
    results
  });
}

export function updateClearanceMonitor(monitors,monitorId,patch){
  const current=(monitors??[]).find((x)=>String(x.id)===String(monitorId));
  if(!current)throw new RangeError("clearance monitor not found: "+monitorId);
  const next=createClearanceMonitor({...current,...patch},{monitorId:current.id});
  return freeze(monitors.map((x)=>String(x.id)===String(monitorId)?next:x));
}

export function deleteClearanceMonitor(monitors,monitorId){
  return freeze((monitors??[]).filter((x)=>String(x.id)!==String(monitorId)));
}
