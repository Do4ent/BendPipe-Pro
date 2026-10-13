import test from "node:test";
import assert from "node:assert/strict";
import {
  SYSTEM_LAYER_IDS,
  createSystemLayers,
  ensureLayerState,
  createUserLayer,
  deleteUserLayer,
  setActiveLayer,
  assignObjectLayer,
  resolveObjectStyle,
  layerVisibility,
  layerPermission,
  defaultLayerIdForKind
} from "../../src/domain/project/layers.mjs";

test("question 72: five stable system Layers are created",()=>{
  const project={};
  const list=ensureLayerState(project);
  assert.equal(list.length,5);
  assert.deepEqual(list.map(x=>x.name),["Tubes","Imported Reference","Editable Imported","Construction","Dimensions"]);
  assert.equal(project.active_layer_id,SYSTEM_LAYER_IDS.tubes);
  assert.ok(list.every(x=>x.system===true));
});

test("question 72: user Layers support active layer and safe deletion",()=>{
  const project={};
  ensureLayerState(project);
  const custom=createUserLayer(project,{name:"Fixtures",color:"#123456",linetype:"Dashed",lineweight_mm:.5});
  assert.equal(custom.system,false);
  setActiveLayer(project,custom.id);
  assert.equal(project.active_layer_id,custom.id);
  const object={id:"tube"};
  assignObjectLayer(project,object,custom.id);
  assert.equal(object.layer_id,custom.id);
  deleteUserLayer(project,custom.id,{reassignTo:SYSTEM_LAYER_IDS.tubes});
  assert.equal(project.active_layer_id,SYSTEM_LAYER_IDS.tubes);
  assert.throws(()=>deleteUserLayer(project,SYSTEM_LAYER_IDS.tubes),/System layer/);
});

test("question 72: Freeze hides objects and removes selection/Snap eligibility",()=>{
  const project={};ensureLayerState(project);
  const layer=project.layers.find(x=>x.id===SYSTEM_LAYER_IDS.tubes);
  const object={layer_id:layer.id};
  assert.deepEqual(layerVisibility(project,object),{
    visible:true,selectable:true,snappable:true,frozen:false,layer_id:layer.id
  });
  layer.frozen=true;
  const frozen=layerVisibility(project,object);
  assert.equal(frozen.visible,false);
  assert.equal(frozen.selectable,false);
  assert.equal(frozen.snappable,false);
  assert.equal(layerPermission(project,object,"move").code,"LAYER_FROZEN");
});

test("question 72: locked Layer keeps view measure and Snap but blocks editing",()=>{
  const project={};ensureLayerState(project);
  const layer=project.layers.find(x=>x.id===SYSTEM_LAYER_IDS.tubes);
  const object={layer_id:layer.id};
  layer.locked=true;
  for(const action of ["view","measure","snap","show","hide","transparent"])assert.equal(layerPermission(project,object,action).allowed,true,action);
  for(const action of ["move","rotate","delete","properties","geometry"])assert.equal(layerPermission(project,object,action).allowed,false,action);
});

test("question 72: object style overrides Layer style independently",()=>{
  const project={};ensureLayerState(project);
  const object={layer_id:SYSTEM_LAYER_IDS.tubes};
  const byLayer=resolveObjectStyle(project,object);
  assert.equal(byLayer.color,"#b87333");
  assert.equal(byLayer.overridden.color,false);
  object.object_style={color:"#abcdef",linetype:"Dotted",lineweight_mm:.8};
  const overridden=resolveObjectStyle(project,object);
  assert.equal(overridden.color,"#abcdef");
  assert.equal(overridden.linetype,"Dotted");
  assert.equal(overridden.lineweight_mm,.8);
  assert.equal(overridden.overridden.color,true);
});

test("question 72: default system Layer mapping covers project object categories",()=>{
  assert.equal(defaultLayerIdForKind("tube"),SYSTEM_LAYER_IDS.tubes);
  assert.equal(defaultLayerIdForKind("reference"),SYSTEM_LAYER_IDS.importedReference);
  assert.equal(defaultLayerIdForKind("mesh-instance"),SYSTEM_LAYER_IDS.editableImported);
  assert.equal(defaultLayerIdForKind("construction"),SYSTEM_LAYER_IDS.construction);
  assert.equal(defaultLayerIdForKind("dimension"),SYSTEM_LAYER_IDS.dimensions);
});
