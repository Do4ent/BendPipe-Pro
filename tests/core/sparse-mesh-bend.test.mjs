import test from "node:test";
import assert from "node:assert/strict";

import {
  findSparseMeshBendCandidates,
  recognizeSparseMeshBendCandidate
} from "../../src/recognition/sparse-mesh-bend.mjs";
import { segmentPolylineCandidates } from "../../src/recognition/polyline-segmentation.mjs";

function quarterCircleSparse(){
  const r=10;
  const mid=Math.PI/4;
  return [
    [-20,0,0],
    [-10,0,0],
    [0,0,0],
    [r*Math.sin(mid),r-r*Math.cos(mid),0],
    [10,10,0],
    [10,20,0],
    [10,30,0]
  ];
}

test("A20: three-point mesh arc is accepted only with independent tangent lines on both sides",()=>{
  const points=quarterCircleSparse();
  const result=recognizeSparseMeshBendCandidate(points,2,4);

  assert.equal(result.status,"candidate");
  assert.equal(result.accepted_candidate,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.canonical_ready,false);
  assert.equal(result.source_kind,"validated_tube_mesh_centerline");
  assert.ok(Math.abs(result.primitive.clr_mm-10)<1e-9);
  assert.ok(Math.abs(result.primitive.signed_sweep_deg-90)<1e-9);
  assert.ok(result.tangent_start_error_deg<1e-9);
  assert.ok(result.tangent_end_error_deg<1e-9);
});

test("A20: generic A19 segmentation still refuses arbitrary three-point bend promotion",()=>{
  const points=quarterCircleSparse().slice(2,5);
  const result=segmentPolylineCandidates(points,{min_arc_points:5});

  assert.equal(result.production_ready,false);
  assert.equal(
    result.primitives.some((candidate)=>candidate.primitive.type==="BEND"),
    false
  );
});

test("A20: sparse arc is rejected when outgoing straight is not tangent",()=>{
  const points=quarterCircleSparse();
  points[5]=[20,10,0];
  points[6]=[30,10,0];

  const result=recognizeSparseMeshBendCandidate(points,2,4);
  assert.equal(result.status,"tangency_rejected");
  assert.equal(result.accepted_candidate,false);
  assert.equal(result.primitive,null);
  assert.ok(result.tangent_end_error_deg>80);
});

test("A20: sparse circular fit without enough bracketing source samples remains unresolved",()=>{
  const points=quarterCircleSparse().slice(1,6);
  const result=recognizeSparseMeshBendCandidate(points,1,3);

  assert.equal(result.status,"insufficient_tangent_evidence");
  assert.equal(result.accepted_candidate,false);
});

test("A20: curved neighborhoods cannot masquerade as independent straight tangent evidence",()=>{
  const points=quarterCircleSparse();
  points[1]=[-10,1,0];

  const result=recognizeSparseMeshBendCandidate(points,2,4,{
    line_tolerance_mm:0.05
  });
  assert.equal(result.status,"insufficient_tangent_evidence");
  assert.equal(result.accepted_candidate,false);
  assert.ok(result.incoming_line_error_mm>0.05);
});

test("A20: sparse candidate search returns the supported bend span deterministically",()=>{
  const candidates=findSparseMeshBendCandidates(quarterCircleSparse());
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].source_start_index,2);
  assert.equal(candidates[0].source_end_index,4);
});
