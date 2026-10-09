import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEnvelopeValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1103: history envelope rejects tampered embedded binding through canonical signature validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid(snapshot),true);
  const tampered={
    ...snapshot,
    protocol_binding:{...snapshot.protocol_binding,code:"tampered"}
  };
  assert.equal(dimensionAuditDownloadHistoryEnvelopeValid(tampered),false);
});
