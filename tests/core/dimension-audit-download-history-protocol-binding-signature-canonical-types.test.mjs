import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolBinding,
  dimensionAuditDownloadHistoryProtocolBindingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1233: protocol-binding signature builder rejects coercible non-canonical fields",()=>{
  const binding=dimensionAuditDownloadHistoryProtocolBinding();
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryProtocolBindingSignature(binding));
  const malformed={...binding,errors:[...binding.errors,{toString:()=>"FORGED"}]};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryProtocolBindingSignature(malformed),
    {name:"TypeError",message:"audit download history protocol binding signature fields must be canonical"}
  );
});
