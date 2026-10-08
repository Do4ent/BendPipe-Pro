import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SCHEMA,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision
} from "../../src/domain/measurements/audit-download.mjs";

test("question 749: canonical history export decision is derived from gate snapshot",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  assert.equal(decision.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_DECISION_SCHEMA);
  assert.equal(decision.allowed,false);
  assert.equal(decision.code,"EMPTY");
  assert.equal(decision.gate_snapshot_valid,true);
  assert.equal(decision.gate_code,"EMPTY");

  assert.equal(
    dimensionAuditDownloadHistoryExportDecision({...gateSnapshot,snapshot_signature_valid:false}).code,
    "INVALID_GATE_SNAPSHOT"
  );
});
