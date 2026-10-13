import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealthEmbedding,
  dimensionAuditDownloadHistoryHealthEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 638: embedded audit history health diagnostics signature is deterministic",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const embedding=dimensionAuditDownloadHistoryHealthEmbedding(snapshot);
  const signature=dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding);
  assert.equal(signature,dimensionAuditDownloadHistoryHealthEmbeddingSignature({...embedding,generated_at:"2099-01-01T00:00:00Z"}));
  assert.notEqual(signature,dimensionAuditDownloadHistoryHealthEmbeddingSignature({...embedding,current_valid:false}));
});
