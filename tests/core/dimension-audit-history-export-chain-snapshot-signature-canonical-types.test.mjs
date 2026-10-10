import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportChainSnapshotSignature,
  dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1148: chain snapshot signature builder rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",chain_signature:"c",chain_valid:true,chain_signature_valid:true};
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportChainSnapshotSignature(snapshot));

  const malformed={...snapshot,chain_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportChainSnapshotSignature(malformed),
    {name:"TypeError",message:"history export chain snapshot signature fields must be canonical"}
  );
});

test("question 1203: chain snapshot signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={schema:"s",chain_signature:"c",chain_valid:1,chain_signature_valid:true};
  assert.equal(
    dimensionAuditDownloadHistoryExportChainSnapshotSignatureValid(
      JSON.stringify({schema:"s",chain_signature:"c",chain_valid:true,chain_signature_valid:true}),
      malformed
    ),
    false
  );
});
