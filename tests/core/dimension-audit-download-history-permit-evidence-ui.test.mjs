import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 824: permit evidence summary and latest evidence are exposed through runtime API",()=>{
  assert.match(ui,/function dimensionAuditDownloadAttemptPermitEvidence\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadAttemptPermitEvidence/);
  assert.match(ui,/function dimensionAuditDownloadHistoryPermitEvidenceSummary\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryPermitEvidenceSummary/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryPermitEvidenceSummary:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryPermitEvidenceSummaryValid:/);
  assert.match(ui,/currentDimensionAuditDownloadLastAttemptPermitEvidence:/);
});
