import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportDecisionSnapshotValid,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignature,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 966-967: decision snapshot rejects coerced fields and signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotValid(snapshot),true);
  for(const [field,value] of [
    ["schema",new String(snapshot.schema)],
    ["decision_signature",new String(snapshot.decision_signature)],
    ["decision_valid",1],
    ["snapshot_signature",new String(snapshot.snapshot_signature)]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotValid({...snapshot,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(snapshot);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(signature,snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(new String(signature),snapshot),false);
});
