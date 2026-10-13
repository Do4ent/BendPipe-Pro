import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const code=fs.readFileSync(path.join(root,"src","ui","equipment-runtime-bridge.js"),"utf8");
function load(){const sandbox={window:{}};vm.runInNewContext(code,sandbox);return sandbox.window.TubeBenderEquipmentRuntime;}
function fixture(){
  return {
    equipmentLibrary:{
      machine_profiles:[{id:"mp",name:"Bender",manufacturer:"X",model:"1",technology:"cnc",max_diameter_mm:40,max_stock_length_mm:6000,min_feed_mm:20,max_bend_angle_deg:190,clamp_min_mm:60,rotation_limit_deg:360,head_radius_mm:90,nc_post:"generic-ybc",confirmed:true}],
      machine_instances:[{id:"mi",name:"Bender #1",machine_profile_id:"mp",limit_overrides:{max_stock_length_mm:5500}}],
      tooling_sets:[{id:"ts",name:"16 R40",compatible_machine_profile_ids:["mp"],diameter_mm:16,clr_mm:40}],
      tooling_instances:[{id:"ti",name:"16 R40 #1",tooling_set_id:"ts",machine_instance_id:"mi",angle_correction_deg:0.35}]
    }
  };
}

test("equipment runtime bridge is classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code));
  assert.match(code,/TubeBenderEquipmentRuntime/);
});

test("assigned machine instance resolves its profile and effective overrides",()=>{
  const api=load(),project=fixture(),tube={machine_instance_id:"mi"};
  assert.equal(api.resolveMachineProfile(project,tube).id,"mp");
  assert.equal(api.resolveMachineInstance(project,tube).id,"mi");
  const effective=api.effectiveMachine(project,tube,{name:"legacy",maxStockLength:3000});
  assert.equal(effective.name,"Bender #1");
  assert.equal(effective.maxStockLength,5500);
  assert.equal(effective.maxDiameter,40);
  assert.equal(effective.ncPost,"generic-ybc");
});

test("Tooling Instance resolves Tooling Set and individual angle correction",()=>{
  const api=load(),project=fixture(),tube={tooling_instance_id:"ti"};
  assert.equal(api.resolveToolingSet(project,tube).id,"ts");
  assert.equal(api.resolveToolingInstance(project,tube).id,"ti");
  assert.equal(api.toolingCorrectionDeg(project,tube),0.35);
});

test("equipment assignment check rejects incompatible tooling",()=>{
  const api=load(),project=fixture();
  project.equipmentLibrary.tooling_sets[0].compatible_machine_profile_ids=["other"];
  const result=api.assignmentCheck(project,{machine_instance_id:"mi",tooling_instance_id:"ti"});
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/несовместим/);
});

test("equipment assignment check keeps undeclared compatibility as warning",()=>{
  const api=load(),project=fixture();
  project.equipmentLibrary.tooling_sets[0].compatible_machine_profile_ids=[];
  const result=api.assignmentCheck(project,{machine_instance_id:"mi",tooling_instance_id:"ti"});
  assert.equal(result.ok,true);
  assert.equal(result.status,"Warning");
});

test("legacy machine remains fallback only when no new Machine Profile is assigned",()=>{
  const api=load(),legacy={name:"Legacy",maxDiameter:22};
  assert.equal(api.effectiveMachine(fixture(),{},legacy),legacy);
});


test("equipment assignment check rejects wall and CLR mismatch",()=>{
  const api=load(),project=fixture();
  project.equipmentLibrary.tooling_sets[0].wall_min_mm=0.8;
  project.equipmentLibrary.tooling_sets[0].wall_max_mm=1.2;
  project.equipmentLibrary.tooling_sets[0].clr_mm=40;
  const result=api.assignmentCheck(project,{
    machine_instance_id:"mi",
    tooling_instance_id:"ti",
    od_mm:16,
    wall_mm:1.5,
    bend_clr_mm:[40,60]
  });
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/Толщина стенки выше/);
  assert.match(result.errors.join(" "),/CLR трубы/);
});
