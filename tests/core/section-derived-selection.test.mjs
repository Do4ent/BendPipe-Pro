import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const section=fs.readFileSync(path.join(root,"src","ui","section-view-runtime.js"),"utf8");
const selection=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const properties=fs.readFileSync(path.join(root,"src","ui","properties-panel-runtime.js"),"utf8");

test("question 111: Section-derived contours expose selectable virtual records",()=>{
  assert.match(section,/derivedSelectionRegistry=new Map\(\)/);
  assert.match(section,/function selectionCandidatesAtEvent\(event,\{thresholdPx=10\}=\{\}\)/);
  assert.match(section,/kind:"section-derived",virtual:true,readonly:true/);
  assert.match(section,/function derivedSelectionById\(id\)/);
  assert.match(section,/selectionCandidatesAtEvent,derivedSelectionById/);
});

test("question 111: object selection treats Section-derived geometry as read-only first-class selection",()=>{
  assert.match(selection,/sectionDerived:"section-derived:"/);
  assert.match(selection,/kind:"section-derived",derivedId:/);
  assert.match(selection,/TubeBenderSectionView\?\.selectionCandidatesAtEvent/);
  assert.match(selection,/title:"Section-derived Geometry",edit:false,transform:false,visibility:false,properties:true,delete:false/);
  assert.match(selection,/Section-derived geometry является виртуальной производной геометрией/);
});

test("question 111: Properties exposes Section-derived provenance and segment coordinates",()=>{
  assert.match(properties,/entry\.kind==="section-derived"/);
  assert.match(properties,/Section-derived Geometry/);
  assert.match(properties,/\["Section mode",record\?\.section_mode\]/);
  assert.match(properties,/\["Source geometry",record\?\.source_geometry\]/);
  assert.match(properties,/\["Start",record\?\.segment\?\.start\]/);
  assert.match(properties,/\["Midpoint",record\?\.segment\?\.midpoint\]/);
  assert.match(properties,/\["End",record\?\.segment\?\.end\]/);
  assert.match(properties,/\["Persistent object",false\]/);
});
