import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSignature,
  dimensionAuditDownloadHistoryExportGateSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 734: history readiness export gate signature validation fails closed",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(snapshot,state);
  const signature=dimensionAuditDownloadHistoryExportGateSignature(gate);
  assert.equal(dimensionAuditDownloadHistoryExportGateSignatureValid(signature,gate),true);
  assert.equal(dimensionAuditDownloadHistoryExportGateSignatureValid(signature+"x",gate),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateSignatureValid(signature,{...gate,allowed:!gate.allowed}),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateSignatureValid(signature,{...gate,code:"READY"}),gate.code==="READY");
});
