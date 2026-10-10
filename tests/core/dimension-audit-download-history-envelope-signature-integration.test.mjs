import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1107: envelope validation rejects tampered envelope signature through canonical validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid(snapshot),true);
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid({...snapshot,envelope_signature:"tampered"}),false);
});
