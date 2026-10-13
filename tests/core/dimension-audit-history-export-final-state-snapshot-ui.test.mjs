import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 1004-1005: UI/runtime enforce signed final-state snapshots",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportFinalStateSnapshot\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportFinalStateSnapshotValid\(/);
  assert.match(ui,/const auditDownloadHistoryCopyFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot\(/);
  assert.match(ui,/const auditDownloadHistoryDownloadFinalStateSnapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot\(/);
  assert.match(ui,/const auditDownloadHistoryCopyPermitReady=auditDownloadHistoryCopyFinalStateSnapshotValid&&auditDownloadHistoryCopyFinalState\.ready/);
  assert.match(ui,/const auditDownloadHistoryDownloadPermitReady=auditDownloadHistoryDownloadFinalStateSnapshotValid&&auditDownloadHistoryDownloadFinalState\.ready/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateSnapshotValid:/);
});
