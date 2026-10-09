import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 850: manager and runtime expose export event summary signature",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventSummarySignature\(/);
  assert.match(ui,/const auditDownloadHistoryExportEventSummarySignature=dimensionAuditDownloadHistoryExportEventSummarySignature\(auditDownloadHistoryExportEventSummary\)/);
  assert.match(ui,/data-history-export-event-summary-signature="'\+esc\(auditDownloadHistoryExportEventSummarySignature\)\+'"/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSummarySignature:/);
});
