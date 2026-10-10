import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 615: audit history protocol state validity detects tampering",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid(state),true);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid({...state,protocol_signature:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid({...state,validation_signature:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid({...state,valid:false}),false);
});
