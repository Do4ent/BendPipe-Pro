import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealthEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 640: audit history snapshot embeds health embedding diagnostics and signature",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(snapshot.health_embedding.valid,true);
  assert.equal(
    snapshot.health_embedding_signature,
    dimensionAuditDownloadHistoryHealthEmbeddingSignature(snapshot.health_embedding)
  );
});
