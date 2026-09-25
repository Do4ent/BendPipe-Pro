import test from "node:test";
import assert from "node:assert/strict";

import {
  LEGACY_PLANE_NORMALS,
  effectiveLegacyBendAxis,
  solveLegacyBendSettings,
  replayLegacyDirection,
  angleBetweenVectorsDeg
} from "../../src/recognition/legacy-row-kinematics.mjs";

function near(a,b,tol=1e-9){
  assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++){
    assert.ok(Math.abs(a[i]-b[i])<=tol,String(a)+" vs "+String(b));
  }
}

test("A20: legacy plane-normal convention matches live VC207R7 geometry",()=>{
  assert.deepEqual(LEGACY_PLANE_NORMALS.XY,[0,0,1]);
  assert.deepEqual(LEGACY_PLANE_NORMALS.YZ,[1,0,0]);
  assert.deepEqual(LEGACY_PLANE_NORMALS.XZ,[0,-1,0]);
});

test("A20: first tube-local +X to +Y bend maps exactly to XY plane with zero twist",()=>{
  const settings=solveLegacyBendSettings({
    incoming:[1,0,0],
    target:[0,1,0],
    signedAngleHintDeg:90,
    targetPlaneNormal:[0,0,1]
  });
  assert.equal(settings.status,"exact");
  assert.equal(settings.angle,90);
  assert.equal(settings.plane,"XY");
  assert.ok(Math.abs(settings.rotation)<1e-9);
  near(replayLegacyDirection([1,0,0],settings),[0,1,0]);
});

test("A20: arbitrary spatial transition is reproduced by plane plus rotation",()=>{
  const incoming=[1,0,0];
  const axis=[0,Math.SQRT1_2,Math.SQRT1_2];
  const target=[0,Math.SQRT1_2,-Math.SQRT1_2];
  const settings=solveLegacyBendSettings({
    incoming,
    target,
    signedAngleHintDeg:-90,
    targetPlaneNormal:axis
  });
  assert.equal(settings.status,"exact");
  const rebuilt=replayLegacyDirection(incoming,settings);
  assert.ok(angleBetweenVectorsDeg(rebuilt,target)<1e-5);
});

test("A20: negative bend angle preserves the same outgoing direction with opposite effective-axis sign",()=>{
  const settings=solveLegacyBendSettings({
    incoming:[1,0,0],
    target:[0,1,0],
    signedAngleHintDeg:-90,
    targetPlaneNormal:[0,0,-1]
  });
  assert.equal(settings.status,"exact");
  assert.equal(settings.angle,-90);
  near(replayLegacyDirection([1,0,0],settings),[0,1,0]);
});

test("A20: canonical normal disagreement blocks row encoding instead of flipping silently",()=>{
  const result=solveLegacyBendSettings({
    incoming:[1,0,0],
    target:[0,1,0],
    signedAngleHintDeg:90,
    targetPlaneNormal:[0,0,-1]
  });
  assert.equal(result.status,"blocked");
  assert.match(result.reason,/orientation disagrees/i);
});

test("A20: 180-degree transition requires canonical plane normal",()=>{
  const unresolved=solveLegacyBendSettings({
    incoming:[1,0,0],
    target:[-1,0,0],
    signedAngleHintDeg:180
  });
  assert.equal(unresolved.status,"unresolved");
  assert.match(unresolved.reason,/requires canonical bend-plane normal/i);

  const exact=solveLegacyBendSettings({
    incoming:[1,0,0],
    target:[-1,0,0],
    signedAngleHintDeg:180,
    targetPlaneNormal:[0,0,1]
  });
  assert.equal(exact.status,"exact");
  assert.ok(angleBetweenVectorsDeg(
    replayLegacyDirection([1,0,0],exact),
    [-1,0,0]
  )<1e-5);
});

test("A20: effective XZ base uses minus Y exactly as live axisForPlane",()=>{
  near(effectiveLegacyBendAxis([1,0,0],"XZ",0),[0,-1,0]);
});
