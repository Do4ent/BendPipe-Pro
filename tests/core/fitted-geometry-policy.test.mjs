import test from "node:test";
import assert from "node:assert/strict";
import {
  FITTED_USAGE,
  assessFittedGeometryUsage,
  confirmFittedGeometryUsage,
  collectGeometryEvidence,
  fittedGeometryEvidence,
  hasFittedGeometry
} from "../../src/domain/geometry/fitted-geometry-policy.mjs";

const fitted={
  geometry_status:"Fitted",
  fitting_error:{mm:.035,deg:0},
  confidence:.82,
  evidence:[{source:"mesh-fit"}]
};
const exact={geometry_status:"Exact",fitting_error:{mm:0,deg:0},confidence:1};

test("question 86: safe Fitted uses stay allowed without confirmation",()=>{
  for(const usage of [
    FITTED_USAGE.Snap,
    FITTED_USAGE.Measurement,
    FITTED_USAGE.Construction,
    FITTED_USAGE.ReferenceDimension
  ]){
    const result=assessFittedGeometryUsage([fitted],usage);
    assert.equal(result.has_fitted_geometry,true,usage);
    assert.equal(result.requires_confirmation,false,usage);
    assert.equal(result.allowed,true,usage);
  }
});

test("question 86: driving uses require explicit confirmation",()=>{
  for(const usage of [
    FITTED_USAGE.DrivingDimension,
    FITTED_USAGE.GeometricConstraint,
    FITTED_USAGE.TubeFixation,
    FITTED_USAGE.ArrayAxis,
    FITTED_USAGE.TechnologyCalculation
  ]){
    const result=assessFittedGeometryUsage([fitted],usage);
    assert.equal(result.requires_confirmation,true,usage);
    assert.equal(result.allowed,false,usage);
    assert.match(result.warning,/Fitted/);
    assert.equal(confirmFittedGeometryUsage([fitted],usage,{confirmed:false}).allowed,false);
    assert.equal(confirmFittedGeometryUsage([fitted],usage,{confirmed:true}).allowed,true);
  }
});

test("question 86: Exact geometry never asks for Fitted confirmation",()=>{
  const result=assessFittedGeometryUsage([exact],FITTED_USAGE.GeometricConstraint);
  assert.equal(result.has_fitted_geometry,false);
  assert.equal(result.requires_confirmation,false);
  assert.equal(result.allowed,true);
});

test("question 86: nested provenance is discovered without promotion to Exact",()=>{
  const wrapped={reference:{metadata:{primitive:fitted}}};
  const all=collectGeometryEvidence(wrapped);
  assert.equal(all.length,1);
  assert.equal(all[0].geometry_status,"Fitted");
  assert.equal(fittedGeometryEvidence(wrapped).length,1);
  assert.equal(hasFittedGeometry(wrapped),true);
});
