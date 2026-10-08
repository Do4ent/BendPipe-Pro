import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");
test("question 144: project-wide Dimension audit snapshot has stable schema",()=>{
  const fn=ui.match(/function allDimensionAuditSnapshot\(\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(fn,/schema:"TubeBender\.DimensionAudit\.v1"/);
  assert.match(fn,/dimension_count:items\.length/);
  assert.match(fn,/\.\.\.dimensionAuditReviewBundle\(items\)/);
});
test("question 144: Saved Dimensions exposes Copy all audit JSON",()=>{
  assert.match(ui,/async function copyAllDimensionAudits\(\)/);
  assert.match(ui,/JSON\.stringify\(allDimensionAuditSnapshot\(\),null,2\)/);
  assert.match(ui,/data-copy-all-dimension-audits/);
  assert.match(ui,/Copy all audit JSON/);
});
