import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 766: history export authorization snapshot is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportAuthorizationSnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportAuthorizationSnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportAuthorizationSnapshotValid:/);
});
