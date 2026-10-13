import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 834: manager exposes signed export event history snapshot",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSnapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(\)/);
  assert.match(ui,/const auditDownloadHistoryExportEventSnapshotValid=dimensionAuditDownloadHistoryExportEventHistorySnapshotValid\(/);
  assert.match(ui,/data-history-export-event-snapshot-schema="'\+esc\(auditDownloadHistoryExportEventSnapshot\.schema\)\+'"/);
  assert.match(ui,/data-history-export-event-snapshot-valid="'\+\(auditDownloadHistoryExportEventSnapshotValid\?'1':'0'\)\+'"/);
  assert.match(ui,/data-history-export-event-snapshot-signature="'\+esc\(auditDownloadHistoryExportEventSnapshot\.signature\?\?'\'\)\+'"/);
});
