import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 228: Dimension audit summary counts selected and unselected items",()=>{
  assert.match(ui,/const selectedIds=new Set\(selectedDimensionAuditIds\(\)\)/);
  assert.match(ui,/selected:0,unselected:0/);
  assert.match(ui,/summary\.selected\+\+;else summary\.unselected\+\+/);
  assert.match(ui,/Selected: '\+auditSummary\.selected/);
  assert.match(ui,/Unselected: '\+auditSummary\.unselected/);
});
