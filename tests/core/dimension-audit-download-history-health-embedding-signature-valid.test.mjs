import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealthEmbedding,
  dimensionAuditDownloadHistoryHealthEmbeddingSignature,
  dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1110: health embedding signature validator accepts canonical embedding and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const embedding=dimensionAuditDownloadHistoryHealthEmbedding(snapshot);
  const signature=dimensionAuditDownloadHistoryHealthEmbeddingSignature(embedding);
  assert.equal(dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,embedding),true);
  assert.equal(dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid("",embedding),false);
  assert.equal(dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid({toString:()=>signature},embedding),false);
  assert.equal(dimensionAuditDownloadHistoryHealthEmbeddingSignatureValid(signature,{...embedding,code:"tampered"}),false);
});
