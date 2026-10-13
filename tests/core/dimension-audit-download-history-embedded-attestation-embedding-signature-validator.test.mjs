import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1119: embedded attestation-embedding validation rejects tampered embedding through canonical signature validator",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(snapshot),true);
  const tampered={
    ...snapshot,
    attestation_embedding:{...snapshot.attestation_embedding,code:"tampered"}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(tampered),false);
});
