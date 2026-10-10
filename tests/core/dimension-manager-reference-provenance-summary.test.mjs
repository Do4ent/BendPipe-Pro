import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 194: Saved Dimensions summary shows aggregate reference provenance totals",()=>{
  assert.match(ui,/const referenceSummary=Object\.entries\(auditSummary\.reference_geometry_counts\)/);
  assert.match(ui,/Refs '\+status\+'\: '\+count/);
  assert.match(ui,/referenceSummary\?' · '\+esc\(referenceSummary\)/);
});
