import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateValid,
  dimensionAuditDownloadHistoryExportGateSignature,
  dimensionAuditDownloadHistoryExportGateSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 960-961: export gate rejects coerced fields and signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(snapshot,state);
  assert.equal(dimensionAuditDownloadHistoryExportGateValid(gate),true);
  for(const [field,value] of [
    ["schema",new String(gate.schema)],
    ["allowed",1],
    ["code",new String(gate.code)],
    ["readiness_code",new String(gate.readiness_code)],
    ["snapshot_valid",1]
  ]){
    assert.equal(dimensionAuditDownloadHistoryExportGateValid({...gate,[field]:value}),false,field);
  }
  const signature=dimensionAuditDownloadHistoryExportGateSignature(gate);
  assert.equal(dimensionAuditDownloadHistoryExportGateSignatureValid(signature,gate),true);
  assert.equal(dimensionAuditDownloadHistoryExportGateSignatureValid(new String(signature),gate),false);
});
