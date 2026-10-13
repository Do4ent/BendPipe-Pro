import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryAttestationEmbedding,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignature,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1118: attestation embedding signature validator accepts canonical embedding and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const embedding=dimensionAuditDownloadHistoryAttestationEmbedding(snapshot);
  const signature=dimensionAuditDownloadHistoryAttestationEmbeddingSignature(embedding);
  assert.equal(dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,embedding),true);
  assert.equal(dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid("",embedding),false);
  assert.equal(dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid({toString:()=>signature},embedding),false);
  assert.equal(dimensionAuditDownloadHistoryAttestationEmbeddingSignatureValid(signature,{...embedding,code:"tampered"}),false);
});
