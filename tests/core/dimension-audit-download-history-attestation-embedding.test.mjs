import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryAttestationEmbedding,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignature,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_EMBEDDING_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 660: history snapshot embeds signed attestation diagnostics",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.ok(snapshot.attestation_embedding);
  assert.equal(snapshot.attestation_embedding.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_EMBEDDING_SCHEMA);
  assert.equal(snapshot.attestation_embedding.valid,true);
  assert.equal(
    snapshot.attestation_embedding_signature,
    dimensionAuditDownloadHistoryAttestationEmbeddingSignature(snapshot.attestation_embedding)
  );
  const current=dimensionAuditDownloadHistoryAttestationEmbedding(snapshot);
  assert.equal(
    snapshot.attestation_embedding_signature,
    dimensionAuditDownloadHistoryAttestationEmbeddingSignature(current)
  );
});
