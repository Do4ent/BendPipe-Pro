import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 232: selected Dimension audit summarizes selection kinds",()=>{
  assert.match(ui,/function dimensionSelectionKindCounts\(entries=context\(\)\?\.selectionEntries\?\.\(\)\?\?\[\]\)/);
  assert.match(ui,/const kind=String\(entry\?\.kind\?\?"unknown"\)/);
  assert.match(ui,/counts\[kind\]=\(counts\[kind\]\?\?0\)\+1/);
  assert.match(ui,/selection_kind_counts:dimensionSelectionKindCounts\(entries\)/);
});
