import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryVerificationEmbedding,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignature,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1114: verification embedding signature validator accepts canonical embedding and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const embedding=dimensionAuditDownloadHistoryVerificationEmbedding(snapshot);
  const signature=dimensionAuditDownloadHistoryVerificationEmbeddingSignature(embedding);
  assert.equal(dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,embedding),true);
  assert.equal(dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid("",embedding),false);
  assert.equal(dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid({toString:()=>signature},embedding),false);
  assert.equal(dimensionAuditDownloadHistoryVerificationEmbeddingSignatureValid(signature,{...embedding,code:"tampered"}),false);
});
