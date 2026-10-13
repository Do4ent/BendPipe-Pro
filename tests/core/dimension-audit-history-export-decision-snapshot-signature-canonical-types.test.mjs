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
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportDecisionSnapshotSignature(malformed),
    {name:"TypeError",message:"history export decision snapshot signature fields must be canonical"}
  );
});

test("question 1199: decision snapshot signature validator remains fail-closed if malformed input bypasses the strict builder",()=>{
  const malformed={
    schema:"s",
    decision_signature:"d",
    decision_valid:1,
    decision_signature_valid:true
  };
  assert.equal(dimensionAuditDownloadHistoryExportDecisionSnapshotSignatureValid("forged",malformed),false);
});
