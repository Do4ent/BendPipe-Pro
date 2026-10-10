import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryIntegrity
} from "../../src/domain/measurements/audit-download.mjs";

test("question 928: history integrity rejects coerced count and signature field types",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryIntegrity({...snapshot,attempt_count:"0"}).attempt_count_valid,false);
  assert.equal(dimensionAuditDownloadHistoryIntegrity({...snapshot,summary_signature:new String(snapshot.summary_signature)}).summary_signature_valid,false);
  assert.equal(dimensionAuditDownloadHistoryIntegrity({...snapshot,protocol_state_signature:new String(snapshot.protocol_state_signature)}).protocol_state_signature_valid,false);
  assert.equal(dimensionAuditDownloadHistoryIntegrity({...snapshot,snapshot_signature:new String(snapshot.snapshot_signature)}).snapshot_signature_valid,false);
});
