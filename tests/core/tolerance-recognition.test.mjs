import test from "node:test";
import assert from "node:assert/strict";
import { recognizeSinglePrimitiveCandidate } from "../../src/recognition/primitive-candidate.mjs";
import { fitCircularArcCandidate } from "../../src/recognition/circular-arc-candidate.mjs";

const profile={
  point_tolerance_mm:.01,
  linear_tolerance_mm:.05,
  angular_tolerance_deg:.05,
  coplanar_tolerance_mm:.03,
  circle_arc_fit_tolerance_mm:.08,
  tangent_tolerance_deg:.05,
  cursor_capture_radius_px:40
};

test("question 85: fitted LINE records status error confidence evidence and profile",()=>{
  const result=recognizeSinglePrimitiveCandidate(
    [[0,0,0],[50,.01,0],[100,0,0]],
    {tolerance_profile:profile,evidence:[{source:"polyline",id:"p1"}]}
  );
  assert.equal(result.status,"candidate");
  assert.equal(result.primitive.type,"LINE");
  assert.equal(result.primitive.geometry_status,"Fitted");
  assert.ok(result.primitive.fitting_error.mm>=0);
  assert.ok(result.primitive.confidence>=0&&result.primitive.confidence<=1);
  assert.deepEqual(result.primitive.evidence,[{source:"polyline",id:"p1"}]);
  assert.equal(result.primitive.tolerance_profile.linear_tolerance_mm,.05);
  assert.equal(result.primitive.tolerance_profile.cursor_capture_radius_px,40);
});

test("question 85: fitted BEND records radial/coplanar fitting error and evidence",()=>{
  const pts=[];
  for(let i=0;i<=8;i++){
    const a=(Math.PI/2)*(i/8);
    pts.push([50*Math.cos(a),50*Math.sin(a),i===4?.005:0]);
  }
  const result=recognizeSinglePrimitiveCandidate(
    pts,
    {tolerance_profile:profile,evidence:[{source:"mesh-centerline",samples:pts.length}]}
  );
  assert.equal(result.status,"candidate");
  assert.equal(result.primitive.type,"BEND");
  assert.equal(result.primitive.geometry_status,"Fitted");
  assert.ok(Number.isFinite(result.primitive.fitting_error.mm));
  assert.ok(result.primitive.evidence.length===1);
});

test("question 85: arc fitting consumes Circle/Arc and Coplanar tolerances, not cursor radius",()=>{
  const pts=[[10,0,0],[7.0710678,7.0710678,0.01],[0,10,0]];
  const fit=fitCircularArcCandidate(pts,{tolerance_profile:profile,evidence:["sampled arc"]});
  assert.equal(fit.tolerances.radial_tolerance_mm,.08);
  assert.equal(fit.tolerances.plane_tolerance_mm,.03);
  assert.equal(fit.tolerances.source_profile.cursor_capture_radius_px,40);
  assert.equal(fit.geometry_status,"Fitted");
  assert.deepEqual(fit.evidence,["sampled arc"]);
});
