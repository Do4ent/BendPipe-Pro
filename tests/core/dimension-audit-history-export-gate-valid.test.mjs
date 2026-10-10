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

test("question 737: history readiness export gate semantic validation is fail-closed",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(snapshot,state);
  assert.equal(dimensionAuditDownloadHistoryExportGateValid(gate),true);
  const signature=dimensionAuditDownloadHistoryExportGateSignature(gate);
  assert.equal(dimensionAuditDownloadHistoryExportGateSignatureValid(signature,gate),true);
  assert.equal(dimensionAuditDownloadHistoryExportGateValid({...gate,allowed:!gate.allowed}),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateValid({...gate,readiness_code:"BAD"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportGateValid({...gate,snapshot_valid:!gate.snapshot_valid}),false);
});
