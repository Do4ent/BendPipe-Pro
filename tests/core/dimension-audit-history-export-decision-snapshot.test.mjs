import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SNAPSHOT_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportDecisionSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 754: history export decision snapshot is self-contained and validated",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  assert.equal(snapshot.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SNAPSHOT_SCHEMA);
  assert.equal(snapshot.decision_valid,true);
  assert.equal(snapshot.decision_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotValid({...snapshot,decision_valid:false}),false);
});
