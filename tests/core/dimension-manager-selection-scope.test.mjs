import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 222: Saved Dimensions shows current selection scope",()=>{
  assert.match(ui,/const selectedIds=selectedDimensionAuditIds\(\)/);
  assert.match(ui,/const selectedInViewCount=selectedIds\.filter\(id=>visibleIdSet\.has\(String\(id\)\)\)\.length/);
  assert.match(ui,/const selectedOutsideViewCount=selectedIds\.length-selectedInViewCount/);
  assert.match(ui,/data-dimension-selection-scope/);
  assert.match(ui,/Selected in view: /);
  assert.match(ui,/outside view: /);
});
