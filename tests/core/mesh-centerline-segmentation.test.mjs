import test from "node:test";
import assert from "node:assert/strict";

import { segmentMeshCenterlineCandidates } from "../../src/recognition/mesh-centerline-segmentation.mjs";

function p(x,y,z=0){ return [x,y,z]; }

test("A20: two-point bend is accepted only from independent endpoint ring tangents",()=>{
  const points=[
    p(-20,0),
    p(0,0),
    p(10,10),
    p(10,30)
  ];
  const tangents=[
    p(1,0),
    p(1,0),
    p(0,1),
    p(0,1)
  ];

  const result=segmentMeshCenterlineCandidates(points,tangents,{
    tangent_tolerance_deg:0.01,
    two_point_center_tolerance_mm:1e-9
  });

  assert.equal(result.status,"candidate");
  assert.equal(result.production_ready,false);
  assert.equal(result.canonical_ready,false);
  assert.equal(result.primitive_count,3);
  assert.deepEqual(
    result.primitives.map((item)=>item.primitive.type),
    ["LINE","BEND","LINE"]
  );
  const bend=result.primitives[1].primitive;
  assert.equal(bend.evidence_mode,"two_point_ring_tangents");
  assert.ok(Math.abs(bend.clr_mm-10)<1e-9);
  assert.ok(Math.abs(bend.signed_sweep_deg-90)<1e-9);
  assert.ok(bend.center_mismatch_mm<1e-9);
});

test("A20: sampled bend uses circle fit plus every ring tangent",()=>{
  const r=10;
  const points=[
    p(-15,0),
    p(0,0),
    p(r*Math.sin(Math.PI/6),r-r*Math.cos(Math.PI/6)),
    p(r*Math.sin(Math.PI/3),r-r*Math.cos(Math.PI/3)),
    p(10,10),
    p(10,25)
  ];
  const tangents=[
    p(1,0),
    p(1,0),
    p(Math.cos(Math.PI/6),Math.sin(Math.PI/6)),
    p(Math.cos(Math.PI/3),Math.sin(Math.PI/3)),
    p(0,1),
    p(0,1)
  ];

  const result=segmentMeshCenterlineCandidates(points,tangents,{
    tangent_tolerance_deg:0.01
  });

  assert.equal(result.status,"candidate");
  assert.deepEqual(
    result.primitives.map((item)=>item.primitive.type),
    ["LINE","BEND","LINE"]
  );
  const bend=result.primitives[1].primitive;
  assert.equal(bend.evidence_mode,"sampled_arc_with_ring_tangents");
  assert.equal(result.primitives[1].source_point_count,4);
  assert.ok(Math.abs(bend.clr_mm-10)<1e-9);
  assert.ok(Math.abs(bend.signed_sweep_deg-90)<1e-9);
  assert.ok(bend.max_tangent_error_deg<1e-9);
});

test("A20: tangent mismatch prevents a chord from being misclassified as LINE",()=>{
  const result=segmentMeshCenterlineCandidates(
    [p(0,0),p(10,0)],
    [p(1,0),p(0,1)],
    {
      tangent_tolerance_deg:0.1,
      min_bend_angle_deg:0.5
    }
  );

  assert.equal(result.status,"unresolved");
  assert.equal(result.primitives.length,0);
});

test("A20: one straight mesh centerline collapses to one LINE",()=>{
  const result=segmentMeshCenterlineCandidates(
    [p(0,0),p(5,0),p(10,0),p(20,0)],
    [p(1,0),p(1,0),p(1,0),p(1,0)]
  );

  assert.equal(result.status,"candidate");
  assert.equal(result.primitive_count,1);
  assert.equal(result.primitives[0].primitive.type,"LINE");
  assert.ok(Math.abs(result.primitives[0].primitive.length_mm-20)<1e-9);
});

test("A20: two-point circular evidence with inconsistent center stays unresolved",()=>{
  const result=segmentMeshCenterlineCandidates(
    [p(0,0),p(10,10)],
    [p(1,0),p(0.2,1)],
    {
      line_tolerance_mm:0.01,
      tangent_tolerance_deg:0.01,
      two_point_center_tolerance_mm:0.01
    }
  );

  assert.equal(result.status,"unresolved");
});

test("A20: a non-planar sampled arc is rejected rather than flattened",()=>{
  const points=[
    p(-10,0,0),
    p(0,0,0),
    p(7.071067812,2.928932188,0.5),
    p(10,10,0),
    p(10,20,0)
  ];
  const tangents=[
    p(1,0,0),
    p(1,0,0),
    p(Math.SQRT1_2,Math.SQRT1_2,0),
    p(0,1,0),
    p(0,1,0)
  ];
  const result=segmentMeshCenterlineCandidates(points,tangents,{
    arc_plane_tolerance_mm:0.01,
    line_tolerance_mm:0.01
  });

  assert.equal(result.status,"unresolved");
});
