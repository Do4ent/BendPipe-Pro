import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1026-1027: UI/runtime expose signed final-state evidence summary snapshot",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid\(/);
  assert.match(ui,/data-history-export-event-final-state-evidence-summary-snapshot-signature="/);
  assert.match(ui,/data-history-export-event-final-state-evidence-summary-snapshot-valid="/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid:/);
});
