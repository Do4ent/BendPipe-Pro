import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 827: runtime keeps an independent bounded history export event log",()=>{
  assert.match(ui,/const dimensionAuditDownloadHistoryExportEventHistory=[]/);
  assert.match(ui,/const DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_EVENT_LIMIT=20/);
  assert.match(ui,/function recordDimensionAuditDownloadHistoryExportEvent\(/);
  assert.match(ui,/buildDimensionAuditDownloadHistoryExportEvent/);
  assert.match(ui,/dimensionAuditDownloadHistoryExportEventHistory\.push\(event\)/);
  assert.match(ui,/tubebender-dimension-audit-history-export/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventHistorySnapshot\(/);
  assert.match(ui,/function clearDimensionAuditDownloadHistoryExportEventHistory\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventHistory:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSummary:/);
});
