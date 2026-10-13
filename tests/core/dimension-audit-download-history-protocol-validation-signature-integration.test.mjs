import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryProtocolState,
  dimensionAuditDownloadHistoryProtocolStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1099: protocol state validation rejects tampered validation signature through canonical validator",()=>{
  const state=dimensionAuditDownloadHistoryProtocolState();
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid(state),true);
  const tampered={...state,validation_signature:"tampered"};
  assert.equal(dimensionAuditDownloadHistoryProtocolStateValid(tampered),false);
});
