import test from "node:test";
import assert from "node:assert/strict";
import {
  geometryCorrectionReport,
  isFittedGeometry,
  createExactNormalizedGeometry,
  normalizedGeometryComparison
} from "../../src/domain/geometry/normalize-fitted-geometry.mjs";
import { assessFittedGeometryUsage } from "../../src/domain/geometry/fitted-geometry-policy.mjs";

test("question 87: normalization creates a new Exact result and preserves Fitted source",()=>{
  const fitted={
    id:"fit-1",
    geometry_status:"Fitted",
    origin:{x:0,y:0,z:0},
    rows:[{type:"LINE",L:100.04}],
    fitting_error:{mm:.04,deg:0},
    evidence:[{source:"mesh"}]
  };
  const before=structuredClone(fitted);
  const exact={...structuredClone(fitted),id:"exact-1",rows:[{type:"LINE",L:100}]};
  const result=createExactNormalizedGeometry({
    fitted_geometry:fitted,
    exact_geometry:exact,
    source_chain:[{kind:"source_file",value:"part.dwfx"}],
    fitted_object_id:fitted.id,
    source_object_id:"source-node"
  });
  assert.deepEqual(fitted,before);
  assert.equal(result.status,"Exact");
  assert.equal(result.exact_geometry.geometry_status,"Exact");
  assert.equal(result.exact_geometry.fitted,false);
  assert.equal(result.provenance.operation,"FittedToExact");
  assert.equal(result.provenance.source_preserved,true);
  assert.equal(result.provenance.fitted_preserved,true);
  assert.deepEqual(result.provenance.fitted_snapshot,before);
  assert.equal(result.correction.changed_numeric_fields,1);
  assert.ok(Math.abs(result.correction.max_abs_correction-.04)<1e-9);
});

test("question 87: correction report stores per-field before after and delta",()=>{
  const fitted={geometry_status:"Fitted",point:{x:1,y:2,z:3},angle:44.96};
  const exact={geometry_status:"Exact",point:{x:1,y:2.1,z:3},angle:45};
  const report=geometryCorrectionReport(fitted,exact);
  assert.equal(report.changed_numeric_fields,2);
  const paths=new Set(report.deltas.map(item=>item.path));
  assert.ok(paths.has("point.y"));
  assert.ok(paths.has("angle"));
  assert.ok(report.max_abs_correction>=.099999999);
  assert.ok(report.rms_correction>0);
});

test("question 87: normalized Exact geometry no longer triggers Fitted driving warning",()=>{
  const fitted={geometry_status:"Fitted",value:9.98,fitting_error:{mm:.02,deg:0},confidence:.9};
  const normalized=createExactNormalizedGeometry({
    fitted_geometry:fitted,
    exact_geometry:{geometry_status:"Exact",value:10}
  }).exact_geometry;
  assert.equal(isFittedGeometry(normalized),true,"provenance intentionally contains Fitted snapshot");
  const usage=assessFittedGeometryUsage(normalized,"GeometricConstraint");
  assert.equal(usage.has_fitted_geometry,false);
  assert.equal(usage.requires_confirmation,false);
  assert.equal(usage.allowed,true);
});

test("question 87: comparison can be reconstructed from immutable Fitted snapshot",()=>{
  const fitted={geometry_status:"Fitted",radius_mm:49.94};
  const normalized=createExactNormalizedGeometry({
    fitted_geometry:fitted,
    exact_geometry:{geometry_status:"Exact",radius_mm:50}
  });
  const comparison=normalizedGeometryComparison(normalized);
  assert.equal(comparison.changed_numeric_fields,1);
  assert.ok(Math.abs(comparison.max_abs_correction-.06)<1e-9);
});

test("question 87: non-Fitted source is rejected",()=>{
  assert.throws(()=>createExactNormalizedGeometry({
    fitted_geometry:{geometry_status:"Exact",value:1},
    exact_geometry:{geometry_status:"Exact",value:1}
  }),/requires Fitted/);
});
