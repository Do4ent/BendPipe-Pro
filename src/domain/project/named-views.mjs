const clone=v=>v==null?v:structuredClone(v);
function makeId(){
  const uuid=globalThis.crypto?.randomUUID?.();
  return uuid?"named-view-"+uuid:"named-view-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);
}
function finite(value,name){
  const n=Number(value);if(!Number.isFinite(n))throw new TypeError(name+" must be finite");return n;
}
function point(value,name){
  const v=value??{};return Object.freeze({x:finite(v.x,name+".x"),y:finite(v.y,name+".y"),z:finite(v.z,name+".z")});
}
export function normalizeCameraSnapshot(input={}){
  const projection=String(input.projection??"perspective").toLowerCase();
  if(!["perspective","orthographic"].includes(projection))throw new RangeError("camera projection must be perspective or orthographic");
  const out={
    projection,
    position:point(input.position??{x:4,y:-6,z:4},"camera.position"),
    target:point(input.target??{x:0,y:0,z:0},"camera.target"),
    up:point(input.up??{x:0,y:0,z:1},"camera.up"),
    zoom:finite(input.zoom??1,"camera.zoom"),
    near:finite(input.near??0.01,"camera.near"),
    far:finite(input.far??5000,"camera.far")
  };
  if(projection==="perspective")out.fov=finite(input.fov??55,"camera.fov");
  else{
    out.left=finite(input.left??-1,"camera.left");
    out.right=finite(input.right??1,"camera.right");
    out.top=finite(input.top??1,"camera.top");
    out.bottom=finite(input.bottom??-1,"camera.bottom");
  }
  return Object.freeze(out);
}
export function normalizeCoordinateContext(input={}){
  const anchor=input.bbox_anchor??input.bboxAnchor??{x:0,y:0,z:0};
  const offset=input.coordinate_offset??input.coordinateOffset??{x:0,y:0,z:0};
  const signs=input.axis_signs??input.axisSigns??{x:1,y:1,z:1};
  return Object.freeze({
    bbox_anchor:Object.freeze({x:Number(anchor.x)?1:0,y:Number(anchor.y)?1:0,z:Number(anchor.z)?1:0}),
    coordinate_offset:Object.freeze({x:Number(offset.x)||0,y:Number(offset.y)||0,z:Number(offset.z)||0}),
    axis_signs:Object.freeze({x:Number(signs.x)<0?-1:1,y:Number(signs.y)<0?-1:1,z:Number(signs.z)<0?-1:1})
  });
}
export function normalizeWorkPlane(input={}){
  const value=input&&typeof input==="object"?input:{};
  return Object.freeze({
    id:String(value.id??"world-xy"),
    name:String(value.name??"World XY"),
    origin:point(value.origin??{x:0,y:0,z:0},"work_plane.origin"),
    normal:point(value.normal??{x:0,y:0,z:1},"work_plane.normal"),
    x_axis:point(value.x_axis??value.xAxis??{x:1,y:0,z:0},"work_plane.x_axis")
  });
}
export function normalizeViewEnvironment(input={}){
  const layers=Array.isArray(input.layers)?input.layers.map(layer=>Object.freeze({
    id:String(layer.id??""),
    visible:layer.visible!==false,
    frozen:layer.frozen===true,
    locked:layer.locked===true
  })).filter(layer=>layer.id):[];
  return Object.freeze({
    view_mode:String(input.view_mode??input.viewMode??"user"),
    projection_mode:String(input.projection_mode??input.projectionMode??"perspective"),
    active_layer_id:input.active_layer_id==null?null:String(input.active_layer_id),
    layer_tree_filter_id:input.layer_tree_filter_id==null?null:String(input.layer_tree_filter_id),
    layers:Object.freeze(layers),
    section_view:input.section_view==null?null:clone(input.section_view)
  });
}
export function normalizeNamedView(input={}){
  const id=String(input.id??makeId()),name=String(input.name??"Named View").trim();
  if(!name)throw new Error("Named View name is required");
  return Object.freeze({
    id,
    kind:"NamedView",
    name,
    camera:normalizeCameraSnapshot(input.camera??{}),
    active_ucs:normalizeCoordinateContext(input.active_ucs??input.activeUcs??{}),
    work_plane:normalizeWorkPlane(input.work_plane??input.workPlane??{}),
    environment:normalizeViewEnvironment(input.environment??{}),
    created_at:String(input.created_at??input.createdAt??new Date().toISOString()),
    updated_at:String(input.updated_at??input.updatedAt??new Date().toISOString())
  });
}
export function ensureNamedViewState(project){
  if(!project||typeof project!=="object")throw new TypeError("project is required");
  if(!Array.isArray(project.named_views))project.named_views=[];
  project.named_views=project.named_views.map(view=>({...normalizeNamedView(view)}));
  return project.named_views;
}
export function namedViewById(project,id){
  return ensureNamedViewState(project).find(view=>String(view.id)===String(id))??null;
}
function assertUniqueName(project,name,exceptId=null){
  const key=String(name).trim().toLowerCase();
  if(ensureNamedViewState(project).some(view=>String(view.id)!==String(exceptId)&&String(view.name).trim().toLowerCase()===key))throw new Error("Named View name already exists");
}
export function createNamedView(project,input={}){
  ensureNamedViewState(project);
  const view={...normalizeNamedView(input)};
  if(namedViewById(project,view.id))throw new Error("Named View id already exists");
  assertUniqueName(project,view.name);
  project.named_views.push(view);return view;
}
export function updateNamedView(project,id,input={}){
  const current=namedViewById(project,id);if(!current)throw new Error("Named View not found");
  const next={...normalizeNamedView({...current,...input,id:current.id,created_at:current.created_at,updated_at:new Date().toISOString()})};
  assertUniqueName(project,next.name,current.id);
  const index=project.named_views.findIndex(view=>String(view.id)===String(current.id));
  project.named_views[index]=next;return next;
}
export function renameNamedView(project,id,name){return updateNamedView(project,id,{name});}
export function deleteNamedView(project,id){
  ensureNamedViewState(project);const before=project.named_views.length;
  project.named_views=project.named_views.filter(view=>String(view.id)!==String(id));
  return project.named_views.length!==before;
}
