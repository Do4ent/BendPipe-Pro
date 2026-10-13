import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryTrustSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1218: history-trust signature builder rejects coercible non-canonical fields",()=>{
  const trust={
    schema:"s",
    trusted:true,
    code:"OK",
    errors:[],
    attestation_valid:true,
    embedded_attestation_valid:true,
    attestation_embedding_valid:true,
    embedded_attestation_embedding_valid:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryTrustSignature(trust));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryTrustSignature({...trust,trusted:1}),
    {name:"TypeError",message:"audit download history trust signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryTrustSignature({...trust,errors:[{toString:()=>"ERR"}]}),
    {name:"TypeError",message:"audit download history trust signature fields must be canonical"}
  );
});
