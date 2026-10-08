import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 830: manager exposes and clears independent history export event summary",()=>{
  assert.match(ui,/const auditDownloadHistoryExportEventSummary=dimensionAuditDownloadHistoryExportEventSummary\(\)/);
  assert.match(ui,/const auditDownloadHistoryExportEventSummaryValid=dimensionAuditDownloadHistoryExportEventSummaryValid\(/);
  assert.match(ui,/data-history-export-event-total="'\+auditDownloadHistoryExportEventSummary\.total\+'"/);
  assert.match(ui,/data-history-export-event-summary-valid="'\+\(auditDownloadHistoryExportEventSummaryValid\?'1':'0'\)\+'"/);
  assert.match(ui,/Clear export events/);
  assert.match(ui,/data-clear-dimension-audit-history-export-events/);
  assert.match(ui,/clearDimensionAuditDownloadHistoryExportEventHistory\(\)/);
});
