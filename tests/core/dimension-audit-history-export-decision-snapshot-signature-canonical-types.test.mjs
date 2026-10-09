import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignature,
  dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1146: decision snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={
    schema:"s",
    decision_signature:"d",
    decision_valid:true,
    decision_signature_valid:true
  };
  const malformed={...snapshot,decision_valid:1};
  const forged=dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid(forged,malformed),false);
});
