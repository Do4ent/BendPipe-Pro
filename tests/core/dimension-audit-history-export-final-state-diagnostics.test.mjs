import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1012-1015: manager exposes current and latest final-state evidence",()=>{
  assert.match(ui,/const auditDownloadHistoryCopyFinalStateSignature=dimensionAuditDownloadHistoryExportFinalStateSignature\(auditDownloadHistoryCopyFinalState\)/);
  assert.match(ui,/const auditDownloadHistoryDownloadFinalStateSignature=dimensionAuditDownloadHistoryExportFinalStateSignature\(auditDownloadHistoryDownloadFinalState\)/);
  assert.match(ui,/data-history-export-copy-final-state-signature="/);
  assert.match(ui,/data-history-export-download-final-state-signature="/);
  assert.match(ui,/data-history-export-copy-final-state-snapshot-signature="/);
  assert.match(ui,/data-history-export-download-final-state-snapshot-signature="/);
  assert.match(ui,/data-history-export-event-latest-final-state-signature="/);
  assert.match(ui,/data-history-export-event-latest-final-state-snapshot-signature="/);
});
