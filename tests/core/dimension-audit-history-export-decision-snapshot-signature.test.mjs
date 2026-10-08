import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignature,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportDecisionSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 755: history export decision snapshot has its own deterministic signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(snapshot));
  assert.equal(snapshot.snapshot_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotValid({...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"}),false);
});
