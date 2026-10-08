import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SNAPSHOT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportAuthorization,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshot,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 764: history export authorization snapshot is self-contained and validated",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  const authorization=dimensionAuditDownloadHistoryExportAuthorization(decisionSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportAuthorizationSnapshot(authorization);
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.authorization_valid,true);
  assert.equal(snapshot.authorization_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotValid({...snapshot,authorization_valid:false}),false);
});
