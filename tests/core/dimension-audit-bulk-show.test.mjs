import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 158: filtered Dimension audit results can be shown without changing selection",()=>{
  assert.match(ui,/function showDimensionAuditResults\(\)/);
  assert.match(ui,/modelCommand\?api\(\)\.modelCommand\("Показать Dimension текущего audit-view"/);
  assert.match(ui,/visible:true/);
  assert.match(ui,/bulk-show-audit-dimensions/);
  assert.match(ui,/data-show-dimension-audit/);
});

test("question 158: Show results remains distinct from Show & Select results",()=>{
  assert.match(ui,/function showAndSelectDimensionAuditResults\(\)/);
  assert.match(ui,/Show results/);
  assert.match(ui,/Show & Select results/);
});
