import test from "node:test";
import assert from "node:assert/strict";

import {
  AXIS_PARALLEL_TOLERANCE_DEG,
  BEND_ANGLE_INTEGER_TOLERANCE_DEG,
  snapDirectionToPrincipalAxis,
  roundBendAngleNearInteger
} from "../../src/import/dwfx/editable-geometry-normalization.mjs";

function dirFromAxisDeviationDeg(deg){
  const r=deg*Math.PI/180;
  return [Math.sin(r),Math.cos(r),0];
}

test("A37: world-axis recognition uses the agreed 0.25 degree tolerance",()=>{
  assert.equal(AXIS_PARALLEL_TOLERANCE_DEG,0.25);

  const source=snapDirectionToPrincipalAxis(
    dirFromAxisDeviationDeg(0.087853013)
  );
  assert.equal(source.status,"axis_parallel");
  assert.equal(source.parallel_axis,"+Y");
  assert.deepEqual(source.editable_direction,[0,1,0]);
  assert.equal(source.snapped,true);

  const genuine=snapDirectionToPrincipalAxis(
    dirFromAxisDeviationDeg(3.036350304)
  );
  assert.equal(genuine.status,"free_direction");
  assert.equal(genuine.parallel_axis,null);
  assert.ok(Math.abs(genuine.editable_direction[0]-dirFromAxisDeviationDeg(3.036350304)[0])<1e-12);
});

test("A37: bend-angle tolerance rounds numeric noise but preserves the real 3.03644 degree bend",()=>{
  assert.equal(BEND_ANGLE_INTEGER_TOLERANCE_DEG,0.01);

  for(const [source,expected] of [
    [90.00169482333327,90],
    [45.001394688684776,45],
    [14.999986319092592,15],
    [89.99990335689326,90]
  ]){
    const result=roundBendAngleNearInteger(source);
    assert.equal(result.rounded_to_integer,true);
    assert.equal(result.editable_angle_deg,expected);
  }

  const genuine=roundBendAngleNearInteger(3.036439962824889);
  assert.equal(genuine.rounded_to_integer,false);
  assert.equal(genuine.editable_angle_deg,3.036439962824889);
});
