import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 161: Saved Dimensions filters Section-derived dimensions explicitly",()=>{
  assert.match(ui,/dimensionManagerFilter==="section-derived"/);
  assert.match(ui,/result=items\.filter\(isSectionDerivedDimension\)/);
  assert.match(ui,/'section-derived':'Section-derived'/);
});


test("question 162: audit summary counts Section-derived dimensions",()=>{
  assert.match(ui,/section_derived:0/);
  assert.match(ui,/if\(isSectionDerivedDimension\(dimension\)\)summary\.section_derived\+\+/);
  assert.match(ui,/Section-derived: '\+auditSummary\.section_derived/);
});
