import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportAuthorization
} from "../../src/domain/measurements/audit-download.mjs";

test("question 759: canonical history export authorization derives final allowed/code",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const decisionSnapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  const authorization=dimensionAuditDownloadHistoryExportAuthorization(decisionSnapshot);
  assert.equal(authorization.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_AUTHORIZATION_SCHEMA);
  assert.equal(authorization.allowed,false);
  assert.equal(authorization.code,"EMPTY");
  assert.equal(authorization.decision_snapshot_valid,true);
  assert.equal(
    dimensionAuditDownloadHistoryExportAuthorization({...decisionSnapshot,snapshot_signature_valid:false}).code,
    "INVALID_DECISION_SNAPSHOT"
  );
});
