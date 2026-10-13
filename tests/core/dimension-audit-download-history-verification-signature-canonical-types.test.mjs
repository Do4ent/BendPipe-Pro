import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryVerificationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1223: verification signature builder rejects coercible non-canonical fields",()=>{
  const verification={
    schema:"s",
    valid:true,
    code:"OK",
    errors:[],
    protocol_binding_valid:true,
    integrity_valid:true,
    envelope_valid:true,
    health_valid:true,
    embedded_health_valid:true,
    health_embedding_valid:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryVerificationSignature(verification));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryVerificationSignature({...verification,health_valid:1}),
    {name:"TypeError",message:"audit download history verification signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryVerificationSignature({...verification,errors:[{toString:()=>"ERR"}]}),
    {name:"TypeError",message:"audit download history verification signature fields must be canonical"}
  );
});
