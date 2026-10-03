function freeze(value){
  if(Array.isArray(value))return Object.freeze(value.map(freeze));
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    for(const key of Object.keys(value))value[key]=freeze(value[key]);
    return Object.freeze(value);
  }
  return value;
}
function finite(value,defaultValue=null){
  if(value===null||value===undefined||value==="")return defaultValue;
  const n=Number(value);return Number.isFinite(n)?n:defaultValue;
}
function bendKey(step,index){
  return String(step?.elementId??step?.bend_id??step?.bend??index+1);
}
const STATUS_RANK=Object.freeze({
  NotChecked:0,
  OK:1,
  Warning:2,
  Collision:3,
  Impossible:4
});
export const SimulationCollisionStatus=Object.freeze({
  NOT_CHECKED:"NotChecked",
  OK:"OK",
  WARNING:"Warning",
  COLLISION:"Collision",
  IMPOSSIBLE:"Impossible"
});
export const SimulationCollisionMode=Object.freeze({
  MONITOR:"Monitor",
  STOP:"Stop",
  VALIDATION_LOCK:"ValidationLock"
});

export function normalizeCollisionObservation(input={}){
  const kind=String(input.kind??"machine");
  if(!["machine","tooling","self","fixture","other"].includes(kind)){
    throw new RangeError(`unsupported collision observation kind: ${kind}`);
  }
  const clearance=finite(input.clearance_mm,null);
  return freeze({
    bend_id:String(input.bend_id??input.element_id??input.bend??""),
    kind,
    checked:input.checked!==false,
    collision:input.collision===true,
    impossible:input.impossible===true,
    contact:input.contact===true,
    clearance_mm:clearance,
    message:input.message==null?null:String(input.message),
    source:input.source==null?"simulation":String(input.source)
  });
}

function worstStatus(statuses){
  let best=SimulationCollisionStatus.NOT_CHECKED;
  for(const status of statuses){
    if((STATUS_RANK[status]??-1)>(STATUS_RANK[best]??-1))best=status;
  }
  return best;
}

export function classifyBendSimulationStep(step,observations=[],{
  warning_clearance_mm=5,
  contact_tolerance_mm=0.1,
  contact_rule="warn"
}={}){
  if(!["allow","warn","forbid"].includes(contact_rule)){
    throw new RangeError("contact_rule must be allow, warn or forbid");
  }
  const obs=(observations??[]).map(normalizeCollisionObservation);
  const checked=obs.filter((x)=>x.checked);
  const errors=[],warnings=[];
  let minClearance=null;

  for(const item of checked){
    if(Number.isFinite(item.clearance_mm)){
      minClearance=minClearance===null?item.clearance_mm:Math.min(minClearance,item.clearance_mm);
    }
    if(item.impossible){
      errors.push(item.message||`${item.kind}: operation is impossible`);
      continue;
    }
    if(item.collision){
      errors.push(item.message||`${item.kind}: collision`);
      continue;
    }
    const contact=item.contact===true||
      (Number.isFinite(item.clearance_mm)&&Math.abs(item.clearance_mm)<=contact_tolerance_mm);
    if(contact&&contact_rule==="forbid"){
      errors.push(item.message||`${item.kind}: contact is forbidden`);
    }else if(contact&&contact_rule==="warn"){
      warnings.push(item.message||`${item.kind}: contact`);
    }else if(Number.isFinite(item.clearance_mm)&&item.clearance_mm<warning_clearance_mm){
      warnings.push(item.message||`${item.kind}: clearance ${item.clearance_mm} mm below warning threshold ${warning_clearance_mm} mm`);
    }
  }

  let status;
  if(checked.some((x)=>x.impossible))status=SimulationCollisionStatus.IMPOSSIBLE;
  else if(checked.some((x)=>x.collision)||errors.length)status=SimulationCollisionStatus.COLLISION;
  else if(warnings.length)status=SimulationCollisionStatus.WARNING;
  else if(checked.length)status=SimulationCollisionStatus.OK;
  else status=SimulationCollisionStatus.NOT_CHECKED;

  return freeze({
    bend_id:String(step?.id??step?.elementId??step?.bend_id??step?.bend??""),
    bend:Number.isFinite(Number(step?.bend))?Number(step.bend):null,
    status,
    checked:checked.length>0,
    min_clearance_mm:minClearance,
    observations:checked,
    errors:[...new Set(errors)],
    warnings:[...new Set(warnings)]
  });
}

export function analyzeBendingSimulation(steps=[],observations=[],options={}){
  if(!Array.isArray(steps))throw new TypeError("steps must be an array");
  if(!Array.isArray(observations))throw new TypeError("observations must be an array");
  const normalizedObs=observations.map(normalizeCollisionObservation);
  const perBend=steps.map((step,index)=>{
    const key=bendKey(step,index);
    const related=normalizedObs.filter((item)=>item.bend_id===key||(!item.bend_id&&Number(item.bend)===Number(step?.bend)));
    return classifyBendSimulationStep({...step,id:key},related,options);
  });
  const status=worstStatus(perBend.map((x)=>x.status));
  const checkedCount=perBend.filter((x)=>x.checked).length;
  const collisionCount=perBend.filter((x)=>x.status===SimulationCollisionStatus.COLLISION).length;
  const impossibleCount=perBend.filter((x)=>x.status===SimulationCollisionStatus.IMPOSSIBLE).length;
  const warningCount=perBend.filter((x)=>x.status===SimulationCollisionStatus.WARNING).length;
  const minClearance=perBend.reduce((min,item)=>{
    if(!Number.isFinite(item.min_clearance_mm))return min;
    return min===null?item.min_clearance_mm:Math.min(min,item.min_clearance_mm);
  },null);
  return freeze({
    status,
    fully_checked:steps.length>0&&checkedCount===steps.length,
    bend_count:steps.length,
    checked_bend_count:checkedCount,
    warning_count:warningCount,
    collision_count:collisionCount,
    impossible_count:impossibleCount,
    min_clearance_mm:minClearance,
    per_bend:perBend
  });
}

export function simulationModeDecision(report,mode=SimulationCollisionMode.MONITOR){
  if(!Object.values(SimulationCollisionMode).includes(mode)){
    throw new RangeError(`unsupported simulation collision mode: ${mode}`);
  }
  const status=report?.status??SimulationCollisionStatus.NOT_CHECKED;
  const hasHard=status===SimulationCollisionStatus.COLLISION||status===SimulationCollisionStatus.IMPOSSIBLE;
  const unchecked=report?.fully_checked!==true;
  if(mode===SimulationCollisionMode.MONITOR){
    return freeze({
      mode,
      can_continue:true,
      release_blocked:false,
      reason:hasHard?"Collision recorded; Monitor mode does not stop playback":unchecked?"Collision check incomplete":null
    });
  }
  if(mode===SimulationCollisionMode.STOP){
    return freeze({
      mode,
      can_continue:!hasHard,
      release_blocked:false,
      reason:hasHard?"Playback stopped by collision mode":null
    });
  }
  return freeze({
    mode,
    can_continue:!hasHard,
    release_blocked:hasHard||unchecked,
    reason:hasHard?"Validation Lock: collision/impossible bend":unchecked?"Validation Lock: collision check incomplete":null
  });
}

export function annotateSimulationSteps(steps=[],report){
  const byId=new Map((report?.per_bend??[]).map((item)=>[String(item.bend_id),item]));
  return freeze(steps.map((step,index)=>{
    const id=bendKey(step,index),result=byId.get(id)??null;
    return {
      ...step,
      simulation_collision_status:result?.status??SimulationCollisionStatus.NOT_CHECKED,
      simulation_clearance_mm:result?.min_clearance_mm??null,
      simulation_collision_checked:result?.checked===true
    };
  }));
}
