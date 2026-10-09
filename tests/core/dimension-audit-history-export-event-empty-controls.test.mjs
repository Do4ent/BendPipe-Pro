import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 838: export event controls fail closed when the event history is empty",()=>{
  assert.match(ui,/data-copy-dimension-audit-history-export-events/);
  assert.match(ui,/auditDownloadHistoryExportEventSnapshotValid&&auditDownloadHistoryExportEventSummary\.total\?'':'disabled'/);
  assert.match(ui,/data-download-dimension-audit-history-export-events/);
  assert.match(ui,/data-clear-dimension-audit-history-export-events/);
  assert.match(ui,/auditDownloadHistoryExportEventSummary\.total\?'':'disabled'/);
  assert.match(ui,/const auditDownloadHistoryExportEventSummary=dimensionAuditDownloadHistoryExportEventSummary\(\)/);
  assert.match(ui,/const auditDownloadHistoryExportEventSnapshot=dimensionAuditDownloadHistoryExportEventHistorySnapshot\(\)/);
});
