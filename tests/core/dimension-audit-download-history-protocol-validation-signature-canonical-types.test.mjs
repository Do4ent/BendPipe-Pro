import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolValidation,
  dimensionAuditDownloadHistoryProtocolValidationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1232: protocol-validation signature builder rejects coercible non-canonical fields",()=>{
  const validation=dimensionAuditDownloadHistoryProtocolValidation();
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryProtocolValidationSignature(validation));
  const malformed={...validation,errors:[...validation.errors,{toString:()=>"FORGED"}]};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryProtocolValidationSignature(malformed),
    {name:"TypeError",message:"audit download history protocol validation signature fields must be canonical"}
  );
});
