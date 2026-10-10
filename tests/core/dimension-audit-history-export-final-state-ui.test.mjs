import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("questions 998-999: UI manager and runtime use canonical final export state",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportFinalState\(/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportFinalStateValid\(/);
  assert.match(ui,/const auditDownloadHistoryCopyFinalState=dimensionAuditDownloadHistoryExportFinalState\("copy"/);
  assert.match(ui,/const auditDownloadHistoryDownloadFinalState=dimensionAuditDownloadHistoryExportFinalState\("download"/);
  assert.match(ui,/const auditDownloadHistoryCopyPermitReady=auditDownloadHistoryCopyFinalStateSnapshotValid&&auditDownloadHistoryCopyFinalState\.ready/);
  assert.match(ui,/const auditDownloadHistoryDownloadPermitReady=auditDownloadHistoryDownloadFinalStateSnapshotValid&&auditDownloadHistoryDownloadFinalState\.ready/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalState:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportFinalStateValid:/);
});
