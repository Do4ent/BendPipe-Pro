import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const runtime=fs.readFileSync(path.join(root,"src","ui","section-view-runtime.js"),"utf8");
const namedViews=fs.readFileSync(path.join(root,"src","ui","named-views-runtime.js"),"utf8");
const namedViewsDomain=fs.readFileSync(path.join(root,"src","domain","project","named-views.mjs"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 109: Section View runtime is valid classic JavaScript and bundled",()=>{
  assert.doesNotThrow(()=>new vm.Script(runtime,{filename:"section-view-runtime.js"}));
  assert.match(runtime,/TubeBenderSectionView/);
  assert.match(build,/data-tubebender-bundled="section-view-runtime"/);
  assert.match(build,/__TB_SECTION_VIEW_MODULE_URL__/);
});

test("question 109: Section Plane and Section Box use renderer clipping only",()=>{
  assert.match(runtime,/renderer\.localClippingEnabled=true/);
  assert.match(runtime,/renderer\.clippingPlanes/);
  assert.match(runtime,/new THREE\.Plane/);
  assert.match(runtime,/function boxToPlanes\(/);
  assert.match(runtime,/setSectionPlane/);
  assert.match(runtime,/setSectionBox/);
  assert.doesNotMatch(runtime,/tube\.rows\s*=/);
  assert.doesNotMatch(runtime,/editable_mesh_instances\s*=/);
});

test("question 109: helper geometry is marked helper and is removable",()=>{
  assert.match(runtime,/sectionHelper:true/);
  assert.match(runtime,/function clearHelper\(/);
  assert.match(runtime,/Box3Helper/);
  assert.match(runtime,/PlaneGeometry/);
});

test("question 109: UI exposes both Section Plane and Section Box plus flip and off",()=>{
  assert.match(runtime,/Section Plane/);
  assert.match(runtime,/Section Box/);
  assert.match(runtime,/data-sec-flip/);
  assert.match(runtime,/data-sec-off/);
  assert.match(runtime,/data-sec-helper/);
});

test("question 109: Named Views persist and restore Section View state",()=>{
  assert.match(namedViews,/section_view:clone\(window\.TubeBenderSectionView/);
  assert.match(namedViews,/TubeBenderSectionView\?\.restore/);
  assert.match(namedViewsDomain,/section_view:/);
});


test("question 110: Section-derived Snap candidates are explicitly marked virtual and SectionDerived",()=>{
  assert.match(runtime,/snapCandidatesAtEvent/);
  assert.match(runtime,/source:"SectionDerived"/);
  assert.match(runtime,/virtual:true/);
  assert.match(runtime,/geometry_status:"SectionDerived"/);
  assert.match(runtime,/section_derived:true/);
  assert.match(runtime,/Section-derived /);
});

test("question 110: Section-derived candidates are built from triangle intersections near cursor",()=>{
  assert.match(runtime,/triangleFromHit/);
  assert.match(runtime,/sectionSegmentsFromTriangles/);
  assert.match(runtime,/raycaster\.intersectObjects/);
  assert.match(runtime,/Endpoint/);
  assert.match(runtime,/Midpoint/);
  assert.match(runtime,/LineAxis/);
});
