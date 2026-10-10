import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1101: protocol state rejects tampered protocol signature through canonical validator",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid(state),true);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid({...state,protocol_signature:"tampered"}),false);
});
