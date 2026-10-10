import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 224: visible Dimension audit results can be added to current selection",()=>{
  assert.match(ui,/function addVisibleDimensionAuditResultsToSelection\(\)/);
  assert.match(ui,/const merged=\[\.\.\.new Set\(\[\.\.\.\(context\(\)\?\.selectionKeys\?\.\(\)\?\?\[\]\),\.\.\.dimensionKeys\]\)\]/);
  assert.match(ui,/replaceSelectionKeys\?\.\(merged,\{announce:true\}\)/);
  assert.match(ui,/data-add-visible-dimension-audit/);
});
