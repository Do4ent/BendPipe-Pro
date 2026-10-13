import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature,
  dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1152: final-state snapshot signature builder rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",state_signature:"st",state_valid:true,state_signature_valid:true};
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(snapshot));

  const malformed={...snapshot,state_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportFinalStateSnapshotSignature(malformed),
    {name:"TypeError",message:"history export final state snapshot signature fields must be canonical"}
  );
});

test("question 1207: final-state snapshot signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={schema:"s",state_signature:"st",state_valid:1,state_signature_valid:true};
  assert.equal(
    dimensionAuditDownloadHistoryExportFinalStateSnapshotSignatureValid(
      JSON.stringify({
        schema:"s",
        state_signature:"st",
        state_valid:true,
        state_signature_valid:true
      }),
      malformed
    ),
    false
  );
});
