import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignature,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1245: readiness snapshot signature validator binds validity flags to nested protocol and state",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:0,verification_valid:false,trusted:false,provenance_valid:false,
    history_snapshot_signature:"h",provenance_signature:"p"
  });
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const impossible={...snapshot,state_valid:!snapshot.state_valid};
  const forged=dimensionAuditDownloadHistoryExportReadinessSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(forged,impossible),false);
});
