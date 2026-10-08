import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocol,
  dimensionAuditDownloadHistoryProtocolSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 601: audit history protocol signature is deterministic",()=>{
  const protocol=dimensionAuditDownloadHistoryProtocol();
  const signature=dimensionAuditDownloadHistoryProtocolSignature(protocol);
  assert.equal(signature,dimensionAuditDownloadHistoryProtocolSignature({...protocol,generated_at:"2099-01-01T00:00:00Z"}));
  assert.notEqual(signature,dimensionAuditDownloadHistoryProtocolSignature({...protocol,envelope_schema:"other"}));
});
