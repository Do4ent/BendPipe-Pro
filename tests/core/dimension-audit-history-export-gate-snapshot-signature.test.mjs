import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportGateSnapshotSignature,
  dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportGateSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 744: history export gate snapshot has its own deterministic signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const snapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportGateSnapshotSignature(snapshot));
  assert.equal(snapshot.snapshot_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotValid({...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"}),false);
});
