import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryAttestationEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1220: attestation-embedding signature builder rejects coercible non-canonical fields",()=>{
  const embedding={
    schema:"s",
    valid:true,
    code:"OK",
    errors:[],
    present:true,
    signature_valid:true,
    current_valid:true,
    current_signature:"c"
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryAttestationEmbeddingSignature({...embedding,present:1}),
    {name:"TypeError",message:"audit download history attestation embedding signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryAttestationEmbeddingSignature({...embedding,errors:[{toString:()=>"ERR"}]}),
    {name:"TypeError",message:"audit download history attestation embedding signature fields must be canonical"}
  );
});
