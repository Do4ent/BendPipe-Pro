import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 756: history export decision snapshot is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportDecisionSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportDecisionSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportDecisionSnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportDecisionSnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportDecisionSnapshotValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportDecisionSnapshotValid:/);
});
