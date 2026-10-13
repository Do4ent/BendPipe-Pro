import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportFinalState,
  dimensionAuditDownloadHistoryExportFinalStateSignature,
  dimensionAuditDownloadHistoryExportFinalStateSignatureValid,
  dimensionAuditDownloadHistoryExportFinalStateSnapshot,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotValid,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 1000-1003: final export state is deterministically signed and snapshotted",()=>{
  const state=dimensionAuditDownloadHistoryExportFinalState("copy");
  const signature=dimensionAuditDownloadHistoryExportFinalStateSignature(state);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSignatureValid(signature,state,"copy"),true);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSignatureValid({toString:()=>signature},state,"copy"),false);
  const snapshot=dimensionAuditDownloadHistoryExportFinalStateSnapshot(state,"copy");
  assert.equal(snapshot.state_signature,signature);
  assert.equal(snapshot.state_valid,true);
  assert.equal(snapshot.state_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSnapshotValid(snapshot,"copy"),true);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSnapshotValid({...snapshot,state_valid:"true"},"copy"),false);
  assert.equal(dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
});
