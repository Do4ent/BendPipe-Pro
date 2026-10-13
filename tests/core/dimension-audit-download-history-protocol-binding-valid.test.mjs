import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryProtocolBindingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 619: audit history protocol binding validation is centralized",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingValid({...snapshot,protocol_state_signature:"bad"}),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingValid({...snapshot,protocol_state:{...snapshot.protocol_state,valid:false}}),false);
});
