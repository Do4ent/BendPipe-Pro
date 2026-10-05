import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","tolerance-profile-runtime.js"),"utf8");
const snapRuntime=fs.readFileSync(path.join(root,"src","ui","snap-tracking-runtime.js"),"utf8");
const snapEngine=fs.readFileSync(path.join(root,"src","domain","snapping","snap-engine.mjs"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 85: tolerance profile runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"tolerance-profile-runtime.js"}));
  assert.match(runtime,/TubeBenderToleranceProfile/);
  assert.match(build,/data-tubebender-bundled="tolerance-profile-runtime"/);
  assert.match(build,/bundledToleranceProfileRuntime: true/);
});

test("question 85: UI exposes six model tolerances plus cursor capture radius",()=>{
  for(const key of [
    "point_tolerance_mm","linear_tolerance_mm","angular_tolerance_deg",
    "coplanar_tolerance_mm","circle_arc_fit_tolerance_mm","tangent_tolerance_deg",
    "cursor_capture_radius_px"
  ])assert.match(runtime,new RegExp(key));
  assert.match(runtime,/Cursor capture radius/);
  assert.match(runtime,/только экранный радиус в px/);
});

test("question 85: Snap Tracking consumes project profile instead of fixed ranking settings",()=>{
  assert.match(snapRuntime,/TubeBenderToleranceProfile/);
  assert.match(snapRuntime,/snapSettings\(\{through_snap:snapOptions\.through_snap\}\)/);
  assert.match(snapRuntime,/toleranceProfile\(\)\?\.linear_tolerance_mm/);
  assert.match(snapRuntime,/tubebender-tolerance-change/);
});

test("question 85: Snap engine stores Exact Fitted provenance and cursor alias",()=>{
  assert.match(snapEngine,/cursor_capture_radius_px/);
  assert.match(snapEngine,/geometry_status/);
  assert.match(snapEngine,/fitting_error/);
  assert.match(snapEngine,/evidence/);
  assert.match(snapEngine,/candidate\.screen_distance_px>settings\.cursor_radius_px/);
});
