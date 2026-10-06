import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const measurements=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 114: stale Section-derived dimensions are surfaced explicitly",()=>{
  assert.match(measurements,/Section-derived Reference Dimensions/);
  assert.match(measurements,/Stale размеры не перепривязываются автоматически/);
  assert.match(measurements,/data-section-rebind/);
});

test("question 114: rebind requires compatible current Section-derived measurement",()=>{
  assert.match(measurements,/function rebindSectionDerivedDimension\(dimensionId\)/);
  assert.match(measurements,/current\.section_derived!==true/);
  assert.match(measurements,/String\(current\.kind\)!==String\(existing\.kind\)/);
  assert.match(measurements,/sectionRebindCompatibility\(existing,current\)/);
});

test("question 114: rebind is explicit, undoable and restores Valid state",()=>{
  assert.match(measurements,/modelCommand\?api\(\)\.modelCommand\("Rebind Section-derived Reference Dimension"/);
  assert.match(measurements,/references:clone\(current\.references\)/);
  assert.match(measurements,/status:"Valid"/);
  assert.match(measurements,/rebound_from_stale:true/);
  assert.match(measurements,/delete next\.stale_reason/);
  assert.match(measurements,/section-derived-rebind/);
});
