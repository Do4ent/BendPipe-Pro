import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const ui=fs.readFileSync(path.join(root,"src","ui","measurements-ui.js"),"utf8");

test("question 728: readiness snapshot signature is exposed through runtime adapter",()=>{
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessSnapshotSignature\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessSnapshotSignature/);
  assert.match(ui,/function dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid\(/);
  assert.match(ui,/auditDownloadDomain\?\.dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid/);
  assert.match(ui,/snapshot_signature:snapshotSignature/);
  assert.match(ui,/snapshot_signature_valid:true/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSnapshotSignature:/);
  assert.match(ui,/currentDimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid:/);
});
