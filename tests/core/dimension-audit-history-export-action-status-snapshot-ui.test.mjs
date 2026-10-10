import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 799: export action status snapshot is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionStatusSnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportActionStatusSnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionStatusSnapshotValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionStatusSnapshotValid:/);
});
