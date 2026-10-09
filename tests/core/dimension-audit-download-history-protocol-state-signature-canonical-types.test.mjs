import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1229: protocol-state signature builder rejects coercible non-canonical fields",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryProtocolStateSignature(state));

  const malformed={...state,protocol_signature:{toString:()=>state.protocol_signature}};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryProtocolStateSignature(malformed),
    {name:"TypeError",message:"audit download history protocol state signature fields must be canonical"}
  );
});
