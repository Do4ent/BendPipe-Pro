import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 809: action permit snapshot is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionPermitSnapshot\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportActionPermitSnapshot/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportActionPermitSnapshotValid\(/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportActionPermitSnapshot:/);
});
