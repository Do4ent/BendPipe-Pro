import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryVerificationEmbedding,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignature,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_EMBEDDING_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 652: history snapshot embeds signed verification diagnostics",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.ok(snapshot.verification_embedding);
  assert.equal(snapshot.verification_embedding.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_EMBEDDING_SCHEMA);
  assert.equal(snapshot.verification_embedding.valid,true);
  assert.equal(
    snapshot.verification_embedding_signature,
    dimensionAuditDownloadHistoryVerificationEmbeddingSignature(snapshot.verification_embedding)
  );
  const current=dimensionAuditDownloadHistoryVerificationEmbedding(snapshot);
  assert.equal(
    snapshot.verification_embedding_signature,
    dimensionAuditDownloadHistoryVerificationEmbeddingSignature(current)
  );
});
