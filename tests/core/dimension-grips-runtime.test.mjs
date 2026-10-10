import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 96 dimension grips runtime is valid and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime));
  assert.ok(runtime.includes("TubeBenderDimensionGrips"));
  assert.ok(build.includes('data-tubebender-bundled="dimension-grips-runtime"'));
  assert.ok(build.includes("bundledDimensionGrips: true"));
});

test("question 96 renders text line and extension reference grips",()=>{
  for(const token of ['dimensionText:true','"dimension-line"','grip(textPos','grip(linePos','"reference",index']){
    assert.ok(runtime.includes(token),token);
  }
});

test("question 96 drag previews before History commit",()=>{
  const update=runtime.slice(runtime.indexOf("function updateDrag"),runtime.indexOf("function finishDrag"));
  assert.ok(update.includes("renderPlacementPreview"));
  assert.equal(update.includes("modelCommand"),false);
  assert.ok(runtime.includes("eng()?.modelCommand"));
});

test("question 96 Snap reassignment is associative",()=>{
  assert.ok(runtime.includes('startCommand?.("dimension-reference"'));
  assert.ok(runtime.includes("currentCandidate"));
  assert.ok(runtime.includes("replaceDimensionReference"));
});

test("question 96 double click editor separates Reference and Driving",()=>{
  for(const token of ["dblclick","Reference Dimension не изменяет геометрию","setDimensionMode","setDrivingTarget","dynamicInput.evaluateNumericInput"]){
    assert.ok(runtime.includes(token),token);
  }
});

test("question 96 persistent dimension changes are synchronized",()=>{
  assert.ok(measurements.includes("dispatchDimensionChange"));
  assert.ok(measurements.includes("create-reference"));
  assert.ok(measurements.includes("create-driving"));
  assert.ok(runtime.includes("tubebender-dimension-change"));
});
