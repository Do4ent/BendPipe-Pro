import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 742: history export gate snapshot is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGateSnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGateSnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGateSnapshotValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGateSnapshotValid/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSnapshotValid:/);
});
