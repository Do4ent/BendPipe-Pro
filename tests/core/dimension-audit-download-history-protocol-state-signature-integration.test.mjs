import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity,
  dimensionAuditDownloadHistoryProtocolBindingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1097: protocol binding and history integrity share canonical protocol-state signature validation",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryIntegrity(snapshot).protocol_state_signature_valid,true);
  const tampered={...snapshot,protocol_state_signature:"tampered"};
  assert.equal(dimensionAuditDownloadHistoryProtocolBindingValid(tampered),false);
  assert.equal(dimensionAuditDownloadHistoryIntegrity(tampered).protocol_state_signature_valid,false);
});
