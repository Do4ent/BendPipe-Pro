import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessSnapshot,
  dimensionAuditDownloadHistoryExportGate,
  dimensionAuditDownloadHistoryExportGateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 733: history readiness export gate has deterministic signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const snapshot=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(snapshot,state);
  const signature=dimensionAuditDownloadHistoryExportGateSignature(gate);
  assert.match(signature,/"schema":"TubeBender.DimensionAuditDownloadHistoryExportGate.v1"/);
  assert.equal(signature,dimensionAuditDownloadHistoryExportGateSignature(gate));
});
