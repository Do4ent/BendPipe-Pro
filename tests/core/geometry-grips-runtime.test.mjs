import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","geometry-grips-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 97 geometry grips runtime is valid and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"geometry-grips-runtime.js"}));
  assert.ok(runtime.includes("TubeBenderGeometryGrips"));
  assert.ok(build.includes('data-tubebender-bundled="geometry-grips-runtime"'));
  assert.ok(build.includes("bundledGeometryGrips: true"));
});

test("question 97 whole tube exposes P1 P2 and main nodes",()=>{
  for(const token of [
    'kind:"tube-p1"',
    'label:"P1 / Origin"',
    'kind:"tube-p2"',
    'label:"P2"',
    'kind:"tube-node"'
  ]) assert.ok(runtime.includes(token),token);
});

test("question 97 LINE exposes start midpoint and end grips",()=>{
  for(const token of [
    'descriptorForSharedNode(g,selection.rowIndex,start,"LINE start","line-start")',
    'kind:"line-mid"',
    'label:"LINE midpoint / length"',
    'kind:"line-end"',
    'label:"LINE end / length"'
  ]) assert.ok(runtime.includes(token),token);
});

test("question 97 BEND exposes tangency nodes center CLR angle and plane grip",()=>{
  for(const token of [
    'descriptorForSharedNode(g,selection.rowIndex,start,"BEND tangency in","bend-tangent-in")',
    'kind:"bend-tangent-out"',
    'kind:"bend-center"',
    'kind:"bend-radius"',
    'kind:"bend-plane"',
    'edit:"bend-plane"'
  ]) assert.ok(runtime.includes(token),token);
});

test("question 97 ambiguous topology grips fail closed instead of guessing",()=>{
  assert.ok(runtime.includes("readOnly:!previous.edit"));
  assert.ok(runtime.includes("опорный grip; редактирование этой точки неоднозначно"));
  assert.ok(runtime.includes("Этот grip является опорным и не имеет однозначного локального изменения"));
});

test("question 97 Snap Ortho Polar are selected from grip semantics",()=>{
  assert.ok(runtime.includes('startCommand?.("geometry-grip"'));
  assert.ok(runtime.includes('ortho:handle.edit==="line-length"||handle.edit==="line-mid-length"'));
  assert.ok(runtime.includes('polar:String(handle.edit).startsWith("bend-")'));
  assert.ok(runtime.includes("currentCandidate"));
});

test("question 97 local rebuild changes only the targeted row scalar",()=>{
  assert.ok(runtime.includes("const index=Number(handle.targetRowIndex??selection.rowIndex)"));
  assert.ok(runtime.includes("row=rowFor(selection.tube,index)"));
  assert.ok(runtime.includes('handle.edit==="line-length"||handle.edit==="line-mid-length"'));
  assert.ok(runtime.includes('handle.edit==="bend-angle"'));
  assert.ok(runtime.includes('handle.edit==="bend-radius"'));
  assert.ok(runtime.includes('handle.edit==="bend-plane"'));
});

test("question 97 Driving Dimensions and constraint diagnostics are synchronized",()=>{
  assert.ok(runtime.includes("function drivingDimensionsFor"));
  assert.ok(runtime.includes('dim?.mode==="Driving"'));
  assert.ok(runtime.includes("dim.target_value=Number(patch.value)"));
  assert.ok(runtime.includes('dim.status="NeedsSolve"'));
  assert.ok(runtime.includes("eng()?.diagnoseTube?."));
  assert.ok(runtime.includes('"tubebender-dimension-change"'));
  assert.ok(runtime.includes('"tubebender-constraint-change"'));
});

test("question 97 exact formula input covers length angle CLR and plane rotation",()=>{
  assert.ok(runtime.includes('handle.edit==="bend-angle"||handle.edit==="bend-plane"?"angle":"length"'));
  assert.ok(runtime.includes("dynamicInput.evaluateNumericInput"));
  assert.ok(runtime.includes('handle.edit==="bend-plane"'));
});
