import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid,
  dimensionAuditDownloadHistoryVerificationEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 948-949: embedded verification embedding rejects boxed signature and non-canonical fields",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid({...snapshot,verification_embedding_signature:new String(snapshot.verification_embedding_signature)}),
    false
  );

  const boxedEmbedding={...snapshot.verification_embedding,current_signature:new String(snapshot.verification_embedding.current_signature)};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryVerificationEmbeddingSignature(boxedEmbedding),
    {name:"TypeError",message:"audit download history verification embedding signature fields must be canonical"}
  );
  const tampered={
    ...snapshot,
    verification_embedding:boxedEmbedding,
    verification_embedding_signature:snapshot.verification_embedding_signature
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationEmbeddingValid(tampered),false);
});
