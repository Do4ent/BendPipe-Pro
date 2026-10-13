import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 868: manager and runtime expose export-event summary signature validity",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventSummarySignatureValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportEventSummarySignatureValid/);
  assert.match(ui,/const auditDownloadHistoryExportEventSummarySignatureValid=dimensionAuditDownloadHistoryExportEventSummarySignatureValid\(auditDownloadHistoryExportEventSummarySignature,auditDownloadHistoryExportEventSummary\)/);
  assert.match(ui,/data-history-export-event-summary-signature-valid="'\+\(auditDownloadHistoryExportEventSummarySignatureValid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSummarySignatureValid:/);
});
