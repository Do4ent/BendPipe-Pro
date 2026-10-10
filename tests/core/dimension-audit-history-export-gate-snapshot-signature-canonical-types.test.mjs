import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportGateSnapshotSignature,
  dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1145: gate snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={
    schema:"s",
    gate_signature:"g",
    gate_valid:true,
    gate_signature_valid:true
  };
  const malformed={...snapshot,gate_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportGateSnapshotSignature(malformed),
    {name:"TypeError",message:"history export gate snapshot signature fields must be canonical"}
  );
});

test("question 1197: gate snapshot signature validator remains fail-closed if malformed input bypasses the strict builder",()=>{
  const malformed={
    schema:"s",
    gate_signature:"g",
    gate_valid:1,
    gate_signature_valid:true
  };
  assert.equal(dimensionAuditDownloadHistoryExportGateSnapshotSignatureValid("forged",malformed),false);
});
