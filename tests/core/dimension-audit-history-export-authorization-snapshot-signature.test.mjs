import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportAuthorization,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshot,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 765: history export authorization snapshot has its own deterministic signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  const authorization=dimensionAuditDownloadHistoryExportAuthorization(decisionSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization);
  assert.equal(snapshot.snapshot_signature,dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(snapshot));
  assert.equal(snapshot.snapshot_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid({...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"}),false);
});
