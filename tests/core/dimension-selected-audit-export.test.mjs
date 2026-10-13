import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 229: selected Dimension audit subset has dedicated schema",()=>{
  assert.match(ui,/function selectedDimensionAuditSnapshot\(\)/);
  assert.match(ui,/schema:"TubeBender\.DimensionSelectionAudit\.v1"/);
  assert.match(ui,/savedDimensions\(\)\.filter\(dimension=>ids\.has\(String\(dimension\?\.id\?\?""\)\)\)/);
});

test("question 229: selected Dimension audit can be copied and downloaded",()=>{
  assert.match(ui,/function downloadSelectedDimensionAudits\(\)/);
  assert.match(ui,/async function copySelectedDimensionAudits\(\)/);
  assert.match(ui,/data-copy-selected-dimension-audits/);
  assert.match(ui,/data-download-selected-dimension-audits/);
  assert.match(ui,/DimensionSelectionAudit/);
});
