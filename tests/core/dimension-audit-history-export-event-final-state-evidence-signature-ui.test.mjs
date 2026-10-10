import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1022-1023: UI/runtime expose signed final-state evidence summary",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid\(/);
  assert.match(ui,/data-history-export-event-final-state-evidence-summary-signature="/);
  assert.match(ui,/data-history-export-event-final-state-evidence-summary-signature-valid="/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid:/);
});
