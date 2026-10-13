import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryAttestationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1221: attestation signature builder rejects coercible non-canonical fields",()=>{
  const attestation={
    schema:"s",
    valid:true,
    code:"OK",
    errors:[],
    verification_valid:true,
    embedded_verification_valid:true,
    verification_embedding_valid:true,
    embedded_verification_embedding_valid:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryAttestationSignature(attestation));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryAttestationSignature({...attestation,valid:1}),
    {name:"TypeError",message:"audit download history attestation signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryAttestationSignature({...attestation,errors:[{toString:()=>"ERR"}]}),
    {name:"TypeError",message:"audit download history attestation signature fields must be canonical"}
  );
});
