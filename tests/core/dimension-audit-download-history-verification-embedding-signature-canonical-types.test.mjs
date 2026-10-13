import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryVerificationEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1222: verification-embedding signature builder rejects coercible non-canonical fields",()=>{
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
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryVerificationEmbeddingSignature({...embedding,present:1}),
    {name:"TypeError",message:"audit download history verification embedding signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryVerificationEmbeddingSignature({...embedding,errors:[{toString:()=>"ERR"}]}),
    {name:"TypeError",message:"audit download history verification embedding signature fields must be canonical"}
  );
});
