import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedVerificationValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1113: embedded verification validation rejects tampered verification through canonical signature validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(snapshot),true);
  const tampered={
    ...snapshot,
    verification:{...snapshot.verification,code:"tampered"}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(tampered),false);
});
