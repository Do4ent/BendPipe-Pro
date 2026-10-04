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
function id(prefix="dim"){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?`${prefix}-${uuid}`:`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
}
function finiteOrNull(value,name){
  if(value===null||value===undefined||value==="")return null;
  const n=Number(value);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite or null`);
  return n;
}
function normalizeReference(ref,index){
  if(!ref||typeof ref!=="object")throw new TypeError(`reference ${index} must be an object`);
  return freeze({
    object_id:requiredString(ref.object_id,`reference ${index} object_id`),
    subentity_id:ref.subentity_id==null?null:String(ref.subentity_id),
    snap_type:ref.snap_type==null?null:String(ref.snap_type),
    role:ref.role==null?null:String(ref.role)
  });
}
export const DEFAULT_DIMENSION_FORMAT=freeze({
  length_unit:"mm",
  length_decimals:1,
  angle_unit:"deg",
  angle_decimals:2,
  trailing_zeros:true
});
export const DEFAULT_DIMENSION_STYLE=freeze({
  text_height_px:13,
  arrow_size_px:8,
  extension_offset_px:5,
  dimension_offset_px:10,
  model_text_height_mm:3.5,
  min_text_px:11,
  max_text_px:24,
  min_arrow_px:6,
  max_arrow_px:16,
  screen_scale_mode:"Hybrid",
  show_units:true,
  diameter_symbol:"Ø",
  radius_symbol:"R",
  angle_symbol:"°",
  reference_color:"#ffe46b",
  driving_color:"#65d6ff",
  error_color:"#ff6b6b",
  normal_color:"#dce8f5"
});
function finiteRange(value,fallback,min,max,name){
  const n=Number(value??fallback);
  if(!Number.isFinite(n))throw new TypeError(`${name} must be finite`);
  return Math.min(max,Math.max(min,n));
}
function color(value,fallback){
  const text=String(value??fallback).trim();
  if(!/^#[0-9a-f]{6}$/i.test(text))throw new TypeError("dimension color must be #RRGGBB");
  return text.toLowerCase();
}
export function normalizeDimensionStyle(input={}){
  const mode=String(input.screen_scale_mode??DEFAULT_DIMENSION_STYLE.screen_scale_mode);
  if(!["Hybrid","Screen","Model"].includes(mode))throw new RangeError("screen_scale_mode must be Hybrid, Screen or Model");
  return freeze({
    text_height_px:finiteRange(input.text_height_px,DEFAULT_DIMENSION_STYLE.text_height_px,6,72,"text_height_px"),
    arrow_size_px:finiteRange(input.arrow_size_px,DEFAULT_DIMENSION_STYLE.arrow_size_px,3,40,"arrow_size_px"),
    extension_offset_px:finiteRange(input.extension_offset_px,DEFAULT_DIMENSION_STYLE.extension_offset_px,0,80,"extension_offset_px"),
    dimension_offset_px:finiteRange(input.dimension_offset_px,DEFAULT_DIMENSION_STYLE.dimension_offset_px,0,120,"dimension_offset_px"),
    model_text_height_mm:finiteRange(input.model_text_height_mm,DEFAULT_DIMENSION_STYLE.model_text_height_mm,.5,50,"model_text_height_mm"),
    min_text_px:finiteRange(input.min_text_px,DEFAULT_DIMENSION_STYLE.min_text_px,6,72,"min_text_px"),
    max_text_px:finiteRange(input.max_text_px,DEFAULT_DIMENSION_STYLE.max_text_px,6,120,"max_text_px"),
    min_arrow_px:finiteRange(input.min_arrow_px,DEFAULT_DIMENSION_STYLE.min_arrow_px,3,40,"min_arrow_px"),
    max_arrow_px:finiteRange(input.max_arrow_px,DEFAULT_DIMENSION_STYLE.max_arrow_px,3,80,"max_arrow_px"),
    screen_scale_mode:mode,
    show_units:input.show_units!==false,
    diameter_symbol:String(input.diameter_symbol??DEFAULT_DIMENSION_STYLE.diameter_symbol),
    radius_symbol:String(input.radius_symbol??DEFAULT_DIMENSION_STYLE.radius_symbol),
    angle_symbol:String(input.angle_symbol??DEFAULT_DIMENSION_STYLE.angle_symbol),
    reference_color:color(input.reference_color,DEFAULT_DIMENSION_STYLE.reference_color),
    driving_color:color(input.driving_color,DEFAULT_DIMENSION_STYLE.driving_color),
    error_color:color(input.error_color,DEFAULT_DIMENSION_STYLE.error_color),
    normal_color:color(input.normal_color,DEFAULT_DIMENSION_STYLE.normal_color)
  });
}
export function resolveDimensionDisplayMetrics(styleInput={},{
  pixels_per_mm=1,
  device_pixel_ratio=1
}={}){
  const style=normalizeDimensionStyle(styleInput);
  const ppm=Math.max(1e-9,Number(pixels_per_mm)||1);
  const dpr=Math.max(.5,Number(device_pixel_ratio)||1);
  let textPx,arrowPx;
  if(style.screen_scale_mode==="Screen"){
    textPx=style.text_height_px;arrowPx=style.arrow_size_px;
  }else if(style.screen_scale_mode==="Model"){
    const ratio=style.arrow_size_px/style.text_height_px;
    textPx=style.model_text_height_mm*ppm/dpr;
    arrowPx=textPx*ratio;
  }else{
    const ratio=style.arrow_size_px/style.text_height_px;
    const modelPx=style.model_text_height_mm*ppm/dpr;
    textPx=Math.min(style.max_text_px,Math.max(style.min_text_px,modelPx));
    arrowPx=Math.min(style.max_arrow_px,Math.max(style.min_arrow_px,textPx*ratio));
  }
  return freeze({
    text_px:textPx,
    arrow_px:arrowPx,
    extension_offset_px:style.extension_offset_px,
    dimension_offset_px:style.dimension_offset_px,
    mode:style.screen_scale_mode
  });
}
export function dimensionVisualState(dimension,styleInput={}){
  const style=normalizeDimensionStyle(styleInput);
  const error=["Error","LostReference","Conflict"].includes(String(dimension?.status));
  const driving=dimension?.mode==="Driving";
  return freeze({
    color:error?style.error_color:driving?style.driving_color:style.reference_color,
    error,
    driving,
    emphasis:error?"Error":driving?"Driving":"Reference"
  });
}
export function createDimension(input={}, {dimensionId=null}={}){
  const kind=requiredString(input.kind,"dimension kind");
  const mode=input.mode??"Reference";
  if(!["Reference","Driving"].includes(mode))throw new RangeError("dimension mode must be Reference or Driving");
  const refs=(input.references??[]).map(normalizeReference);
  if(!refs.length)throw new RangeError("dimension requires at least one associative reference");
  return freeze({
    id:requiredString(dimensionId??input.id??id(),"dimension id"),
    kind,
    mode,
    references:refs,
    local_plane:clone(input.local_plane??null),
    text_position:clone(input.text_position??null),
    leader:clone(input.leader??null),
    format:freeze({...DEFAULT_DIMENSION_FORMAT,...clone(input.format??{})}),
    style:normalizeDimensionStyle(input.style??{}),
    value:finiteOrNull(input.value,"dimension value"),
    target_value:finiteOrNull(input.target_value,"dimension target_value"),
    status:input.status??"NeedsUpdate",
    visible:input.visible!==false,
    note:input.note==null?null:String(input.note)
  });
}
export function updateDimensionStyle(dimension,patch={}){
  return freeze({
    ...clone(dimension),
    local_plane:patch.local_plane===undefined?clone(dimension.local_plane):clone(patch.local_plane),
    text_position:patch.text_position===undefined?clone(dimension.text_position):clone(patch.text_position),
    leader:patch.leader===undefined?clone(dimension.leader):clone(patch.leader),
    format:freeze({...clone(dimension.format),...clone(patch.format??{})}),
    style:patch.style===undefined?normalizeDimensionStyle(dimension.style??{}):normalizeDimensionStyle({...clone(dimension.style??{}),...clone(patch.style??{})}),
    visible:patch.visible===undefined?dimension.visible:patch.visible!==false
  });
}
export function setDimensionMode(dimension,mode){
  if(!["Reference","Driving"].includes(mode))throw new RangeError("dimension mode must be Reference or Driving");
  return freeze({
    ...clone(dimension),
    mode,
    target_value:mode==="Driving"?(dimension.target_value??dimension.value):null
  });
}
export function setDrivingTarget(dimension,value){
  if(dimension.mode!=="Driving")throw new Error("only Driving dimensions can receive a target value");
  const target=finiteOrNull(value,"driving target");
  if(target===null)throw new TypeError("driving target is required");
  return freeze({...clone(dimension),target_value:target,status:"NeedsSolve"});
}
export function recalculateDimension(dimension,{resolveReference,measure}={}){
  if(typeof resolveReference!=="function")throw new TypeError("resolveReference callback is required");
  if(typeof measure!=="function")throw new TypeError("measure callback is required");
  const resolved=[];
  const missing=[];
  dimension.references.forEach((ref,index)=>{
    const value=resolveReference(ref);
    if(value===null||value===undefined)missing.push(index);
    resolved.push(value);
  });
  if(missing.length){
    return freeze({
      ...clone(dimension),
      value:null,
      status:"LostReference",
      lost_reference_indexes:missing
    });
  }
  let result;
  try{result=measure(dimension.kind,resolved,dimension);}
  catch(error){
    return freeze({
      ...clone(dimension),
      value:null,
      status:"Error",
      calculation_error:String(error?.message??error)
    });
  }
  const value=typeof result==="number"?result:Number(result?.value??result?.length_mm??result?.angle_deg);
  if(!Number.isFinite(value)){
    return freeze({
      ...clone(dimension),
      value:null,
      status:"Error",
      calculation_error:"measurement did not return a finite value"
    });
  }
  return freeze({
    ...clone(dimension),
    value,
    status:dimension.mode==="Driving"&&dimension.target_value!=null&&Math.abs(value-dimension.target_value)>1e-9?"NeedsSolve":"Valid",
    lost_reference_indexes:[]
  });
}
export function drivingSolvePlan(dimension,{resolveReference,planSolve}={}){
  if(dimension.mode!=="Driving")throw new Error("dimension is not Driving");
  if(dimension.target_value===null||dimension.target_value===undefined)throw new Error("Driving dimension has no target value");
  if(typeof resolveReference!=="function")throw new TypeError("resolveReference callback is required");
  if(typeof planSolve!=="function")throw new TypeError("planSolve callback is required");
  const refs=dimension.references.map((ref,index)=>{
    const resolved=resolveReference(ref);
    if(resolved===null||resolved===undefined)throw new Error(`Driving dimension lost reference ${index}`);
    return resolved;
  });
  const plan=planSolve({
    kind:dimension.kind,
    references:refs,
    current_value:dimension.value,
    target_value:dimension.target_value,
    dimension
  });
  if(!plan||typeof plan!=="object")throw new Error("Driving solver did not return a plan");
  if(plan.ok===false){
    return freeze({
      ok:false,
      status:"Conflict",
      conflicts:freeze(clone(plan.conflicts??[])),
      changes:freeze([])
    });
  }
  return freeze({
    ok:true,
    status:"Ready",
    conflicts:freeze([]),
    changes:freeze(clone(plan.changes??[])),
    scope:plan.scope??"local"
  });
}
export function formatDimensionValue(dimension){
  if(dimension.value===null||dimension.value===undefined)return "—";
  const kind=String(dimension.kind??"");
  const isAngle=/angle/i.test(kind);
  const isDiameter=/diameter/i.test(kind);
  const isRadius=/radius|radial/i.test(kind);
  const style=normalizeDimensionStyle(dimension.style??{});
  const decimals=Math.max(0,Math.min(12,Math.trunc(Number(isAngle?dimension.format.angle_decimals:dimension.format.length_decimals)||0)));
  let text=Number(dimension.value).toFixed(decimals);
  if(dimension.format.trailing_zeros===false&&text.includes("."))text=text.replace(/\.?0+$/,"");
  if(isAngle)return text+style.angle_symbol;
  const prefix=isDiameter?style.diameter_symbol:isRadius?style.radius_symbol:"";
  const unit=dimension.format.length_unit??"mm";
  return prefix+text+(style.show_units?" "+unit:"");
}
export function removeDimensionRepresentation(dimension,representationId){
  const reps=Array.isArray(dimension.representations)?dimension.representations:[];
  return freeze({...clone(dimension),representations:reps.filter((x)=>x.id!==representationId)});
}
export function upsertDimensionRepresentation(dimension,representation){
  if(!representation||typeof representation!=="object")throw new TypeError("representation must be an object");
  const rid=requiredString(representation.id,"representation id");
  const reps=Array.isArray(dimension.representations)?clone(dimension.representations):[];
  const index=reps.findIndex((x)=>x.id===rid);
  const next=freeze({
    id:rid,
    surface:requiredString(representation.surface??"3D","representation surface"),
    view_id:representation.view_id==null?null:String(representation.view_id),
    text_position:clone(representation.text_position??null),
    line_position:clone(representation.line_position??null),
    leader_direction:clone(representation.leader_direction??null),
    text_orientation:clone(representation.text_orientation??null),
    display_scale:finiteOrNull(representation.display_scale,"display_scale"),
    visible:representation.visible!==false
  });
  if(index>=0)reps[index]=next;else reps.push(next);
  return freeze({...clone(dimension),representations:reps});
}
