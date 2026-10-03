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
function finite(value,name,defaultValue=0){
  if(value===null||value===undefined||value==="")return defaultValue;
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return n;
}
function id(){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?`setup-${uuid}`:`setup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}
function vec3(value={},prefix="vector"){
  return freeze({
    x:finite(value.x,`${prefix}.x`),
    y:finite(value.y,`${prefix}.y`),
    z:finite(value.z,`${prefix}.z`)
  });
}
function normalize(v){
  const x=finite(v?.x,"axis.x"),y=finite(v?.y,"axis.y"),z=finite(v?.z,"axis.z");
  const length=Math.hypot(x,y,z);
  if(!(length>1e-12))throw new RangeError("axis must have non-zero length");
  return {x:x/length,y:y/length,z:z/length};
}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
function cross(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}

export function createMachineSetup(input={}, {setupId=null}={}){
  const method=input.offset_method??"physical_end";
  if(!["physical_end","clamp_point","feed_zero","custom"].includes(method)){
    throw new RangeError("unsupported setup offset method");
  }
  const datumType=input.datum?.type??"P1";
  if(!["P1","P2","point","plane","coordinate_system"].includes(datumType)){
    throw new RangeError("unsupported setup datum type");
  }
  const startExtension=finite(input.clamping_extensions?.start_mm,"clamping_extensions.start_mm",0);
  const endExtension=finite(input.clamping_extensions?.end_mm,"clamping_extensions.end_mm",0);
  if(startExtension<0||endExtension<0)throw new RangeError("clamping extensions cannot be negative");
  return freeze({
    id:requiredString(setupId??input.id??id(),"machine setup id"),
    name:requiredString(input.name??"Setup","machine setup name"),
    machine_profile_id:input.machine_profile_id?requiredString(input.machine_profile_id,"machine_profile_id"):null,
    machine_instance_id:input.machine_instance_id?requiredString(input.machine_instance_id,"machine_instance_id"):null,
    tooling_set_id:input.tooling_set_id?requiredString(input.tooling_set_id,"tooling_set_id"):null,
    tooling_instance_id:input.tooling_instance_id?requiredString(input.tooling_instance_id,"tooling_instance_id"):null,
    datum:freeze({
      type:datumType,
      reference_id:input.datum?.reference_id?requiredString(input.datum.reference_id,"datum.reference_id"):null,
      point_mm:input.datum?.point_mm?vec3(input.datum.point_mm,"datum.point_mm"):null
    }),
    offset_method:method,
    offset_mm:finite(input.offset_mm,"offset_mm",0),
    clamp_point_mm:input.clamp_point_mm===null||input.clamp_point_mm===undefined?null:finite(input.clamp_point_mm,"clamp_point_mm"),
    feed_zero_mm:input.feed_zero_mm===null||input.feed_zero_mm===undefined?null:finite(input.feed_zero_mm,"feed_zero_mm"),
    transform:freeze({
      origin_mm:vec3(input.transform?.origin_mm??{},"transform.origin_mm"),
      x_axis:freeze(normalize(input.transform?.x_axis??{x:1,y:0,z:0})),
      y_axis:freeze(normalize(input.transform?.y_axis??{x:0,y:1,z:0}))
    }),
    clamping_extensions:freeze({start_mm:startExtension,end_mm:endExtension}),
    notes:typeof input.notes==="string"?input.notes:""
  });
}

export function validateMachineSetup(setup){
  const errors=[],warnings=[];
  try{
    const x=normalize(setup?.transform?.x_axis),y=normalize(setup?.transform?.y_axis);
    const d=Math.abs(dot(x,y));
    if(d>1e-6)errors.push("Machine Setup X/Y axes must be perpendicular");
    const z=cross(x,y);
    if(Math.hypot(z.x,z.y,z.z)<1e-9)errors.push("Machine Setup axes are degenerate");
  }catch(error){errors.push(error.message);}
  if(setup?.offset_method==="clamp_point"&&!Number.isFinite(Number(setup?.clamp_point_mm))){
    errors.push("Clamp point offset is required");
  }
  if(setup?.offset_method==="feed_zero"&&!Number.isFinite(Number(setup?.feed_zero_mm))){
    errors.push("Feed zero offset is required");
  }
  if(setup?.datum?.type==="point"&&!setup?.datum?.point_mm){
    errors.push("Point datum requires coordinates");
  }
  if(!setup?.machine_profile_id&&!setup?.machine_instance_id)warnings.push("Machine is not assigned to setup");
  if(!setup?.tooling_set_id&&!setup?.tooling_instance_id)warnings.push("Tooling is not assigned to setup");
  return freeze({ok:errors.length===0,status:errors.length?"Error":warnings.length?"Warning":"Valid",errors,warnings});
}

export function machineSetupFrame(setup){
  const x=normalize(setup.transform.x_axis);
  const y0=normalize(setup.transform.y_axis);
  const projection=dot(y0,x);
  const y=normalize({x:y0.x-projection*x.x,y:y0.y-projection*x.y,z:y0.z-projection*x.z});
  const z=normalize(cross(x,y));
  return freeze({origin_mm:vec3(setup.transform.origin_mm),x_axis:freeze(x),y_axis:freeze(y),z_axis:freeze(z)});
}

export function worldToMachinePoint(point,setup){
  const frame=machineSetupFrame(setup),p=vec3(point,"point");
  const d={x:p.x-frame.origin_mm.x,y:p.y-frame.origin_mm.y,z:p.z-frame.origin_mm.z};
  return freeze({x:dot(d,frame.x_axis),y:dot(d,frame.y_axis),z:dot(d,frame.z_axis)});
}

export function machineToWorldPoint(point,setup){
  const frame=machineSetupFrame(setup),p=vec3(point,"point");
  return freeze({
    x:frame.origin_mm.x+frame.x_axis.x*p.x+frame.y_axis.x*p.y+frame.z_axis.x*p.z,
    y:frame.origin_mm.y+frame.x_axis.y*p.x+frame.y_axis.y*p.y+frame.z_axis.y*p.z,
    z:frame.origin_mm.z+frame.x_axis.z*p.x+frame.y_axis.z*p.y+frame.z_axis.z*p.z
  });
}

export function resolvedSetupOffsetMm(setup){
  if(setup.offset_method==="physical_end")return Number(setup.offset_mm)||0;
  if(setup.offset_method==="clamp_point")return Number(setup.clamp_point_mm)||0;
  if(setup.offset_method==="feed_zero")return Number(setup.feed_zero_mm)||0;
  return Number(setup.offset_mm)||0;
}

export function setupFeedLength(nominalFeedMm,setup,{firstBend=false}={}){
  const nominal=finite(nominalFeedMm,"nominalFeedMm");
  const extension=firstBend?Number(setup?.clamping_extensions?.start_mm)||0:0;
  const offset=firstBend?resolvedSetupOffsetMm(setup):0;
  return nominal+extension+offset;
}

export function addMachineSetup(tube,setupInput){
  if(!tube||typeof tube!=="object")throw new TypeError("tube is required");
  const setup=createMachineSetup(setupInput);
  const existing=Array.isArray(tube.machine_setups)?tube.machine_setups:[];
  if(existing.some((x)=>String(x.id)===String(setup.id)))throw new RangeError("duplicate machine setup id");
  return freeze({
    ...clone(tube),
    machine_setups:[...existing,setup],
    active_machine_setup_id:tube.active_machine_setup_id??setup.id
  });
}

export function updateMachineSetup(tube,setupId,patch){
  const existing=Array.isArray(tube?.machine_setups)?tube.machine_setups:[];
  const current=existing.find((x)=>String(x.id)===String(setupId));
  if(!current)throw new RangeError("machine setup not found");
  const next=createMachineSetup({...clone(current),...clone(patch)},{setupId:current.id});
  return freeze({...clone(tube),machine_setups:existing.map((x)=>x.id===current.id?next:x)});
}

export function removeMachineSetup(tube,setupId){
  const existing=Array.isArray(tube?.machine_setups)?tube.machine_setups:[];
  if(!existing.some((x)=>String(x.id)===String(setupId)))throw new RangeError("machine setup not found");
  const next=existing.filter((x)=>String(x.id)!==String(setupId));
  const active=String(tube.active_machine_setup_id??"")===String(setupId)?(next[0]?.id??null):tube.active_machine_setup_id??null;
  return freeze({...clone(tube),machine_setups:next,active_machine_setup_id:active});
}

export function selectMachineSetup(tube,setupId){
  const existing=Array.isArray(tube?.machine_setups)?tube.machine_setups:[];
  if(!existing.some((x)=>String(x.id)===String(setupId)))throw new RangeError("machine setup not found");
  return freeze({...clone(tube),active_machine_setup_id:setupId});
}

export function activeMachineSetup(tube){
  const list=Array.isArray(tube?.machine_setups)?tube.machine_setups:[];
  return list.find((x)=>String(x.id)===String(tube?.active_machine_setup_id??""))??null;
}
