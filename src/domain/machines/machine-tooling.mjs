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
function optionalString(value){
  if(value===null||value===undefined)return null;
  const text=String(value).trim();
  return text===""?null:text;
}
function finite(value,name,{positive=false,nonNegative=false}={}){
  if(value===null||value===undefined||value==="")return null;
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite or null`);
  if(positive&&!(n>0))throw new RangeError(`${name} must be > 0`);
  if(nonNegative&&n<0)throw new RangeError(`${name} must be >= 0`);
  return n;
}
function id(prefix){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?`${prefix}-${uuid}`:`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}

function normalizeSimpleCalibration(input={}){
  const source=input&&typeof input==="object"?input:{};
  return freeze({
    angle_offset_deg:finite(source.angle_offset_deg,"calibration.angle_offset_deg"),
    radius_offset_mm:finite(source.radius_offset_mm,"calibration.radius_offset_mm"),
    note:optionalString(source.note)
  });
}

export function createMachineProfile(input={}, {profileId=null}={}){
  return freeze({
    id:requiredString(profileId??input.id??id("machine-profile"),"machine profile id"),
    name:requiredString(input.name,"machine profile name"),
    manufacturer:optionalString(input.manufacturer),
    model:optionalString(input.model),
    technology:optionalString(input.technology),
    max_diameter_mm:finite(input.max_diameter_mm,"max_diameter_mm",{positive:true}),
    max_stock_length_mm:finite(input.max_stock_length_mm,"max_stock_length_mm",{positive:true}),
    min_feed_mm:finite(input.min_feed_mm,"min_feed_mm",{nonNegative:true}),
    max_bend_angle_deg:finite(input.max_bend_angle_deg,"max_bend_angle_deg",{positive:true}),
    clamp_min_mm:finite(input.clamp_min_mm,"clamp_min_mm",{nonNegative:true}),
    rotation_limit_deg:finite(input.rotation_limit_deg,"rotation_limit_deg",{positive:true}),
    head_radius_mm:finite(input.head_radius_mm,"head_radius_mm",{nonNegative:true}),
    head_length_mm:finite(input.head_length_mm,"head_length_mm",{nonNegative:true}),
    head_height_mm:finite(input.head_height_mm,"head_height_mm",{nonNegative:true}),
    bend_side:optionalString(input.bend_side),
    supports_reverse:input.supports_reverse===true,
    nc_post:optionalString(input.nc_post),
    geometry_ref:optionalString(input.geometry_ref),
    confirmed:input.confirmed===true
  });
}

export function createMachineInstance(input={}, {instanceId=null}={}){
  const forbidden=["calibration","calibration_correction","springback_correction","angle_correction_deg"];
  for(const key of forbidden){
    if(key in input&&input[key]!==null&&input[key]!==undefined){
      throw new Error(`Machine Instance cannot store calibration field: ${key}`);
    }
  }
  return freeze({
    id:requiredString(instanceId??input.id??id("machine-instance"),"machine instance id"),
    name:requiredString(input.name,"machine instance name"),
    machine_profile_id:requiredString(input.machine_profile_id,"machine_profile_id"),
    serial_number:optionalString(input.serial_number),
    location:optionalString(input.location),
    limit_overrides:freeze({
      max_diameter_mm:finite(input.limit_overrides?.max_diameter_mm,"limit_overrides.max_diameter_mm",{positive:true}),
      max_stock_length_mm:finite(input.limit_overrides?.max_stock_length_mm,"limit_overrides.max_stock_length_mm",{positive:true}),
      min_feed_mm:finite(input.limit_overrides?.min_feed_mm,"limit_overrides.min_feed_mm",{nonNegative:true}),
      max_bend_angle_deg:finite(input.limit_overrides?.max_bend_angle_deg,"limit_overrides.max_bend_angle_deg",{positive:true}),
      clamp_min_mm:finite(input.limit_overrides?.clamp_min_mm,"limit_overrides.clamp_min_mm",{nonNegative:true}),
      rotation_limit_deg:finite(input.limit_overrides?.rotation_limit_deg,"limit_overrides.rotation_limit_deg",{positive:true})
    })
  });
}

export function createToolingSet(input={}, {toolingSetId=null}={}){
  return freeze({
    id:requiredString(toolingSetId??input.id??id("tooling-set"),"tooling set id"),
    name:requiredString(input.name,"tooling set name"),
    compatible_machine_profile_ids:freeze([...new Set((input.compatible_machine_profile_ids??[]).map((x)=>requiredString(x,"compatible machine profile id")))]),
    diameter_mm:finite(input.diameter_mm,"diameter_mm",{positive:true}),
    wall_min_mm:finite(input.wall_min_mm,"wall_min_mm",{positive:true}),
    wall_max_mm:finite(input.wall_max_mm,"wall_max_mm",{positive:true}),
    clr_mm:finite(input.clr_mm,"clr_mm",{positive:true}),
    min_straight_mm:finite(input.min_straight_mm,"min_straight_mm",{nonNegative:true}),
    components:freeze({
      bend_die:optionalString(input.components?.bend_die),
      clamp_die:optionalString(input.components?.clamp_die),
      pressure_die:optionalString(input.components?.pressure_die),
      mandrel:optionalString(input.components?.mandrel),
      wiper_die:optionalString(input.components?.wiper_die)
    }),
    geometry_ref:optionalString(input.geometry_ref),
    calibration:normalizeSimpleCalibration(input.calibration),
    notes:optionalString(input.notes)
  });
}

export function createToolingInstance(input={}, {toolingInstanceId=null}={}){
  if("maintenance" in input||"wear" in input||"cycle_count" in input){
    throw new Error("Tooling Instance maintenance/wear tracking is not supported");
  }
  return freeze({
    id:requiredString(toolingInstanceId??input.id??id("tooling-instance"),"tooling instance id"),
    name:requiredString(input.name,"tooling instance name"),
    tooling_set_id:requiredString(input.tooling_set_id,"tooling_set_id"),
    serial_number:optionalString(input.serial_number),
    machine_instance_id:optionalString(input.machine_instance_id),
    calibration:normalizeSimpleCalibration(input.calibration),
    angle_correction_deg:finite(input.angle_correction_deg,"angle_correction_deg")
  });
}

function effective(machineProfile,machineInstance,key){
  const override=machineInstance?.limit_overrides?.[key];
  return override===null||override===undefined?machineProfile?.[key]??null:override;
}

export function effectiveMachineLimits(machineProfile,machineInstance=null){
  if(!machineProfile)throw new TypeError("machineProfile is required");
  if(machineInstance&&machineInstance.machine_profile_id!==machineProfile.id){
    throw new Error("Machine Instance does not belong to Machine Profile");
  }
  return freeze({
    max_diameter_mm:effective(machineProfile,machineInstance,"max_diameter_mm"),
    max_stock_length_mm:effective(machineProfile,machineInstance,"max_stock_length_mm"),
    min_feed_mm:effective(machineProfile,machineInstance,"min_feed_mm"),
    max_bend_angle_deg:effective(machineProfile,machineInstance,"max_bend_angle_deg"),
    clamp_min_mm:effective(machineProfile,machineInstance,"clamp_min_mm"),
    rotation_limit_deg:effective(machineProfile,machineInstance,"rotation_limit_deg")
  });
}

export function validateMachineProfile(profile){
  const errors=[],warnings=[];
  if(!profile?.name)errors.push("Machine Profile name is required");
  for(const field of ["max_diameter_mm","max_stock_length_mm","max_bend_angle_deg"]){
    if(!(Number(profile?.[field])>0))errors.push(`${field} must be configured`);
  }
  if(profile?.min_feed_mm===null||profile?.min_feed_mm===undefined)warnings.push("min_feed_mm is not configured");
  if(profile?.clamp_min_mm===null||profile?.clamp_min_mm===undefined)warnings.push("clamp_min_mm is not configured");
  return freeze({status:errors.length?"Error":warnings.length?"Warning":"Valid",ok:errors.length===0,errors,warnings});
}

export function validateToolingSet(set){
  const errors=[],warnings=[];
  if(!set?.name)errors.push("Tooling Set name is required");
  if(!(Number(set?.diameter_mm)>0))errors.push("Tooling Set diameter must be configured");
  if(!(Number(set?.clr_mm)>0))errors.push("Tooling Set CLR must be configured");
  if(Number.isFinite(Number(set?.wall_min_mm))&&Number.isFinite(Number(set?.wall_max_mm))&&Number(set.wall_min_mm)>Number(set.wall_max_mm)){
    errors.push("Tooling Set wall_min_mm cannot exceed wall_max_mm");
  }
  if(!(set?.compatible_machine_profile_ids?.length))warnings.push("No compatible Machine Profile is declared");
  return freeze({status:errors.length?"Error":warnings.length?"Warning":"Valid",ok:errors.length===0,errors,warnings});
}

export function evaluateToolingCompatibility({machineProfile,machineInstance=null,toolingSet,tube}={}){
  const reasons=[],warnings=[];
  if(!machineProfile||!toolingSet)return freeze({status:"Incompatible",reasons:["Machine Profile and Tooling Set are required"],warnings:[]});
  const limits=effectiveMachineLimits(machineProfile,machineInstance);
  if(!toolingSet.compatible_machine_profile_ids.length){
    warnings.push("Tooling Set has no declared Machine Profile compatibility");
  }else if(!toolingSet.compatible_machine_profile_ids.includes(machineProfile.id)){
    reasons.push("Tooling Set is not declared compatible with this Machine Profile");
  }
  const od=Number(tube?.od_mm??tube?.outer_diameter_mm);
  const wall=Number(tube?.wall_mm??tube?.wall_thickness_mm);
  const clr=Number(tube?.clr_mm??tube?.centerline_radius_mm);
  if(Number.isFinite(od)){
    if(Number.isFinite(toolingSet.diameter_mm)&&Math.abs(od-toolingSet.diameter_mm)>0.02)reasons.push(`Tube OD ${od} mm does not match tooling diameter ${toolingSet.diameter_mm} mm`);
    if(Number.isFinite(limits.max_diameter_mm)&&od>limits.max_diameter_mm)reasons.push(`Tube OD ${od} mm exceeds machine limit ${limits.max_diameter_mm} mm`);
  }else warnings.push("Tube OD is unresolved");
  if(Number.isFinite(wall)){
    if(Number.isFinite(toolingSet.wall_min_mm)&&wall<toolingSet.wall_min_mm)reasons.push("Tube wall is below Tooling Set range");
    if(Number.isFinite(toolingSet.wall_max_mm)&&wall>toolingSet.wall_max_mm)reasons.push("Tube wall is above Tooling Set range");
  }else warnings.push("Tube wall thickness is unresolved");
  if(Number.isFinite(clr)&&Number.isFinite(toolingSet.clr_mm)&&Math.abs(clr-toolingSet.clr_mm)>0.05)reasons.push("Tube CLR does not match Tooling Set CLR");
  const status=reasons.length?"Incompatible":warnings.length?"Conditional":"Compatible";
  return freeze({status,reasons,warnings,limits});
}

export function suggestToolingSets({machineProfile,machineInstance=null,toolingSets=[],tube}={}){
  return freeze(toolingSets.map((toolingSet)=>({
    tooling_set:toolingSet,
    compatibility:evaluateToolingCompatibility({machineProfile,machineInstance,toolingSet,tube})
  })).sort((a,b)=>{
    const rank={Compatible:0,Conditional:1,Incompatible:2};
    return rank[a.compatibility.status]-rank[b.compatibility.status]||
      String(a.tooling_set.name).localeCompare(String(b.tooling_set.name));
  }));
}

export function toolingInstanceAngleCorrection(toolingInstance){
  const value=Number(toolingInstance?.angle_correction_deg);
  return Number.isFinite(value)?value:0;
}
