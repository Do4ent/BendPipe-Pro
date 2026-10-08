import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 632: Saved Dimensions and history export use aggregate health",()=>{
  assert.match(ui,/const auditDownloadHistoryHealth=dimensionAuditDownloadHistoryHealth\(auditDownloadHistorySnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryHealthSignature=dimensionAuditDownloadHistoryHealthSignature\(auditDownloadHistoryHealth\)/);
  assert.match(ui,/data-history-health-valid="'\+\(auditDownloadHistoryHealth\.valid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-health-code="'\+esc\(auditDownloadHistoryHealth\.code\)\+'"/);
  assert.match(ui,/data-history-health-signature="'\+esc\(auditDownloadHistoryHealthSignature\)\+'"/);
  const gate=/const health=dimensionAuditDownloadHistoryHealth\(snapshot\);/g;
  assert.equal((ui.match(gate)??[]).length,2);
  assert.match(ui,/if\(!health\.valid\)\{toast\("Audit download history health invalid: "\+health\.code\);return false;\}/);
});
