import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const context=fs.readFileSync(path.join(root,"src","ui","object-selection-context-ui.js"),"utf8");
const tracking=fs.readFileSync(path.join(root,"src","ui","snap-tracking-runtime.js"),"utf8");
const snap=fs.readFileSync(path.join(root,"src","domain","snapping","snap-engine.mjs"),"utf8");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
const build=fs.readFileSync(path.join(root,"scripts","build-standalone.mjs"),"utf8");

test("question 110: ObjectContext merges Section-derived candidates into normal Snap flow",()=>{
  assert.match(context,/TubeBenderSectionView\?\.snapCandidatesAtEvent/);
  assert.match(context,/for\(const record of sectionCandidates\)/);
  assert.match(context,/add\(record\)/);
});

test("question 110: Snap Engine and Tracking expose SectionDerived as a first-class source",()=>{
  assert.match(snap,/SectionDerived:5/);
  assert.match(snap,/SectionDerived:true/);
  assert.match(tracking,/SectionDerived/);
  assert.match(tracking,/Section-derived/);
});

test("question 110: Quick Measure preserves SectionDerived geometry status and evidence",()=>{
  assert.match(measurements,/geometry_status:String\(candidate\?\.geometry_status/);
  assert.match(measurements,/evidence:clone\(candidate\?\.evidence/);
  assert.match(measurements,/quick\.points\.push\(\{point:pointValue,candidate:clone\(candidate\)\}\)/);
});

test("question 110: standalone bundles section-derived geometry URL",()=>{
  assert.match(build,/sectionDerivedDomainPath/);
  assert.match(build,/__TB_SECTION_DERIVED_MODULE_URL__/);
});
