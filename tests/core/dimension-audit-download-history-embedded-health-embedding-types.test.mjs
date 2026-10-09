import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid,
  dimensionAuditDownloadHistoryHealthEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 944-945: embedded health embedding rejects boxed signature and non-canonical fields",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid({...snapshot,health_embedding_signature:new String(snapshot.health_embedding_signature)}),
    false
  );

  const tamperedEmbedding={...snapshot.health_embedding,current_signature:new String(snapshot.health_embedding.current_signature)};
  const tampered={
    ...snapshot,
    health_embedding:tamperedEmbedding,
    health_embedding_signature:dimensionAuditDownloadHistoryHealthEmbeddingSignature(tamperedEmbedding)
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(tampered),false);
});
