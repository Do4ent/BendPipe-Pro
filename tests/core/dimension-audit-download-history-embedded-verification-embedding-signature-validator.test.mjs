import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1115: embedded verification-embedding validation rejects tampered embedding through canonical signature validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(snapshot),true);
  const tampered={
    ...snapshot,
    verification_embedding:{...snapshot.verification_embedding,code:"tampered"}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(tampered),false);
});
