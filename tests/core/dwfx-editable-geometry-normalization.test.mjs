import test from "node:test";
import assert from "node:assert/strict";

import {
  AXIS_PARALLEL_TOLERANCE_DEG,
  BEND_ANGLE_DECIMAL_PLACES,
  snapDirectionToPrincipalAxis,
  roundBendAngleToDecimals
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

test("A37: every imported bend angle rounds to two decimal places",()=>{
  assert.equal(BEND_ANGLE_DECIMAL_PLACES,2);

  for(const [source,expected] of [
    [90.00169482333327,90],
    [45.001394688684776,45],
    [14.999986319092592,15],
    [89.99990335689326,90],
    [3.036439962824889,3.04],
    [-3.036439962824889,-3.04]
  ]){
    const result=roundBendAngleToDecimals(source);
    assert.equal(result.decimal_places,2);
    assert.equal(result.editable_angle_deg,expected);
  }
});
