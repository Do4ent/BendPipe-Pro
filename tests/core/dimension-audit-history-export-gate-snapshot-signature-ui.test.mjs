import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 745: history export gate snapshot signature is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGateSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGateSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid/);
  assert.match(ui,/snapshot_signature:snapshotSignature/);
  assert.match(ui,/snapshot_signature_valid:true/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSnapshotSignature:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportGateSnapshotSignatureValid:/);
});
