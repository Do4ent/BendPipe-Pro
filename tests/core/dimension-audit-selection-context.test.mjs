import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 220: filtered Dimension audit snapshot includes current Dimension selection",()=>{
  assert.match(ui,/function selectedDimensionAuditIds\(\)/);
  assert.match(ui,/entry\?\.kind==="dimension"/);
  assert.match(ui,/selected_dimension_ids:selectionIds/);
  assert.match(ui,/selected_dimension_count:selectionIds\.length/);
});
