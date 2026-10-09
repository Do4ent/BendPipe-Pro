import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1038-1041: manager and buttons gate event-log export on signed envelope",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventLogEnvelope=dimensionAuditDownloadHistoryExportEventLogEnvelope\(/);
  assert.match(ui,/const auditDownloadHistoryExportEventLogEnvelopeValid=dimensionAuditDownloadHistoryExportEventLogEnvelopeValid\(/);
  assert.match(ui,/data-history-export-event-log-envelope-schema="/);
  assert.match(ui,/data-history-export-event-log-envelope-valid="/);
  assert.match(ui,/data-history-export-event-log-envelope-signature="/);
  assert.match(ui,/data-copy-dimension-audit-history-export-events '\+\(auditDownloadHistoryExportEventLogEnvelopeValid&&auditDownloadHistoryExportEventSummary\.total\?'':'disabled'\)/);
  assert.match(ui,/data-download-dimension-audit-history-export-events '\+\(auditDownloadHistoryExportEventLogEnvelopeValid&&auditDownloadHistoryExportEventSummary\.total\?'':'disabled'\)/);
});
