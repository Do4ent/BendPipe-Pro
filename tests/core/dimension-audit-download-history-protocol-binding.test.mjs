import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity,
  dimensionAuditDownloadHistoryProtocolStateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 609: audit history snapshot is bound to protocol state and detects tampering",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.equal(snapshot.protocol_state.valid,true);
  assert.equal(snapshot.protocol_state_signature,dimensionAuditDownloadHistoryProtocolStateSignature(snapshot.protocol_state));
  assert.equal(snapshot.integrity.protocol_state_valid,true);
  assert.equal(snapshot.integrity.protocol_state_signature_valid,true);
  assert.equal(snapshot.valid,true);

  const tampered={
    ...snapshot,
    protocol_state:{...snapshot.protocol_state,valid:false}
  };
  const integrity=dimensionAuditDownloadHistoryIntegrity(tampered);
  assert.equal(integrity.valid,false);
  assert.ok(integrity.errors.includes("INVALID_PROTOCOL_STATE"));
  assert.ok(integrity.errors.includes("INVALID_PROTOCOL_STATE_SIGNATURE"));
});
