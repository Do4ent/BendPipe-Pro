import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1018-1019: UI/runtime expose final-state evidence diagnostics",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid\(/);
  assert.match(ui,/data-history-export-event-final-state-evidence-present="/);
  assert.match(ui,/data-history-export-event-final-state-evidence-invalid="/);
  assert.match(ui,/data-history-export-event-final-state-evidence-summary-valid="/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid:/);
});
