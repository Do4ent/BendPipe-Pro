import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1150: action-status snapshot signature builder rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",status_signature:"st",status_valid:true,status_signature_valid:true};
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(snapshot));

  const malformed={...snapshot,status_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportActionStatusSnapshotSignature(malformed),
    {name:"TypeError",message:"history export action status snapshot signature fields must be canonical"}
  );
});

test("question 1205: action-status snapshot signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={schema:"s",status_signature:"st",status_valid:1,status_signature_valid:true};
  assert.equal(
    dimensionAuditDownloadHistoryExportActionStatusSnapshotSignatureValid(
      JSON.stringify({
        schema:"s",
        status_signature:"st",
        status_valid:true,
        status_signature_valid:true
      }),
      malformed
    ),
    false
  );
});
