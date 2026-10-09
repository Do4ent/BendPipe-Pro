import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid,
  dimensionAuditDownloadHistoryAttestationEmbeddingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 952-953: embedded attestation embedding rejects boxed signature and non-canonical fields",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid({...snapshot,attestation_embedding_signature:new String(snapshot.attestation_embedding_signature)}),
    false
  );

  const boxed={...snapshot.attestation_embedding,current_signature:new String(snapshot.attestation_embedding.current_signature)};
  const tampered={
    ...snapshot,
    attestation_embedding:boxed,
    attestation_embedding_signature:dimensionAuditDownloadHistoryAttestationEmbeddingSignature(boxed)
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationEmbeddingValid(tampered),false);
});
