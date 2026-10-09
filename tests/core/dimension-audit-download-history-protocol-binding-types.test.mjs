import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryProtocolBinding,
  dimensionAuditDownloadHistoryProtocolBindingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 931-932: protocol binding rejects boxed protocol_state_signature",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingValid(snapshot),true);
  const tampered={...snapshot,protocol_state_signature:new String(snapshot.protocol_state_signature)};
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingValid(tampered),false);
  assert.equal(dimensionAuditDownloadHistoryProtocolBinding(tampered).signature_valid,false);
});
