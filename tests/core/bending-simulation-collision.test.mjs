import test from "node:test";
import assert from "node:assert/strict";

import {
  SimulationCollisionMode,
  SimulationCollisionStatus,
  analyzeBendingSimulation,
  annotateSimulationSteps,
  classifyBendSimulationStep,
  simulationModeDecision
} from "../../src/domain/manufacturing/bending-simulation-collision.mjs";

const steps=[
  {bend:1,elementId:"b1",Y:100,B:0,C:90,commandAngle:94.5},
  {bend:2,elementId:"b2",Y:80,B:90,C:45,commandAngle:47.25},
  {bend:3,elementId:"b3",Y:60,B:-90,C:30,commandAngle:31.5}
];

test("per-bend simulation status never reports OK without checked evidence",()=>{
  const result=classifyBendSimulationStep(steps[0],[]);
  assert.equal(result.status,SimulationCollisionStatus.NOT_CHECKED);
  assert.equal(result.checked,false);
});

test("checked safe machine/tooling observations produce OK",()=>{
  const result=classifyBendSimulationStep(steps[0],[
    {bend_id:"b1",kind:"machine",checked:true,clearance_mm:25},
    {bend_id:"b1",kind:"tooling",checked:true,clearance_mm:18}
  ],{warning_clearance_mm:5});
  assert.equal(result.status,SimulationCollisionStatus.OK);
  assert.equal(result.min_clearance_mm,18);
});

test("small positive clearance is Warning, not Collision",()=>{
  const result=classifyBendSimulationStep(steps[0],[
    {bend_id:"b1",kind:"machine",clearance_mm:2.5}
  ],{warning_clearance_mm:5,contact_tolerance_mm:0.1});
  assert.equal(result.status,SimulationCollisionStatus.WARNING);
  assert.match(result.warnings.join(" "),/clearance/);
});

test("explicit collision outranks warning evidence",()=>{
  const result=classifyBendSimulationStep(steps[0],[
    {bend_id:"b1",kind:"machine",clearance_mm:2},
    {bend_id:"b1",kind:"tooling",collision:true,message:"pressure die collision"}
  ]);
  assert.equal(result.status,SimulationCollisionStatus.COLLISION);
  assert.match(result.errors.join(" "),/pressure die collision/);
});

test("impossible outranks collision",()=>{
  const result=classifyBendSimulationStep(steps[0],[
    {bend_id:"b1",kind:"machine",collision:true},
    {bend_id:"b1",kind:"tooling",impossible:true,message:"tool cannot reach bend"}
  ]);
  assert.equal(result.status,SimulationCollisionStatus.IMPOSSIBLE);
  assert.match(result.errors.join(" "),/cannot reach/);
});

test("contact policy supports allow warn and forbid without changing source observations",()=>{
  const obs=[{bend_id:"b1",kind:"tooling",contact:true,clearance_mm:0}];
  assert.equal(classifyBendSimulationStep(steps[0],obs,{contact_rule:"allow"}).status,SimulationCollisionStatus.OK);
  assert.equal(classifyBendSimulationStep(steps[0],obs,{contact_rule:"warn"}).status,SimulationCollisionStatus.WARNING);
  assert.equal(classifyBendSimulationStep(steps[0],obs,{contact_rule:"forbid"}).status,SimulationCollisionStatus.COLLISION);
});

test("whole simulation report preserves per-bend status and minimum clearance",()=>{
  const report=analyzeBendingSimulation(steps,[
    {bend_id:"b1",kind:"machine",clearance_mm:12},
    {bend_id:"b2",kind:"tooling",clearance_mm:3},
    {bend_id:"b3",kind:"machine",collision:true,clearance_mm:-1}
  ],{warning_clearance_mm:5});
  assert.equal(report.status,SimulationCollisionStatus.COLLISION);
  assert.equal(report.checked_bend_count,3);
  assert.equal(report.warning_count,1);
  assert.equal(report.collision_count,1);
  assert.equal(report.min_clearance_mm,-1);
  assert.deepEqual(report.per_bend.map((x)=>x.status),["OK","Warning","Collision"]);
});

test("Monitor mode records collisions but does not stop playback",()=>{
  const report=analyzeBendingSimulation(steps,[
    {bend_id:"b1",collision:true,kind:"machine"},
    {bend_id:"b2",clearance_mm:10,kind:"machine"},
    {bend_id:"b3",clearance_mm:10,kind:"machine"}
  ]);
  const decision=simulationModeDecision(report,SimulationCollisionMode.MONITOR);
  assert.equal(decision.can_continue,true);
  assert.equal(decision.release_blocked,false);
});

test("Stop mode stops playback on hard collision but does not itself become a release gate",()=>{
  const report=analyzeBendingSimulation(steps,[
    {bend_id:"b1",collision:true,kind:"machine"}
  ]);
  const decision=simulationModeDecision(report,SimulationCollisionMode.STOP);
  assert.equal(decision.can_continue,false);
  assert.equal(decision.release_blocked,false);
});

test("Validation Lock blocks release for collision or incomplete checking",()=>{
  const incomplete=analyzeBendingSimulation(steps,[
    {bend_id:"b1",clearance_mm:20,kind:"machine"}
  ]);
  const a=simulationModeDecision(incomplete,SimulationCollisionMode.VALIDATION_LOCK);
  assert.equal(a.release_blocked,true);
  assert.match(a.reason,/incomplete/);

  const collision=analyzeBendingSimulation(steps,steps.map((step,index)=>({
    bend_id:step.elementId,kind:"machine",clearance_mm:index===1?-1:20,collision:index===1
  })));
  const b=simulationModeDecision(collision,SimulationCollisionMode.VALIDATION_LOCK);
  assert.equal(b.release_blocked,true);
  assert.equal(b.can_continue,false);
});

test("annotated steps keep nominal and machine values unchanged",()=>{
  const report=analyzeBendingSimulation(steps,[
    {bend_id:"b1",clearance_mm:9,kind:"machine"}
  ]);
  const annotated=annotateSimulationSteps(steps,report);
  assert.equal(annotated[0].C,90);
  assert.equal(annotated[0].commandAngle,94.5);
  assert.equal(annotated[0].simulation_collision_status,"OK");
  assert.equal(annotated[1].simulation_collision_status,"NotChecked");
});
