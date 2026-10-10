import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 833: signed export event history snapshot is exposed through runtime API",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventHistorySignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportEventHistorySignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventHistorySnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportEventHistorySnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportEventHistorySnapshotValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSnapshot:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportEventSnapshotValid:/);
});
