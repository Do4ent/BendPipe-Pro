import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryHealthEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1225: health-embedding signature builder rejects coercible non-canonical fields",()=>{
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
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryHealthEmbeddingSignature({...embedding,current_valid:1}),
    {name:"TypeError",message:"audit download history health embedding signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryHealthEmbeddingSignature({...embedding,errors:[{toString:()=>"ERR"}]}),
    {name:"TypeError",message:"audit download history health embedding signature fields must be canonical"}
  );
});
