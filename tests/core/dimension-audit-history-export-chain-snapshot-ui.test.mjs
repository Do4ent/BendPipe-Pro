import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 776: history export chain snapshot is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportChainSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportChainSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportChainSnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportChainSnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportChainSnapshotValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportChainSnapshotValid:/);
});
