import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedVerificationValid,
  dimensionAuditDownloadHistoryVerificationEmbedding,
  dimensionAuditDownloadHistoryVerificationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 946-947: embedded verification rejects boxed signature and non-canonical fields",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedVerificationValid({...snapshot,verification_signature:new String(snapshot.verification_signature)}),
    false
  );

  const boxedVerification={...snapshot.verification,code:new String(snapshot.verification.code)};
  const tampered={
    ...snapshot,
    verification:boxedVerification,
    verification_signature:dimensionAuditDownloadHistoryVerificationSignature(boxedVerification)
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(tampered),false);

  const embedding=dimensionAuditDownloadHistoryVerificationEmbedding({...snapshot,verification_signature:new String(snapshot.verification_signature)});
  assert.equal(embedding.valid,false);
  assert.equal(embedding.signature_valid,false);
});
