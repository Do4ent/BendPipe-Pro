import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 872: manager and runtime expose export-event history signature validity",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventHistorySignatureValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportEventHistorySignatureValid/);
  assert.match(ui,/const auditDownloadHistoryExportEventSnapshotSignatureValid=dimensionAuditDownloadHistoryExportEventHistorySignatureValid\(auditDownloadHistoryExportEventSnapshot\.signature,auditDownloadHistoryExportEventSnapshot\)/);
  assert.match(ui,/data-history-export-event-snapshot-signature-valid="'\+\(auditDownloadHistoryExportEventSnapshotSignatureValid\?'1':'0'\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSnapshotSignatureValid:/);
});
