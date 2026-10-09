import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryHealthSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1227: health signature builder rejects coercible non-canonical fields",()=>{
  const health={
    schema:"s",
    valid:true,
    code:"OK",
    errors:[],
    protocol_state_valid:true,
    protocol_binding_valid:true,
    protocol_binding_code:"OK",
    integrity_valid:true,
    integrity_code:"OK",
    envelope_valid:true
  };
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryHealthSignature(health));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryHealthSignature({...health,envelope_valid:1}),
    {name:"TypeError",message:"audit download history health signature fields must be canonical"}
  );
  assert.throws(
    ()=>dimensionAuditDownloadHistoryHealthSignature({...health,errors:[{toString:()=>"ERR"}]}),
    {name:"TypeError",message:"audit download history health signature fields must be canonical"}
  );
});
