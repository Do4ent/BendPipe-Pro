import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 800: manager exposes signed export action status snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryExportActionStatusSnapshot=dimensionAuditDownloadHistoryExportActionStatusSnapshot\(/);
  assert.match(ui,/const auditDownloadHistoryExportActionStatusSnapshotValid=dimensionAuditDownloadHistoryExportActionStatusSnapshotValid\(/);
  assert.match(ui,/data-history-export-action-status-snapshot-schema="'\+esc\(auditDownloadHistoryExportActionStatusSnapshot\.schema\)\+'"/);
  assert.match(ui,/data-history-export-action-status-snapshot-valid="'\+\(auditDownloadHistoryExportActionStatusSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-action-status-snapshot-signature-valid="'\+\(auditDownloadHistoryExportActionStatusSnapshot\.snapshot_signature_valid\?'1':'0'\)\+'"/);
});
