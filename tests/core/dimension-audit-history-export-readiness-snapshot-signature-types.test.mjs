import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignature,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 958: readiness snapshot signature validation requires non-empty primitive string",()=>{
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(dimensionAuditDownloadHistoryExportReadinessState());
  const signature=dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(new String(signature),snapshot),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid("",snapshot),false);
});
