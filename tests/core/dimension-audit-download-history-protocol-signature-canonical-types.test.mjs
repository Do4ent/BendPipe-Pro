import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1231: history protocol signature builder rejects coercible non-canonical fields",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryProtocolSignature(protocol));

  const malformed={...protocol,integrity_codes:[...protocol.integrity_codes,{toString:()=>"FORGED"}]};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryProtocolSignature(malformed),
    {name:"TypeError",message:"audit download history protocol signature fields must be canonical"}
  );
});
