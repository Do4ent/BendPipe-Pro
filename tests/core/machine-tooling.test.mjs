import test from "node:test";
import assert from "node:assert/strict";

import {
  createMachineInstance,
  createMachineProfile,
  createToolingInstance,
  createToolingSet,
  effectiveMachineLimits,
  evaluateToolingCompatibility,
  suggestToolingSets,
  toolingInstanceAngleCorrection,
  validateMachineProfile,
  validateToolingSet
} from "../../src/domain/machines/machine-tooling.mjs";

const machine=createMachineProfile({
  id:"mp-1",name:"Bender 40",manufacturer:"Test",model:"B40",technology:"cnc",
  max_diameter_mm:40,max_stock_length_mm:6000,min_feed_mm:20,max_bend_angle_deg:190,
  clamp_min_mm:60,rotation_limit_deg:360,nc_post:"generic-ybc",confirmed:true
},{profileId:"mp-1"});

test("Machine Profile stores type-level limits and validates",()=>{
  assert.equal(machine.max_diameter_mm,40);
  assert.equal(validateMachineProfile(machine).status,"Valid");
});

test("Machine Instance may override limits but cannot store calibration",()=>{
  const instance=createMachineInstance({
    id:"mi-1",name:"Bender 40 #2",machine_profile_id:"mp-1",
    serial_number:"SN2",limit_overrides:{max_stock_length_mm:5500}
  },{instanceId:"mi-1"});
  assert.equal(effectiveMachineLimits(machine,instance).max_stock_length_mm,5500);
  assert.throws(()=>createMachineInstance({
    name:"Bad",machine_profile_id:"mp-1",calibration:{angle:1}
  }),/cannot store calibration/);
});

test("Tooling Set stores physical compatibility and optional simple calibration",()=>{
  const set=createToolingSet({
    id:"ts-16-r40",name:"16x1 R40",compatible_machine_profile_ids:["mp-1"],
    diameter_mm:16,wall_min_mm:0.8,wall_max_mm:1.5,clr_mm:40,min_straight_mm:70,
    components:{bend_die:"BD16R40",clamp_die:"CD16"},
    calibration:{note:"shop correction"}
  },{toolingSetId:"ts-16-r40"});
  assert.equal(set.clr_mm,40);
  assert.equal(validateToolingSet(set).status,"Valid");
});

test("Tooling Instance keeps individual correction but rejects maintenance/wear fields",()=>{
  const instance=createToolingInstance({
    id:"ti-1",name:"16 R40 #1",tooling_set_id:"ts-16-r40",
    machine_instance_id:"mi-1",angle_correction_deg:0.35
  },{toolingInstanceId:"ti-1"});
  assert.equal(toolingInstanceAngleCorrection(instance),0.35);
  assert.throws(()=>createToolingInstance({
    name:"bad",tooling_set_id:"ts-16-r40",wear:0.2
  }),/maintenance\/wear tracking is not supported/);
});

test("tooling compatibility classifies exact tube as Compatible",()=>{
  const set=createToolingSet({
    id:"ts",name:"Exact",compatible_machine_profile_ids:["mp-1"],
    diameter_mm:16,wall_min_mm:0.8,wall_max_mm:1.2,clr_mm:40
  },{toolingSetId:"ts"});
  const result=evaluateToolingCompatibility({
    machineProfile:machine,toolingSet:set,
    tube:{od_mm:16,wall_mm:1,clr_mm:40}
  });
  assert.equal(result.status,"Compatible");
  assert.deepEqual(result.reasons,[]);
});

test("tooling compatibility rejects OD, wall, CLR and machine mismatches",()=>{
  const set=createToolingSet({
    id:"ts",name:"Wrong",compatible_machine_profile_ids:["another"],
    diameter_mm:22,wall_min_mm:1.5,wall_max_mm:2,clr_mm:60
  },{toolingSetId:"ts"});
  const result=evaluateToolingCompatibility({
    machineProfile:machine,toolingSet:set,
    tube:{od_mm:50,wall_mm:1,clr_mm:40}
  });
  assert.equal(result.status,"Incompatible");
  assert.ok(result.reasons.length>=4);
});

test("tooling suggestion orders Compatible before Conditional and Incompatible",()=>{
  const exact=createToolingSet({
    id:"exact",name:"Exact",compatible_machine_profile_ids:["mp-1"],
    diameter_mm:16,wall_min_mm:0.8,wall_max_mm:1.2,clr_mm:40
  },{toolingSetId:"exact"});
  const conditional=createToolingSet({
    id:"conditional",name:"Conditional",compatible_machine_profile_ids:[],
    diameter_mm:16,clr_mm:40
  },{toolingSetId:"conditional"});
  const wrong=createToolingSet({
    id:"wrong",name:"Wrong",compatible_machine_profile_ids:["mp-1"],
    diameter_mm:22,clr_mm:60
  },{toolingSetId:"wrong"});

  const result=suggestToolingSets({
    machineProfile:machine,
    toolingSets:[wrong,conditional,exact],
    tube:{od_mm:16,wall_mm:1,clr_mm:40}
  });
  assert.deepEqual(result.map(x=>x.compatibility.status),["Compatible","Conditional","Incompatible"]);
});
