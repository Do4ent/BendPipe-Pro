import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtimePath=path.join(root,"src","ui","snap-tracking-runtime.js");
const code=fs.readFileSync(runtimePath,"utf8");

test("Object Snap Tracking runtime remains valid classic JavaScript",()=>{
  assert.doesNotThrow(()=>new vm.Script(code,{filename:"snap-tracking-runtime.js"}));
  assert.match(code,/__TB_SNAP_ENGINE_MODULE_URL__/);
  assert.match(code,/TubeBenderSnapTracking/);
});

test("hover acquisition is temporary and supports explicit pin plus command cleanup",()=>{
  assert.match(code,/HOVER_ACQUIRE_MS=450/);
  assert.match(code,/REFERENCE_TTL_MS=5000/);
  assert.match(code,/scheduleHoverAcquire/);
  assert.match(code,/setTimeout/);
  assert.match(code,/pinned===true/);
  assert.match(code,/event\.key==="p"\|\|event\.key==="P"/);
  assert.match(code,/function endCommand\(\)/);
  assert.match(code,/acquired=\[\]/);
});

test("tracking uses Ortho and Polar rays plus virtual intersections",()=>{
  assert.match(code,/modes=\{ortho:true,polar:false,polar_increment_deg:15\}/);
  assert.match(code,/createObjectSnapTrackingRay/);
  assert.match(code,/objectSnapTrackingCandidate/);
  assert.match(code,/intersectObjectSnapTrackingRays/);
  assert.match(code,/name:"Polar"/);
  assert.match(code,/"Tracking "\+direction\.name/);
  assert.match(code,/snapTrackingGuide:true/);
});

test("Tab and Shift Tab cycle visible snap candidates without stealing text navigation",()=>{
  assert.match(code,/isTextTarget\(event\.target\)/);
  assert.match(code,/event\.key==="Tab"/);
  assert.match(code,/cycle\(event\.shiftKey\?-1:1\)/);
  assert.match(code,/event\.preventDefault\(\)/);
  assert.match(code,/Tab \/ Shift\+Tab/);
});

test("runtime consumes exact hover candidates exposed by the 3D object context",()=>{
  assert.match(code,/context\(\)\?\.snapCandidatesAtEvent\?\.\(event\)/);
  assert.match(code,/currentCandidate/);
  assert.match(code,/tubebender-snap-change/);
});
