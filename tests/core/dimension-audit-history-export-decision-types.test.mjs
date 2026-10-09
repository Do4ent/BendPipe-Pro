import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSnapshot,
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionValid,
  dimensionAuditDownloadHistoryExportDecisionSignature,
  dimensionAuditDownloadHistoryExportDecisionSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 964-965: export decision rejects coerced fields and signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionValid(decision),true);
  for(const [field,value] of [
    ["schema",new String(decision.schema)],
    ["allowed",1],
    ["code",new String(decision.code)],
    ["gate_snapshot_valid",1],
    ["gate_code",new String(decision.gate_code)],
    ["gate_allowed",1]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportDecisionValid({...decision,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportDecisionSignature(decision);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature,decision),true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSignatureValid(new String(signature),decision),false);
});
