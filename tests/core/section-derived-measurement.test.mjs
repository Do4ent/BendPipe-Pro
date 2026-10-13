import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const section=fs.readFileSync(path.join(root,"src","ui","section-view-runtime.js"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 112: selected Section-derived contours receive a dedicated 3D overlay",()=>{
  assert.match(section,/tbSectionDerivedSelectionOverlay/);
  assert.match(section,/function renderSelectionOverlay\(entries=null\)/);
  assert.match(section,/entry\?\.kind==="section-derived"/);
  assert.match(section,/sectionDerivedSelection:true/);
  assert.match(section,/tubebender-selection-change/);
});

test("question 112: one selected Section-derived segment measures length with snapshot provenance",()=>{
  assert.match(measurements,/sectionDerivedRecord\(entry\)/);
  assert.match(measurements,/kind:"section-segment-length"/);
  assert.match(measurements,/geometry_status:"SectionDerived"/);
  assert.match(measurements,/section_snapshot:clone/);
  assert.match(measurements,/source_geometry:record\?\.source_geometry/);
});

test("question 112: two Section-derived segments measure angle",()=>{
  assert.match(measurements,/entries\.length===2&&entries\.every\(entry=>entry\.kind==="section-derived"\)/);
  assert.match(measurements,/kind:"section-segment-angle"/);
  assert.match(measurements,/measureAngleBetweenLines/);
});

test("question 112: Section-derived measurements cannot become Driving Dimensions",()=>{
  assert.match(measurements,/geometry_status==="SectionDerived"/);
  assert.match(measurements,/Section-derived geometry поддерживает только Reference Dimension/);
});
