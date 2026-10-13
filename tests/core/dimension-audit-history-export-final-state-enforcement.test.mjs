import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 1006: copy action enforces canonical final-state snapshot",()=>{
  assert.match(ui,/const exportFinalState=dimensionAuditDownloadHistoryExportFinalState\("copy"/);
  assert.match(ui,/const exportFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot\(exportFinalState,"copy"/);
  assert.match(ui,/const exportFinalStateSnapshotValid=dimensionAuditDownloadHistoryExportFinalStateSnapshotValid\(exportFinalStateSnapshot,"copy"/);
});

test("question 1007: download action enforces canonical final-state snapshot",()=>{
  assert.match(ui,/const exportFinalState=dimensionAuditDownloadHistoryExportFinalState\("download"/);
  assert.match(ui,/const exportFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot\(exportFinalState,"download"/);
  assert.match(ui,/const exportFinalStateSnapshotValid=dimensionAuditDownloadHistoryExportFinalStateSnapshotValid\(exportFinalStateSnapshot,"download"/);
  assert.match(ui,/INVALID_EXPORT_FINAL_STATE_SNAPSHOT/);
});
