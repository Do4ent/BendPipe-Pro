import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 157: filtered Dimension audit results can be hidden in one undoable operation",()=>{
  assert.match(ui,/function hideDimensionAuditResults\(\)/);
  assert.match(ui,/modelCommand\?api\(\)\.modelCommand\("Скрыть Dimension текущего audit-view"/);
  assert.match(ui,/visible:false/);
  assert.match(ui,/bulk-hide-audit-dimensions/);
  assert.match(ui,/data-hide-dimension-audit/);
});

test("question 157: hiding current audit view prunes hidden Dimensions from global selection",()=>{
  assert.match(ui,/selectionKeys\?\.\(\)\?\?\[\]/);
  assert.match(ui,/entry\?\.kind!=="dimension"\|\|!ids\.has\(String\(entry\.dimensionId\)\)/);
  assert.match(ui,/replaceSelectionKeys\?\.\(kept,\{announce:true\}\)/);
});
