import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 146: Saved Dimensions shows Dimension audit summary",()=>{
  assert.match(ui,/const auditSummary=dimensionAuditSummary\(items\)/);
  assert.match(ui,/data-dimension-audit-summary/);
  assert.match(ui,/Total: /);
  assert.match(ui,/Stale: /);
  assert.match(ui,/Rebound: /);
});

test("question 146: Saved Dimensions lists status counts",()=>{
  assert.match(ui,/Object\.entries\(auditSummary\.by_status\)/);
  assert.match(ui,/status\+'\: '\+count/);
});
