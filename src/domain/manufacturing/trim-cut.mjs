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
function finite(value,name,defaultValue=null){
  if(value===null||value===undefined||value==="")return defaultValue;
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return n;
}
function normalize(v){
  const x=finite(v?.x,"normal.x",0),y=finite(v?.y,"normal.y",0),z=finite(v?.z,"normal.z",0);
  const l=Math.hypot(x,y,z);if(!(l>1e-12))throw new RangeError("trim plane normal must be non-zero");
  return {x:x/l,y:y/l,z:z/l};
}
function opId(end){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?`trim-${end.toLowerCase()}-${uuid}`:`trim-${end.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

export function createTrimPreference(input={}, {end=null}={}){
  const target=requiredString(end??input.end,"trim end").toUpperCase();
  if(!["P1","P2"].includes(target))throw new RangeError("trim end must be P1 or P2");
  const method=input.method??"saw";
  if(!["saw","tube_cutter","laser","manual","other"].includes(method))throw new RangeError("unsupported trim method");
  const planeMode=input.plane?.mode??"perpendicular_to_centerline";
  if(!["perpendicular_to_centerline","explicit"].includes(planeMode))throw new RangeError("unsupported trim plane mode");
  const tolerance=finite(input.tolerance_mm,"tolerance_mm",0.5);
  if(tolerance<0)throw new RangeError("trim tolerance cannot be negative");
  return freeze({
    end:target,
    method,
    tolerance_mm:tolerance,
    plane:freeze({
      mode:planeMode,
      point_mm:input.plane?.point_mm?freeze({
        x:finite(input.plane.point_mm.x,"plane.point_mm.x",0),
        y:finite(input.plane.point_mm.y,"plane.point_mm.y",0),
        z:finite(input.plane.point_mm.z,"plane.point_mm.z",0)
      }):null,
      normal:planeMode==="explicit"?freeze(normalize(input.plane?.normal)):null
    }),
    notes:typeof input.notes==="string"?input.notes:""
  });
}

export function createTrimOperation({end,remove_length_mm,preference=null,source="required_allowance"}={}){
  const pref=createTrimPreference(preference??{end},{end});
  const removal=finite(remove_length_mm,"remove_length_mm",0);
  if(removal<0)throw new RangeError("trim removal cannot be negative");
  return freeze({
    id:opId(pref.end),
    type:"TrimCut",
    end:pref.end,
    remove_length_mm:removal,
    method:pref.method,
    tolerance_mm:pref.tolerance_mm,
    plane:pref.plane,
    source,
    manufacturing_only:true,
    nominal_geometry_changed:false,
    enabled:removal>1e-9,
    notes:pref.notes
  });
}

export function buildRequiredEndTrimPlan({
  end_allowances={startAllowance:0,endAllowance:0},
  cut_allowances={start_mm:0,end_mm:0},
  setup_extensions={start_mm:0,end_mm:0},
  preferences={}
}={}){
  const p1Auto=Math.max(0,finite(end_allowances.startAllowance,"startAllowance",0));
  const p2Auto=Math.max(0,finite(end_allowances.endAllowance,"endAllowance",0));
  const p1Setup=Math.max(0,finite(setup_extensions.start_mm,"setup_extensions.start_mm",0));
  const p2Setup=Math.max(0,finite(setup_extensions.end_mm,"setup_extensions.end_mm",0));
  const p1Cut=Math.max(0,finite(cut_allowances.start_mm,"cut_allowances.start_mm",0));
  const p2Cut=Math.max(0,finite(cut_allowances.end_mm,"cut_allowances.end_mm",0));
  const p1=createTrimOperation({
    end:"P1",remove_length_mm:p1Auto+p1Setup+p1Cut,
    preference:preferences.P1??{end:"P1"},source:"end_allowance+setup_extension"
  });
  const p2=createTrimOperation({
    end:"P2",remove_length_mm:p2Auto+p2Setup+p2Cut,
    preference:preferences.P2??{end:"P2"},source:"end_allowance+setup_extension"
  });
  return freeze({
    operations:[p1,p2],
    required_removal_mm:p1.remove_length_mm+p2.remove_length_mm,
    p1_auto_allowance_mm:p1Auto,
    p2_auto_allowance_mm:p2Auto,
    p1_setup_extension_mm:p1Setup,
    p2_setup_extension_mm:p2Setup,
    p1_cut_allowance_mm:p1Cut,
    p2_cut_allowance_mm:p2Cut,
    nominal_geometry_changed:false
  });
}

export function validateTrimPlan(plan){
  const errors=[],warnings=[];
  if(!Array.isArray(plan?.operations)||plan.operations.length!==2)errors.push("Trim plan must contain P1 and P2 operations");
  const seen=new Set();
  for(const op of plan?.operations??[]){
    if(!["P1","P2"].includes(op?.end))errors.push("Trim operation has invalid end");
    if(seen.has(op?.end))errors.push(`Duplicate trim operation for ${op.end}`);
    seen.add(op?.end);
    if(!(Number(op?.remove_length_mm)>=0))errors.push(`${op?.end??"?"}: trim removal is invalid`);
    if(!(Number(op?.tolerance_mm)>=0))errors.push(`${op?.end??"?"}: trim tolerance is invalid`);
    if(op?.manufacturing_only!==true||op?.nominal_geometry_changed!==false)errors.push(`${op?.end??"?"}: trim must remain manufacturing-only`);
    if(Number(op?.remove_length_mm)===0)warnings.push(`${op.end}: no trim is required`);
  }
  if(!seen.has("P1")||!seen.has("P2"))errors.push("Trim plan must cover both P1 and P2");
  return freeze({ok:errors.length===0,status:errors.length?"Error":warnings.length?"Warning":"Valid",errors,warnings});
}

export function stockLengthAfterTrim(stockLengthMm,plan){
  const stock=finite(stockLengthMm,"stockLengthMm");
  if(stock===null||stock<0)throw new RangeError("stock length must be non-negative");
  const removal=(plan?.operations??[]).filter((op)=>op.enabled!==false).reduce((sum,op)=>sum+Math.max(0,Number(op.remove_length_mm)||0),0);
  const result=stock-removal;
  if(result<-1e-9)throw new RangeError("trim removal exceeds stock length");
  return Math.max(0,result);
}

export function setTrimPreference(tube,end,preference){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  const pref=createTrimPreference(preference,{end});
  const current=tube.trim_preferences&&typeof tube.trim_preferences==="object"?clone(tube.trim_preferences):{};
  current[pref.end]=pref;
  return freeze({...clone(tube),trim_preferences:current,manufacturing_calculation_state:"Stale"});
}
