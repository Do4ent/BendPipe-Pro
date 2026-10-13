import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 270: review reason audit persists selection context",()=>{
  assert.match(ui,/const selectedSet=new Set\(selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/const dimensionIds=items\.map\(dimension=>String\(dimension\?\.id\?\?""\)\)/);
  assert.match(ui,/const selectedIds=dimensionIds\.filter\(id=>selectedSet\.has\(id\)\)/);
  assert.match(ui,/selected_dimension_ids:selectedIds/);
  assert.match(ui,/selected_dimension_count:selectedIds\.length/);
  assert.match(ui,/unselected_dimension_count:unselectedIds\.length/);
});
