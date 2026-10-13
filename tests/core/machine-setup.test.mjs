import test from "node:test";
import assert from "node:assert/strict";

import {
  activeMachineSetup,
  addMachineSetup,
  createMachineSetup,
  machineSetupFrame,
  machineToWorldPoint,
  removeMachineSetup,
  resolvedSetupOffsetMm,
  selectMachineSetup,
  setupFeedLength,
  updateMachineSetup,
  validateMachineSetup,
  worldToMachinePoint
} from "../../src/domain/machines/machine-setup.mjs";

function setup(overrides={}){
  return createMachineSetup({
    id:"setup-1",name:"Front setup",machine_profile_id:"mp-1",tooling_set_id:"ts-1",
    datum:{type:"P1"},offset_method:"physical_end",offset_mm:10,
    transform:{origin_mm:{x:100,y:200,z:300},x_axis:{x:1,y:0,z:0},y_axis:{x:0,y:1,z:0}},
    clamping_extensions:{start_mm:20,end_mm:15},
    ...overrides
  },{setupId:overrides.id??"setup-1"});
}

test("Machine Setup is a right-handed rigid manufacturing frame",()=>{
  const s=setup();
  const frame=machineSetupFrame(s);
  assert.deepEqual(frame.x_axis,{x:1,y:0,z:0});
  assert.deepEqual(frame.y_axis,{x:0,y:1,z:0});
  assert.deepEqual(frame.z_axis,{x:0,y:0,z:1});
  assert.equal(validateMachineSetup(s).status,"Valid");
});

test("Machine Setup transform converts world and machine points without changing geometry",()=>{
  const s=setup();
  const machine=worldToMachinePoint({x:125,y:190,z:305},s);
  assert.deepEqual(machine,{x:25,y:-10,z:5});
  assert.deepEqual(machineToWorldPoint(machine,s),{x:125,y:190,z:305});
});

test("Machine Setup rejects non-perpendicular axes during validation",()=>{
  const s=setup({transform:{origin_mm:{x:0,y:0,z:0},x_axis:{x:1,y:0,z:0},y_axis:{x:1,y:1,z:0}}});
  const result=validateMachineSetup(s);
  assert.equal(result.ok,false);
  assert.match(result.errors.join(" "),/perpendicular/);
});

test("Machine Setup supports physical end, clamp point, feed zero and custom offsets",()=>{
  assert.equal(resolvedSetupOffsetMm(setup({offset_method:"physical_end",offset_mm:10})),10);
  assert.equal(resolvedSetupOffsetMm(setup({offset_method:"clamp_point",clamp_point_mm:35})),35);
  assert.equal(resolvedSetupOffsetMm(setup({offset_method:"feed_zero",feed_zero_mm:42})),42);
  assert.equal(resolvedSetupOffsetMm(setup({offset_method:"custom",offset_mm:-5})),-5);
});

test("first machine feed adds setup offset and clamping extension only in manufacturing layer",()=>{
  const s=setup({offset_method:"feed_zero",feed_zero_mm:10,clamping_extensions:{start_mm:20,end_mm:15}});
  assert.equal(setupFeedLength(100,s,{firstBend:true}),130);
  assert.equal(setupFeedLength(100,s,{firstBend:false}),100);
});

test("tube may keep multiple named Machine Setups and one active setup",()=>{
  let tube={id:"tube-1"};
  tube=addMachineSetup(tube,{...setup(),id:"a",name:"A"});
  tube=addMachineSetup(tube,{...setup(),id:"b",name:"B"});
  assert.equal(tube.machine_setups.length,2);
  assert.equal(activeMachineSetup(tube).name,"A");
  tube=selectMachineSetup(tube,"b");
  assert.equal(activeMachineSetup(tube).name,"B");
});

test("Machine Setup can be updated and removed without touching nominal tube rows",()=>{
  let tube={id:"tube-1",rows:[{type:"LINE",L:100}]};
  tube=addMachineSetup(tube,{...setup(),id:"a",name:"A"});
  const originalRows=JSON.stringify(tube.rows);
  tube=updateMachineSetup(tube,"a",{offset_mm:25});
  assert.equal(activeMachineSetup(tube).offset_mm,25);
  assert.equal(JSON.stringify(tube.rows),originalRows);
  tube=removeMachineSetup(tube,"a");
  assert.equal(tube.machine_setups.length,0);
  assert.equal(tube.active_machine_setup_id,null);
  assert.equal(JSON.stringify(tube.rows),originalRows);
});

test("clamping extensions cannot be negative",()=>{
  assert.throws(()=>setup({clamping_extensions:{start_mm:-1,end_mm:0}}),/cannot be negative/);
});
