import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportFinalState,
  dimensionAuditDownloadHistoryExportFinalStateSnapshot,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1257: final-state snapshot signature validator binds to nested state signature",()=>{
  const state=dimensionAuditDownloadHistoryExportFinalState();
  const snapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(state);
  const impossible={...snapshot,state_signature:snapshot.state_signature+"x"};
  const forged=dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(forged,impossible),false);
});
