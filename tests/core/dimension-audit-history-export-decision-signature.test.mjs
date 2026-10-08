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

test("question 750: canonical history export decision is validated and signed",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState();
  const readiness=dimensionAuditDownloadHistoryExportReadinessSnapshot(state);
  const gate=dimensionAuditDownloadHistoryExportGate(readiness,state);
  const gateSnapshot=dimensionAuditDownloadHistoryExportGateSnapshot(gate);
  const decision=dimensionAuditDownloadHistoryExportDecision(gateSnapshot);
  const signature=dimensionAuditDownloadHistoryExportDecisionSignature(decision);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionValid(decision),true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature,decision),true);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionValid({...decision,allowed:!decision.allowed}),false);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSignatureValid(signature+"x",decision),false);
});
