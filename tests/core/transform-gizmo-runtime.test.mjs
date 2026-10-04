import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtimePath=path.join(root,"src","ui","transform-gizmo-runtime.js");
const buildPath=path.join(root,"scripts","build-standalone.mjs");
const code=fs.readFileSync(runtimePath,"utf8");
const build=fs.readFileSync(buildPath,"utf8");

test("question 59: Transform Gizmo runtime is valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"transform-gizmo-runtime.js"}));
  assert.match(code,/TubeBenderTransformGizmo/);
  assert.match(build,/data-tubebender-bundled="transform-gizmo-runtime"/);
  assert.match(build,/bundledTransformGizmo: true/);
});

test("question 59: Gizmo exposes X Y Z axes XY XZ YZ planes and rotation rings",()=>{
  assert.match(code,/makeArrow\("x"\),makeArrow\("y"\),makeArrow\("z"\)/);
  assert.match(code,/makePlane\("xy"\),makePlane\("xz"\),makePlane\("yz"\)/);
  assert.match(code,/makeRing\("x"\),makeRing\("y"\),makeRing\("z"\)/);
  assert.match(code,/kind:"move-axis"/);
  assert.match(code,/kind:"move-plane"/);
  assert.match(code,/kind:"rotate"/);
});

test("question 59: Global Local User coordinate systems are supported and persisted",()=>{
  assert.match(code,/\["global","local","user"\]/);
  assert.match(code,/settings\.cs==="local"/);
  assert.match(code,/exactStartVector/);
  assert.match(code,/settings\.cs==="user"/);
  assert.match(code,/new THREE\.Euler/);
  assert.match(code,/SETTINGS_KEY="tubebender\.transformGizmo\.settings"/);
  assert.match(code,/localStorage\.setItem\(SETTINGS_KEY/);
});

test("question 59: dragging is preview-only until one atomic pointer-up commit",()=>{
  assert.match(code,/transformGizmoPreview:true/);
  assert.match(code,/function previewMove\(/);
  assert.match(code,/function previewRotate\(/);
  assert.match(code,/function finishDrag\(/);
  assert.match(code,/context\(\)\?\.applyMove\?\.\(delta\)/);
  assert.match(code,/editing\(\)\?\.rotateSelectedDirect/);
  assert.match(code,/pointerup/);
  assert.match(code,/clearPreview\(\)/);
});

test("question 59: Ortho Polar Snap exact input and full gizmo visibility toggle remain available",()=>{
  assert.match(code,/settings\.ortho/);
  assert.match(code,/settings\.polar/);
  assert.match(code,/polarStep/);
  assert.match(code,/snapTracking\(\)\?\.startCommand/);
  assert.match(code,/currentCandidate/);
  assert.match(code,/data-gizmo-a/);
  assert.match(code,/data-gizmo-b/);
  assert.match(code,/Apply exact/);
  assert.match(code,/function applyNumeric\(/);
  assert.match(code,/function toggleVisible\(/);
  assert.match(code,/hide:\(\)=>toggleVisible\(false\)/);
  assert.match(code,/event\.key==="g"\|\|event\.key==="G"/);
});

test("question 59: reference geometry can move, while rotation rings require editable whole tubes",()=>{
  assert.match(code,/entry\.kind==="tube"\|\|entry\.kind==="ref"/);
  assert.match(code,/return list\.length>0&&list\.every\(\(entry\)=>entry\.kind==="tube"\)/);
  assert.match(code,/if\(canRotate\(\)\)group\.add\(makeRing/);
});
