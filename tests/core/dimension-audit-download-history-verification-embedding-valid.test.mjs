import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 653: embedded verification diagnostics are revalidated against current state",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(snapshot),true);

  const tampered={
    ...snapshot,
    verification_embedding:{...snapshot.verification_embedding,valid:false}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(tampered),false);

  const stale={...snapshot,verification_embedding_signature:"stale"};
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(stale),false);
});
