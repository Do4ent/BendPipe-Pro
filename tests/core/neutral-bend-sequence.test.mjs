import test from "node:test";
import assert from "node:assert/strict";

import { buildNeutralBendSequence } from "../../src/recognition/neutral-bend-sequence.mjs";

const X=[1,0,0],Y=[0,1,0],Z=[0,0,1];

function line(start,end,direction,length){
  return {type:"LINE",start,end,direction,length_mm:length};
}
function bend({start,end,t0,t1,normal,angle,clr}){
  return {
    type:"BEND",
    start_point:start,
    end_point:end,
    tangent_start:t0,
    tangent_end:t1,
    plane_normal:normal,
    signed_sweep_deg:angle,
    clr_mm:clr
  };
}

test("A20: neutral sequence preserves geometry and no machine compensation",()=>{
  const primitives=[
    line([-10,0,0],[0,0,0],X,10),
    bend({
      start:[0,0,0],end:[10,10,0],
      t0:X,t1:Y,normal:Z,angle:90,clr:10
    }),
    line([10,10,0],[10,20,0],Y,10),
    bend({
      start:[10,20,0],end:[10,30,10],
      t0:Y,t1:Z,normal:X,angle:90,clr:10
    }),
    line([10,30,10],[10,30,25],Z,15)
  ];

  const result=buildNeutralBendSequence(primitives);
  assert.equal(result.status,"candidate");
  assert.equal(result.production_ready,false);
  assert.equal(result.canonical_ready,false);
  assert.equal(result.machine_compensation_applied,false);
  assert.equal(result.bend_count,2);
  assert.equal(result.bends[0].straight_before_mm,10);
  assert.equal(result.bends[0].rotation_from_previous_bend_deg,null);
  assert.ok(Math.abs(result.bends[1].rotation_from_previous_bend_deg-90)<1e-9);
  assert.equal(result.bends[1].bend_angle_deg,90);
  assert.equal(result.bends[1].clr_mm,10);
  assert.equal(result.tail_length_mm,15);
});

test("A20: coplanar consecutive bends have zero inter-plane rotation",()=>{
  const primitives=[
    line([-10,0,0],[0,0,0],X,10),
    bend({
      start:[0,0,0],end:[10,10,0],
      t0:X,t1:Y,normal:Z,angle:90,clr:10
    }),
    line([10,10,0],[10,20,0],Y,10),
    bend({
      start:[10,20,0],end:[0,30,0],
      t0:Y,t1:[-1,0,0],normal:Z,angle:90,clr:10
    }),
    line([0,30,0],[-10,30,0],[-1,0,0],10)
  ];

  const result=buildNeutralBendSequence(primitives);
  assert.equal(result.status,"candidate");
  assert.equal(result.bends[1].rotation_from_previous_bend_deg,0);
});

test("A20: plane normal sign plus sweep sign is canonicalized geometrically",()=>{
  const primitives=[
    line([-10,0,0],[0,0,0],X,10),
    bend({
      start:[0,0,0],end:[10,10,0],
      t0:X,t1:Y,normal:Z,angle:90,clr:10
    }),
    line([10,10,0],[10,20,0],Y,10),
    bend({
      start:[10,20,0],end:[0,30,0],
      t0:Y,t1:[-1,0,0],normal:[0,0,-1],angle:-90,clr:10
    }),
    line([0,30,0],[-10,30,0],[-1,0,0],10)
  ];

  const result=buildNeutralBendSequence(primitives);
  assert.equal(result.status,"candidate");
  assert.equal(result.bends[1].rotation_from_previous_bend_deg,0);
});

test("A20: invalid topology cannot become a bend program",()=>{
  const result=buildNeutralBendSequence([
    line([0,0,0],[10,0,0],X,10),
    line([10,0,0],[20,0,0],X,10)
  ]);

  assert.equal(result.status,"unresolved");
  assert.equal(result.production_ready,false);
  assert.equal(result.bends.length,0);
  assert.ok(result.issues.some((issue)=>issue.code==="NON_ALTERNATING_TOPOLOGY"));
});

test("A20: complete tube candidate must end with LINE",()=>{
  const result=buildNeutralBendSequence([
    line([-10,0,0],[0,0,0],X,10),
    bend({
      start:[0,0,0],end:[10,10,0],
      t0:X,t1:Y,normal:Z,angle:90,clr:10
    })
  ]);

  assert.equal(result.status,"unresolved");
  assert.ok(result.issues.some((issue)=>issue.code==="MUST_END_WITH_LINE"));
});
