import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 612: audit history envelope signature binds protocol state signature",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const signature=dimensionAuditDownloadHistoryEnvelopeSignature(snapshot);
  assert.match(signature,/protocol_state_signature/);
  assert.notEqual(
    signature,
    dimensionAuditDownloadHistoryEnvelopeSignature({...snapshot,protocol_state_signature:"tampered"})
  );
});
