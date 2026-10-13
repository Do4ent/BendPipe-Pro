import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature,
  dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1151: action-permit snapshot signature builder rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",permit_signature:"p",permit_valid:true,permit_signature_valid:true};
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(snapshot));

  const malformed={...snapshot,permit_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportActionPermitSnapshotSignature(malformed),
    {name:"TypeError",message:"history export action permit snapshot signature fields must be canonical"}
  );
});

test("question 1206: action-permit snapshot signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={schema:"s",permit_signature:"p",permit_valid:1,permit_signature_valid:true};
  assert.equal(
    dimensionAuditDownloadHistoryExportActionPermitSnapshotSignatureValid(
      JSON.stringify({
        schema:"s",
        permit_signature:"p",
        permit_valid:true,
        permit_signature_valid:true
      }),
      malformed
    ),
    false
  );
});
