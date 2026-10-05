import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const screen=fs.readFileSync(path.join(root,"src","ui","screen-space-display-runtime.js"),"utf8");
const geometry=fs.readFileSync(path.join(root,"src","ui","geometry-grips-runtime.js"),"utf8");
const arrays=fs.readFileSync(path.join(root,"src","ui","array-grips-runtime.js"),"utf8");
const dimensions=fs.readFileSync(path.join(root,"src","ui","dimension-grips-runtime.js"),"utf8");
const snap=fs.readFileSync(path.join(root,"src","ui","snap-tracking-runtime.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 99 screen-space runtime is valid and bundled before grip runtimes",()=>{
  assert.doesNotThrow(()=>new vm.Script(screen,{filename:"screen-space-display-runtime.js"}));
  assert.ok(screen.includes("TubeBenderScreenSpace"));
  assert.ok(build.includes('data-tubebender-bundled="screen-space-display-runtime"'));
  assert.ok(build.includes("bundledScreenSpaceDisplay: true"));
  const screenIndex=build.indexOf("bundledScreenSpaceDisplayRuntime +");
  const dimensionIndex=build.indexOf("bundledDimensionGripsRuntime +");
  const snapIndex=build.indexOf("bundledSnapTrackingRuntime +");
  const geometryIndex=build.indexOf("bundledGeometryGripsRuntime +");
  assert.ok(screenIndex>=0&&screenIndex<dimensionIndex);
  assert.ok(screenIndex<snapIndex);
  assert.ok(screenIndex<geometryIndex);
});

test("question 99 uses exact screen-space scaling for perspective and orthographic cameras",()=>{
  assert.ok(screen.includes("function worldUnitsPerPixel"));
  assert.ok(screen.includes("camera.isOrthographicCamera"));
  assert.ok(screen.includes("camera.position.distanceTo(world)"));
  assert.ok(screen.includes("Math.tan(fov/2)"));
  assert.ok(screen.includes("span/height"));
});

test("question 99 registered markers update continuously during zoom and orbit",()=>{
  assert.ok(screen.includes("const registry=new Set()"));
  assert.ok(screen.includes("function updateObject"));
  assert.ok(screen.includes("requestAnimationFrame(tick)"));
  assert.ok(screen.includes("object.scale.setScalar(factor)"));
  assert.ok(screen.includes('meta.mode==="sprite"'));
});

test("question 99 marker sizes are user configurable in pixels",()=>{
  for(const token of [
    "grip_px","array_grip_px","snap_px","constraint_px",
    "dimension_grip_px","dimension_text_px","data-marker-setting",
    "tubebender.screenSpaceMarkers.v1"
  ]) assert.ok(screen.includes(token),token);
});

test("question 99 geometry array and dimension grips use shared screen-space policy",()=>{
  assert.ok(geometry.includes('screenSpace().register(mesh,"grip",base)'));
  assert.ok(arrays.includes('screenSpace().register(mesh,"array",base)'));
  assert.ok(dimensions.includes('screenSpace().register(mesh,"dimension",base)'));
});

test("question 99 dimension text preserves aspect ratio at constant screen size",()=>{
  assert.ok(dimensions.includes('"dimension-text",1,{mode:"sprite",aspect:made.aspect}'));
  assert.ok(screen.includes("factor*meta.aspect"));
});

test("question 99 Snap markers stay constant while current candidate remains emphasized",()=>{
  assert.ok(snap.includes('screenSpace()?.register?.(marker,"snap",pointRadius'));
  assert.ok(snap.includes('screenSpace()?.register?.(marker,"snap",radius'));
  assert.ok(snap.includes("multiplier:isCurrent?1.45"));
  assert.ok(screen.includes("meta.multiplier"));
});

test("question 99 Constraints receive constant-size 3D markers",()=>{
  assert.ok(screen.includes('group.name="Constraint Markers"'));
  assert.ok(screen.includes("constraintMarker:true"));
  assert.ok(screen.includes('register(marker,"constraint",1)'));
  assert.ok(screen.includes('"tubebender-constraint-change"'));
});
