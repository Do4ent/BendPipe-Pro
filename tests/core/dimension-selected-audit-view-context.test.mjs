import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 238: selected Dimension audit records current audit view",()=>{
  assert.match(ui,/schema:"TubeBender\.DimensionSelectionAudit\.v1"/);
  assert.match(ui,/view:\{\n        filter:dimensionManagerFilter,/);
  assert.match(ui,/sort:dimensionManagerSort/);
  assert.match(ui,/search:String\(dimensionManagerSearch\?\?""\)/);
  assert.match(ui,/focus_id:dimensionManagerFocusId\|\|null/);
});
