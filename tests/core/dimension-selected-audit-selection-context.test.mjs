import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 231: selected Dimension audit records global selection context",()=>{
  assert.match(ui,/schema:"TubeBender\.DimensionSelectionAudit\.v1"/);
  assert.match(ui,/const entries=context\(\)\?\.selectionEntries\?\.\(\)\?\?\[\]/);
  assert.match(ui,/selected_dimension_ids:selectedIds/);
  assert.match(ui,/selected_dimension_count:selectedIds\.length/);
  assert.match(ui,/global_selection_count:entries\.length/);
  assert.match(ui,/non_dimension_selection_count:entries\.filter\(entry=>entry\?\.kind!=="dimension"\)\.length/);
});
