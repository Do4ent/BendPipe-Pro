import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolSignature,
  dimensionAuditDownloadHistoryProtocolSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1100: history protocol signature validator accepts canonical protocol and rejects malformed/tampered input",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  const signature=dimensionAuditDownloadHistoryProtocolSignature(protocol);
  assert.equal(dimensionAuditDownloadHistoryProtocolSignatureValid(signature,protocol),true);
  assert.equal(dimensionAuditDownloadHistoryProtocolSignatureValid("",protocol),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolSignatureValid({toString:()=>signature},protocol),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolSignatureValid(signature,{...protocol,attempt_schema:"tampered"}),false);
});
