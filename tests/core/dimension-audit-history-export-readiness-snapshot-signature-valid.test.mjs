import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignature,
  dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportReadinessSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 727: readiness snapshot full signature validation fails closed",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid(snapshot,state),true);
  const tampered={...snapshot,code:"READY"===snapshot.code?"EMPTY":"READY"};
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(snapshot.snapshot_signature,tampered),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotValid(tampered,state),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessSnapshotSignatureValid(snapshot.snapshot_signature+"x",snapshot),false);
});
