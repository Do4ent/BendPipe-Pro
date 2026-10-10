import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 661: embedded attestation diagnostics are revalidated against current state",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(snapshot),true);

  const tampered={
    ...snapshot,
    attestation_embedding:{...snapshot.attestation_embedding,valid:false}
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(tampered),false);

  const stale={...snapshot,attestation_embedding_signature:"stale"};
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(stale),false);
});
