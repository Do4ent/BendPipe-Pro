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
  const verification=ui.match(/function dimensionAuditDownloadHistoryVerification\(snapshot=\{\}\)\{([\s\S]*?)\n  \}/)?.[1]??"";
  assert.match(verification,/const health=dimensionAuditDownloadHistoryHealth\(value\)/);
  assert.match(verification,/!health\.valid\?"INVALID_HEALTH":null/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadiness/);
  assert.match(ui,/const verification=dimensionAuditDownloadHistoryVerification\(value\)/);
});
