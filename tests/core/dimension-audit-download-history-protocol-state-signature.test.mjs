import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 607: audit history protocol state signature is deterministic",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  const signature=dimensionAuditDownloadHistoryProtocolStateSignature(state);
  assert.equal(signature,dimensionAuditDownloadHistoryProtocolStateSignature({...state,generated_at:"2099-01-01T00:00:00Z"}));
  assert.notEqual(signature,dimensionAuditDownloadHistoryProtocolStateSignature({...state,valid:false}));
});
