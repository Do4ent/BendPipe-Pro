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
  assert.throws(
    ()=>dimensionAuditDownloadHistoryVerificationSignature(boxedVerification),
    {name:"TypeError",message:"audit download history verification signature fields must be canonical"}
  );
  const tampered={
    ...snapshot,
    verification:boxedVerification,
    verification_signature:snapshot.verification_signature
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(tampered),false);

  const embedding=dimensionAuditDownloadHistoryVerificationEmbedding({...snapshot,verification_signature:new String(snapshot.verification_signature)});
  assert.equal(embedding.valid,false);
  assert.equal(embedding.signature_valid,false);
});

test("question 1226: embedded verification remains fail-closed after strict signature-builder hardening",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const malformed={...snapshot.verification,valid:1};
  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedVerificationValid({
      ...snapshot,
      verification:malformed,
      verification_signature:snapshot.verification_signature
    }),
    false
  );
});
