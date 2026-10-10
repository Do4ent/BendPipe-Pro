import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","fitted-geometry-runtime.js"),"utf8");
const constraints=fs.readFileSync(path.join(root,"src","ui","constraints-runtime.js"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const editing=fs.readFileSync(path.join(root,"src","ui","editing-ui.js"),"utf8");
const equipment=fs.readFileSync(path.join(root,"src","ui","equipment-runtime-bridge.js"),"utf8");
const dimensions=fs.readFileSync(path.join(root,"src","domain","measurements","dimensions.mjs"),"utf8");
const geometricConstraints=fs.readFileSync(path.join(root,"src","domain","constraints","geometric-constraints.mjs"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 86: fitted geometry runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"fitted-geometry-runtime.js"}));
  assert.match(runtime,/TubeBenderFittedGeometry/);
  assert.match(build,/data-tubebender-bundled="fitted-geometry-runtime"/);
  assert.match(build,/bundledFittedGeometryRuntime: true/);
});

test("question 86: manual Constraints and Auto-Constrain preview protect Fitted drivers",()=>{
  assert.match(constraints,/confirmUsage\?\.\("GeometricConstraint",refs\)/);
  assert.match(constraints,/warningHtml\?\.\("GeometricConstraint"/);
  assert.match(constraints,/preview_confirmed:true/);
  assert.match(constraints,/geometry_status:String\(candidate\?\.geometry_status/);
});

test("question 86: Reference Dimension remains direct while Driving Dimension confirms",()=>{
  const refStart=measurements.indexOf("function saveCurrentDimension");
  const drivingStart=measurements.indexOf("function saveCurrentDrivingDimension");
  assert.ok(refStart>=0&&drivingStart>refStart);
  const referenceBlock=measurements.slice(refStart,drivingStart);
  const drivingBlock=measurements.slice(drivingStart,measurements.indexOf("\n  function render()",drivingStart));
  assert.doesNotMatch(referenceBlock,/confirmUsage/);
  assert.match(referenceBlock,/mode:"Reference"/);
  assert.match(drivingBlock,/confirmUsage\?\.\("DrivingDimension"/);
  assert.match(drivingBlock,/mode:"Driving"/);
});

test("question 86: tube fixation asks only when fixing, not when releasing",()=>{
  assert.match(selection,/if\(makeFixed&&fittedApi\(\)\?\.confirmUsage\?\.\("TubeFixation",selectedEnd\.tube\)!==true\)return false/);
});

test("question 86: Array axis is routed through the policy and explicit UI axis is Exact",()=>{
  assert.match(editing,/confirmUsage\?\.\("ArrayAxis",axisEvidence\)/);
  assert.match(editing,/geometry_status:"Exact"/);
  assert.match(editing,/axis_source:"Explicit UI axis \/ direction"/);
});

test("question 86: technology output uses one common Fitted confirmation guard",()=>{
  assert.match(equipment,/technologyGeometryAssessment/);
  assert.match(equipment,/confirmTechnologyCalculation/);
  assert.match(equipment,/confirmUsage\("TechnologyCalculation"/);
  assert.match(build,/confirmTechnologyCalculation\?\.\(t\)!==true/);
  const generatedGeneric=build.match(/"function genericNc\(t=activeTube\(\),format='YBC'\).*?";/s)?.[0]??"";
  assert.doesNotMatch(generatedGeneric,/confirmTechnologyCalculation/);
});

test("question 86: persistent Dimension and Constraint references keep provenance",()=>{
  for(const code of [dimensions,geometricConstraints]){
    assert.match(code,/geometry_status/);
    assert.match(code,/fitting_error/);
    assert.match(code,/confidence/);
    assert.match(code,/evidence/);
  }
});
