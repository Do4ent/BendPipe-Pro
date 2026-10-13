import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 795: manager exposes signed export action status",()=>{
  assert.match(ui,/const auditDownloadHistoryExportActionStatus=dimensionAuditDownloadHistoryExportActionStatus\(/);
  assert.match(ui,/const auditDownloadHistoryExportActionStatusValid=dimensionAuditDownloadHistoryExportActionStatusValid\(/);
  assert.match(ui,/data-history-export-action-status-schema="'\+esc\(auditDownloadHistoryExportActionStatus\.schema\)\+'"/);
  assert.match(ui,/data-history-export-action-status-code="'\+esc\(auditDownloadHistoryExportActionStatus\.code\)\+'"/);
  assert.match(ui,/data-history-export-action-status-valid="'\+\(auditDownloadHistoryExportActionStatusValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-action-status-signature-valid="'\+\(auditDownloadHistoryExportActionStatusSignatureValid\?'1':'0'\)\+'"/);
});
