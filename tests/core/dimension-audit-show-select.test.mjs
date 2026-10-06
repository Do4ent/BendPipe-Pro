import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 156: filtered audit results can be shown and selected atomically",()=>{
  assert.match(ui,/function showAndSelectDimensionAuditResults\(\)/);
  assert.match(ui,/modelCommand\?api\(\)\.modelCommand\("Показать Dimension текущего audit-view"/);
  assert.match(ui,/visible:true/);
  assert.match(ui,/bulk-show-audit-dimensions/);
  assert.match(ui,/replaceSelectionKeys\?\.\(keys,\{announce:true\}\)/);
  assert.match(ui,/data-show-select-dimension-audit/);
});
