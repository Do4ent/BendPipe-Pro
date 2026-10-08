import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 706: Saved Dimensions uses canonical history readiness snapshot fields",()=>{
  assert.match(ui,/const auditDownloadHistoryExportReadinessSnapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot\(auditDownloadHistorySnapshot\)/);
  assert.match(ui,/const auditDownloadHistoryExportReady=auditDownloadHistoryExportReadinessSnapshot\.ready&&auditDownloadHistoryExportReadinessSnapshotValid/);
  assert.match(ui,/data-history-export-code="'\+esc\(auditDownloadHistoryExportReadinessSnapshot\.code\)\+'"/);
  assert.match(ui,/data-history-export-signature="'\+esc\(auditDownloadHistoryExportReadinessSnapshot\.signature\)\+'"/);
  assert.match(ui,/data-history-export-signature-valid="'\+\(auditDownloadHistoryExportReadinessSnapshot\.signature_valid\?'1':'0'\)\+'"/);
});
