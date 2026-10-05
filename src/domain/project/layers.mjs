export const SYSTEM_LAYER_IDS=Object.freeze({
  tubes:"layer-tubes",
  importedReference:"layer-imported-reference",
  editableImported:"layer-editable-imported",
  construction:"layer-construction",
  dimensions:"layer-dimensions"
});

export const LINETYPES=Object.freeze(["Continuous","Dashed","Dotted","Center"]);

const SYSTEM_LAYERS=Object.freeze([
  Object.freeze({id:SYSTEM_LAYER_IDS.tubes,name:"Tubes",color:"#b87333"}),
  Object.freeze({id:SYSTEM_LAYER_IDS.importedReference,name:"Imported Reference",color:"#9aa7b4"}),
  Object.freeze({id:SYSTEM_LAYER_IDS.editableImported,name:"Editable Imported",color:"#b87333"}),
  Object.freeze({id:SYSTEM_LAYER_IDS.construction,name:"Construction",color:"#52d6ff"}),
  Object.freeze({id:SYSTEM_LAYER_IDS.dimensions,name:"Dimensions",color:"#ffe46b"})
]);

const clone=(value)=>value==null?value:structuredClone(value);
function color(value,fallback="#dce8f5"){
  const text=String(value??fallback).trim();
  if(!/^#[0-9a-f]{6}$/i.test(text))throw new TypeError("layer color must be #RRGGBB");
  return text.toLowerCase();
}
function weight(value,fallback=.25){
  const n=Number(value??fallback);
  if(!Number.isFinite(n)||n<0||n>5)throw new RangeError("lineweight_mm must be between 0 and 5");
  return n;
}
function linetype(value,fallback="Continuous"){
  const text=String(value??fallback);
  if(!LINETYPES.includes(text))throw new RangeError("unsupported linetype");
  return text;
}
export function normalizeLayer(input={}){
  const id=String(input.id??"").trim();
  const name=String(input.name??"").trim();
  if(!id)throw new Error("layer id is required");
  if(!name)throw new Error("layer name is required");
  return Object.freeze({
    id,
    name,
    system:input.system===true,
    visible:input.visible!==false,
    frozen:input.frozen===true,
    locked:input.locked===true,
    color:color(input.color),
    linetype:linetype(input.linetype),
    lineweight_mm:weight(input.lineweight_mm)
  });
}
export function createSystemLayers(){
  return SYSTEM_LAYERS.map((base)=>normalizeLayer({
    ...base,system:true,visible:true,frozen:false,locked:false,linetype:"Continuous",lineweight_mm:.25
  }));
}
export function ensureLayerState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.layers))project.layers=[];
  const byId=new Map(project.layers.filter(Boolean).map((layer)=>[String(layer.id),layer]));
  for(const system of createSystemLayers()){
    const existing=byId.get(system.id);
    if(existing){
      Object.assign(existing,{...system,...existing,id:system.id,name:system.name,system:true});
    }else{
      const created={...system};
      project.layers.push(created);byId.set(created.id,created);
    }
  }
  project.layers=project.layers.map((layer)=>({...normalizeLayer(layer)}));
  if(!project.active_layer_id||!project.layers.some((layer)=>String(layer.id)===String(project.active_layer_id))){
    project.active_layer_id=SYSTEM_LAYER_IDS.tubes;
  }
  if(project.layer_tree_filter_id!=null&&!project.layers.some((layer)=>String(layer.id)===String(project.layer_tree_filter_id))){
    project.layer_tree_filter_id=null;
  }
  return project.layers;
}
export function layerById(project,id){
  ensureLayerState(project);
  return project.layers.find((layer)=>String(layer.id)===String(id))??null;
}
export function defaultLayerIdForKind(kind){
  const key=String(kind??"").toLowerCase();
  if(key==="reference"||key==="source"||key==="imported-reference")return SYSTEM_LAYER_IDS.importedReference;
  if(key==="mesh-instance"||key==="editable-imported")return SYSTEM_LAYER_IDS.editableImported;
  if(key==="construction"||key==="auxiliary")return SYSTEM_LAYER_IDS.construction;
  if(key==="dimension"||key==="dimensions")return SYSTEM_LAYER_IDS.dimensions;
  return SYSTEM_LAYER_IDS.tubes;
}
export function effectiveObjectLayerId(project,object,{kind="tube",preferActive=false}={}){
  ensureLayerState(project);
  const current=String(object?.layer_id??"").trim();
  if(current&&layerById(project,current))return current;
  return preferActive?String(project.active_layer_id):defaultLayerIdForKind(kind);
}
export function assignObjectLayer(project,object,layerId){
  if(!object||typeof object!=="object")throw new TypeError("object is required");
  const layer=layerById(project,layerId);
  if(!layer)throw new Error("Layer not found");
  object.layer_id=layer.id;
  return layer;
}
export function setActiveLayer(project,layerId){
  const layer=layerById(project,layerId);
  if(!layer)throw new Error("Layer not found");
  if(layer.frozen)throw new Error("Frozen layer cannot be active");
  project.active_layer_id=layer.id;
  return layer;
}
export function normalizeObjectStyle(input={}){
  return Object.freeze({
    color:input.color==null||input.color===""?null:color(input.color),
    linetype:input.linetype==null||input.linetype===""?null:linetype(input.linetype),
    lineweight_mm:input.lineweight_mm==null||input.lineweight_mm===""?null:weight(input.lineweight_mm)
  });
}
export function resolveObjectStyle(project,object,{kind="tube"}={}){
  const layerId=effectiveObjectLayerId(project,object,{kind});
  const layer=layerById(project,layerId);
  const override=normalizeObjectStyle(object?.object_style??{});
  return Object.freeze({
    layer_id:layer.id,
    color:override.color??layer.color,
    linetype:override.linetype??layer.linetype,
    lineweight_mm:override.lineweight_mm??layer.lineweight_mm,
    overridden:Object.freeze({
      color:override.color!=null,
      linetype:override.linetype!=null,
      lineweight_mm:override.lineweight_mm!=null
    })
  });
}
export function layerVisibility(project,object,{kind="tube"}={}){
  const layer=layerById(project,effectiveObjectLayerId(project,object,{kind}));
  return Object.freeze({
    visible:layer.visible&&!layer.frozen,
    selectable:layer.visible&&!layer.frozen,
    snappable:layer.visible&&!layer.frozen,
    frozen:layer.frozen,
    layer_id:layer.id
  });
}
const VIEW_ACTIONS=new Set(["view","measure","snap","show","hide","transparent","compare"]);
export function layerPermission(project,object,action,{kind="tube"}={}){
  const layer=layerById(project,effectiveObjectLayerId(project,object,{kind}));
  const key=String(action??"edit").toLowerCase();
  if(layer.frozen){
    return Object.freeze({allowed:false,code:"LAYER_FROZEN",reason:"Слой заморожен",layer_id:layer.id});
  }
  if(layer.locked&&!VIEW_ACTIONS.has(key)){
    return Object.freeze({allowed:false,code:"LAYER_LOCKED",reason:"Слой заблокирован",layer_id:layer.id});
  }
  return Object.freeze({allowed:true,code:"LAYER_ALLOWED",reason:null,layer_id:layer.id});
}
export function createUserLayer(project,input={}){
  ensureLayerState(project);
  const name=String(input.name??"").trim();
  if(!name)throw new Error("Layer name is required");
  if(project.layers.some((layer)=>layer.name.toLowerCase()===name.toLowerCase()))throw new Error("Layer name already exists");
  const id=String(input.id??("layer-"+(globalThis.crypto?.randomUUID?.()??Date.now().toString(36))));
  const layer={...normalizeLayer({...input,id,name,system:false})};
  project.layers.push(layer);
  return layer;
}
export function deleteUserLayer(project,layerId,{reassignTo=SYSTEM_LAYER_IDS.tubes}={}){
  ensureLayerState(project);
  const index=project.layers.findIndex((layer)=>String(layer.id)===String(layerId));
  if(index<0)return false;
  if(project.layers[index].system)throw new Error("System layer cannot be deleted");
  const replacement=layerById(project,reassignTo);
  if(!replacement)throw new Error("Replacement layer not found");
  project.layers.splice(index,1);
  if(String(project.active_layer_id)===String(layerId))project.active_layer_id=replacement.id;
  if(String(project.layer_tree_filter_id??"")===String(layerId))project.layer_tree_filter_id=null;
  return replacement;
}
