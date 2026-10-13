import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportDecision,
  dimensionAuditDownloadHistoryExportDecisionSnapshot,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignature,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1248: decision snapshot signature validator binds validity flags to nested decision",()=>{
  const decision=dimensionAuditDownloadHistoryExportDecision({ready:false,code:"BLOCKED"});
  const snapshot=dimensionAuditDownloadHistoryExportDecisionSnapshot(decision);
  const impossible={...snapshot,decision_valid:!snapshot.decision_valid};
  const forged=dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(forged,impossible),false);
});
