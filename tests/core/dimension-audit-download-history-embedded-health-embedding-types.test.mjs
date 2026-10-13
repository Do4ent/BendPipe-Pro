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
  assert.throws(
    ()=>dimensionAuditDownloadHistoryHealthEmbeddingSignature(tamperedEmbedding),
    {name:"TypeError",message:"audit download history health embedding signature fields must be canonical"}
  );
  const tampered={
    ...snapshot,
    health_embedding:tamperedEmbedding,
    health_embedding_signature:snapshot.health_embedding_signature
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid(tampered),false);
});

test("question 1228: embedded health embedding remains fail-closed after strict signature-builder hardening",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const malformed={...snapshot.health_embedding,valid:1};
  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthEmbeddingValid({
      ...snapshot,
      health_embedding:malformed,
      health_embedding_signature:snapshot.health_embedding_signature
    }),
    false
  );
});
