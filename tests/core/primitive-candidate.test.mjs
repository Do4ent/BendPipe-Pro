import test from "node:test";
import assert from "node:assert/strict";

import { recognizeSinglePrimitiveCandidate } from "../../src/recognition/primitive-candidate.mjs";

test("A19: straight polyline becomes one LINE candidate",()=>{
  const r=recognizeSinglePrimitiveCandidate([[0,0,0],[50,0.01,0],[100,0,0]],{line_tolerance_mm:0.02});
  assert.equal(r.status,"candidate");
  assert.equal(r.primitive.type,"LINE");
  assert.equal(r.production_ready,false);
  assert.ok(Math.abs(r.primitive.length_mm-100)<1e-9);
});

test("A19: circular polyline becomes one BEND candidate",()=>{
  const pts=[];
  for(let i=0;i<=8;i++){
    const a=(Math.PI/2)*(i/8);
    pts.push([50*Math.cos(a),50*Math.sin(a),0]);
  }
  const r=recognizeSinglePrimitiveCandidate(pts,{
    line_tolerance_mm:0.01,
    arc_radial_tolerance_mm:1e-6,
    arc_plane_tolerance_mm:1e-6
  });
  assert.equal(r.status,"candidate");
  assert.equal(r.primitive.type,"BEND");
  assert.ok(Math.abs(r.primitive.clr_mm-50)<1e-9);
  assert.equal(r.production_ready,false);
});

test("A19: mixed line-plus-bend evidence remains unresolved",()=>{
  const r=recognizeSinglePrimitiveCandidate([
    [0,0,0],
    [50,0,0],
    [100,0,0],
    [135.355,14.645,0],
    [150,50,0]
  ],{
    line_tolerance_mm:0.1,
    arc_radial_tolerance_mm:0.1,
    arc_plane_tolerance_mm:0.1
  });
  assert.equal(r.status,"unresolved");
  assert.equal(r.primitive,null);
  assert.match(r.reason,/segmentation|more source evidence/i);
});

test("A19: insufficient points never create a primitive",()=>{
  const r=recognizeSinglePrimitiveCandidate([[0,0,0]]);
  assert.equal(r.status,"insufficient_evidence");
  assert.equal(r.primitive,null);
});
