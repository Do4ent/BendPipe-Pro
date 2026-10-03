import test from "node:test";
import assert from "node:assert/strict";
import {
  formatMeasurement,
  measureAngleBetweenLines,
  measureArc,
  measureCentralAngle,
  measureLinePlaneAngle,
  measureLineToLine,
  measureObjectRotation,
  measureParallelPlanes,
  measurePlanePlaneAngle,
  measurePointToLine,
  measurePointToPlane,
  measurePointToPoint,
  measurePolyline,
  measureSegment,
  measureTangentAngle,
  measureThreePointAngle,
  projectPointToPlane,
  projectVector,
  projectVectorToPlane
} from "../../src/domain/measurements/geometry-measurements.mjs";

const X={x:1,y:0,z:0},Y={x:0,y:1,z:0},Z={x:0,y:0,z:1};

test("point to point reports true 3D length and XYZ deltas",()=>{
  const m=measurePointToPoint({x:1,y:2,z:3},{x:4,y:6,z:15});
  assert.equal(m.delta_mm.x,3);
  assert.equal(m.delta_mm.y,4);
  assert.equal(m.delta_mm.z,12);
  assert.equal(m.length_mm,13);
});

test("segment and polyline lengths are exact sums",()=>{
  assert.equal(measureSegment({start:{x:0,y:0,z:0},end:{x:3,y:4,z:0}}).length_mm,5);
  const p=measurePolyline([{x:0,y:0,z:0},{x:3,y:4,z:0},{x:3,y:4,z:12}]);
  assert.equal(p.length_mm,17);
  assert.deepEqual(Array.from(p.segment_lengths_mm),[5,12]);
});

test("arc reports radius diameter arc and chord lengths",()=>{
  const m=measureArc({radius_mm:50,sweep_deg:90});
  assert.equal(m.radius_mm,50);
  assert.equal(m.diameter_mm,100);
  assert.ok(Math.abs(m.arc_length_mm-25*Math.PI)<1e-12);
  assert.ok(Math.abs(m.chord_length_mm-50*Math.sqrt(2))<1e-12);
});

test("point-line and point-plane return shortest 3D distances",()=>{
  const l=measurePointToLine({x:4,y:3,z:0},{point:{x:0,y:0,z:0},direction:X});
  assert.equal(l.distance_mm,3);
  assert.deepEqual(l.closest_point,{x:4,y:0,z:0});

  const p=measurePointToPlane({x:2,y:3,z:7},{point:{x:0,y:0,z:2},normal:Z});
  assert.equal(p.distance_mm,5);
  assert.equal(p.signed_distance_mm,5);
  assert.deepEqual(p.closest_point,{x:2,y:3,z:2});
});

test("parallel plane distance is independent of point position inside each plane",()=>{
  const m=measureParallelPlanes(
    {point:{x:10,y:20,z:2},normal:Z},
    {point:{x:-8,y:7,z:12},normal:{x:0,y:0,z:-1}}
  );
  assert.equal(m.distance_mm,10);
});

test("skew line distance uses closest points in 3D",()=>{
  const m=measureLineToLine(
    {point:{x:0,y:0,z:0},direction:X},
    {point:{x:0,y:5,z:2},direction:Z}
  );
  assert.equal(m.distance_mm,5);
  assert.deepEqual(m.closest_point_a,{x:0,y:0,z:0});
  assert.deepEqual(m.closest_point_b,{x:0,y:5,z:0});
});

test("axis and plane projections preserve signed scalar where applicable",()=>{
  const axis=projectVector({x:3,y:-4,z:12},Y);
  assert.equal(axis.scalar_mm,-4);
  assert.equal(axis.length_mm,4);

  const point=projectPointToPlane({x:1,y:2,z:9},{point:{x:0,y:0,z:4},normal:Z});
  assert.deepEqual(point.point,{x:1,y:2,z:4});

  const vector=projectVectorToPlane({x:3,y:4,z:12},Z);
  assert.deepEqual(vector.vector,{x:3,y:4,z:0});
  assert.equal(vector.length_mm,5);
});

test("line angle supports acute unsigned and oriented 0-360 modes",()=>{
  const a={point:{x:0,y:0,z:0},direction:X};
  const b={point:{x:0,y:0,z:0},direction:{x:-1,y:1,z:0}};
  assert.equal(measureAngleBetweenLines(a,b,{mode:"acute"}).angle_deg,45);
  assert.equal(measureAngleBetweenLines(a,b,{mode:"unsigned"}).angle_deg,135);
  assert.equal(measureAngleBetweenLines(
    a,
    {point:{x:0,y:0,z:0},direction:{x:0,y:-1,z:0}},
    {mode:"oriented",normal:Z}
  ).angle_deg,270);
});

test("three point and central angles share exact vertex geometry",()=>{
  const m=measureThreePointAngle({x:1,y:0,z:0},{x:0,y:0,z:0},{x:0,y:1,z:0});
  assert.equal(m.angle_deg,90);
  assert.equal(measureCentralAngle({x:0,y:0,z:0},{x:1,y:0,z:0},{x:0,y:1,z:0}).angle_deg,90);
});

test("line-plane and plane-plane angle semantics are geometric",()=>{
  assert.equal(measureLinePlaneAngle(
    {point:{x:0,y:0,z:0},direction:X},
    {point:{x:0,y:0,z:0},normal:Z}
  ).angle_deg,0);
  assert.equal(measureLinePlaneAngle(
    {point:{x:0,y:0,z:0},direction:Z},
    {point:{x:0,y:0,z:0},normal:Z}
  ).angle_deg,90);

  const planes=measurePlanePlaneAngle(
    {point:{x:0,y:0,z:0},normal:Z},
    {point:{x:0,y:0,z:0},normal:Y}
  );
  assert.equal(planes.angle_deg,90);
});

test("tangent angle is a dedicated semantic result",()=>{
  const m=measureTangentAngle(X,Y);
  assert.equal(m.kind,"tangent-angle");
  assert.equal(m.angle_deg,90);
});

test("object rotation compares orthonormal source and current frames",()=>{
  const m=measureObjectRotation({
    source_axes:[X,Y],
    current_axes:[Y,{x:-1,y:0,z:0}]
  });
  assert.ok(Math.abs(m.angle_deg-90)<1e-9);
});

test("measurement formatting keeps display precision separate from internal value",()=>{
  const v=1/3;
  assert.equal(formatMeasurement(v,{decimals:3,trailingZeros:true,suffix:" mm"}),"0.333 mm");
  assert.equal(formatMeasurement(12,{decimals:3,trailingZeros:false,suffix:"°"}),"12°");
  assert.equal(v,1/3);
});

test("degenerate inputs are rejected instead of returning plausible values",()=>{
  assert.throws(()=>measurePointToLine(
    {x:0,y:0,z:0},
    {point:{x:0,y:0,z:0},direction:{x:0,y:0,z:0}}
  ),/non-zero/);
  assert.throws(()=>measureParallelPlanes(
    {point:{x:0,y:0,z:0},normal:Z},
    {point:{x:0,y:0,z:0},normal:Y}
  ),/not parallel/);
  assert.throws(()=>measureArc({radius_mm:0,sweep_deg:90}),/> 0/);
});
