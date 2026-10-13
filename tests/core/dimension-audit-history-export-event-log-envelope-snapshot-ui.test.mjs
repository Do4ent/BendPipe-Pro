import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1044-1045: manager/runtime gate event-log export on envelope snapshot",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid\(/);
  assert.match(ui,/data-history-export-event-log-envelope-snapshot-signature="/);
  assert.match(ui,/data-history-export-event-log-envelope-snapshot-valid="/);
  assert.match(ui,/data-copy-dimension-audit-history-export-events '\+\(auditDownloadHistoryExportEventLogEnvelopeSnapshotValid&&auditDownloadHistoryExportEventSummary\.total\?'':'disabled'\)/);
  assert.match(ui,/data-download-dimension-audit-history-export-events '\+\(auditDownloadHistoryExportEventLogEnvelopeSnapshotValid&&auditDownloadHistoryExportEventSummary\.total\?'':'disabled'\)/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid:/);
});
