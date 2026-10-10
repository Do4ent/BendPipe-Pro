import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 225: visible Dimension audit results can be removed from current selection",()=>{
  assert.match(ui,/function removeVisibleDimensionAuditResultsFromSelection\(\)/);
  assert.match(ui,/ids\.has\(String\(entry\.dimensionId\)\)/);
  assert.match(ui,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
  assert.match(ui,/data-remove-visible-dimension-audit/);
});
