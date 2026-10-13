import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadProtocolState,
  dimensionAuditDownloadProtocolSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1230: protocol signature builder rejects coercible non-canonical fields",()=>{
  const state=dimensionAuditDownloadProtocolState();
  assert.doesNotThrow(()=>dimensionAuditDownloadProtocolSignature(state));

  const malformed={...state,validation_schema:{toString:()=>state.validation_schema}};
  assert.throws(
    ()=>dimensionAuditDownloadProtocolSignature(malformed),
    {name:"TypeError",message:"audit download protocol signature fields must be canonical"}
  );
});
