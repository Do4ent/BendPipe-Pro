import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 154: current Dimension audit view exports view metadata",()=>{
  assert.match(ui,/function visibleDimensionAuditSnapshot\(\)/);
  assert.match(ui,/schema:"TubeBender\.DimensionAuditView\.v1"/);
  assert.match(ui,/filter:dimensionManagerFilter/);
  assert.match(ui,/sort:dimensionManagerSort/);
  assert.match(ui,/search:String\(dimensionManagerSearch\?\?""\)/);
});

test("question 154: Saved Dimensions can copy visible audit JSON",()=>{
  assert.match(ui,/async function copyVisibleDimensionAudits\(\)/);
  assert.match(ui,/JSON\.stringify\(visibleDimensionAuditSnapshot\(\),null,2\)/);
  assert.match(ui,/data-copy-visible-dimension-audits/);
  assert.match(ui,/Copy visible audit JSON/);
});
