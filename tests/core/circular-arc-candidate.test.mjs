import test from "node:test";
import assert from "node:assert/strict";

import { fitCircularArcCandidate } from "../../src/recognition/circular-arc-candidate.mjs";

function quarterCircle(radius, steps=6){
  const pts=[];
  for(let i=0;i<=steps;i++){
    const a=(Math.PI/2)*(i/steps);
    pts.push([
      radius*Math.cos(a),
      radius*Math.sin(a),
      0
    ]);
  }
  return pts;
}

test("A19: exact quarter-circle evidence yields a CLR candidate without production promotion",()=>{
  const result=fitCircularArcCandidate(quarterCircle(50,8),{
    radial_tolerance_mm:1e-6,
    plane_tolerance_mm:1e-6
  });

  assert.equal(result.accepted_candidate,true);
  assert.equal(result.production_ready,false);
  assert.equal(result.truth_category,"inferred");
  assert.ok(Math.abs(result.clr_mm-50)<1e-9);
  assert.ok(Math.abs(Math.abs(result.signed_sweep_deg)-90)<1e-9);
  assert.ok(result.max_radial_error_mm<1e-9);
  assert.ok(result.max_plane_error_mm<1e-9);
});

test("A19: small tessellation noise can pass only when inside explicit tolerances",()=>{
  const pts=quarterCircle(80,10).map((p,i)=>[
    p[0],
    p[1],
    i===5?0.03:0
  ]);
  const accepted=fitCircularArcCandidate(pts,{
    radial_tolerance_mm:0.05,
    plane_tolerance_mm:0.05
  });
  assert.equal(accepted.accepted_candidate,true);

  const rejected=fitCircularArcCandidate(pts,{
    radial_tolerance_mm:0.01,
    plane_tolerance_mm:0.01
  });
  assert.equal(rejected.accepted_candidate,false);
  assert.equal(rejected.clr_mm,null);
});

test("A19: collinear points do not invent a CLR",()=>{
  const result=fitCircularArcCandidate([
    [0,0,0],
    [50,0,0],
    [100,0,0]
  ]);
  assert.equal(result.accepted_candidate,false);
  assert.equal(result.clr_mm,null);
  assert.equal(result.status,"not_circular");
});

test("A19: non-circular polyline is rejected instead of coerced to the fitted radius",()=>{
  const result=fitCircularArcCandidate([
    [50,0,0],
    [35.355,35.355,0],
    [0,55,0],
    [-35.355,35.355,0],
    [-50,0,0]
  ],{
    radial_tolerance_mm:0.1,
    plane_tolerance_mm:0.1
  });

  assert.equal(result.accepted_candidate,false);
  assert.equal(result.clr_mm,null);
  assert.ok(result.fitted_radius_mm>0);
  assert.ok(result.max_radial_error_mm>0.1);
});

test("A19: insufficient point evidence leaves CLR unresolved",()=>{
  const result=fitCircularArcCandidate([
    [0,0,0],
    [10,0,0]
  ]);
  assert.equal(result.status,"insufficient_evidence");
  assert.equal(result.clr_mm,null);
  assert.equal(result.production_ready,false);
});
