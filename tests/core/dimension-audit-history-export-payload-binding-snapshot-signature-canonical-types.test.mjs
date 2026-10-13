import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature,
  dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1149: payload-binding snapshot signature builder rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",binding_signature:"b",binding_valid:true,binding_signature_valid:true};
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(snapshot));

  const malformed={...snapshot,binding_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignature(malformed),
    {name:"TypeError",message:"history export payload binding snapshot signature fields must be canonical"}
  );
});

test("question 1204: payload-binding snapshot signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={schema:"s",binding_signature:"b",binding_valid:1,binding_signature_valid:true};
  assert.equal(
    dimensionAuditDownloadHistoryExportPayloadBindingSnapshotSignatureValid(
      JSON.stringify({
        schema:"s",
        binding_signature:"b",
        binding_valid:true,
        binding_signature_valid:true
      }),
      malformed
    ),
    false
  );
});
