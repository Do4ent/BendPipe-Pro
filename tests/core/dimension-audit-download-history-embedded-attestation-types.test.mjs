import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedAttestationValid,
  dimensionAuditDownloadHistoryAttestationEmbedding,
  dimensionAuditDownloadHistoryAttestationSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 950-951: embedded attestation rejects boxed signature and non-canonical fields",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedAttestationValid({...snapshot,attestation_signature:new String(snapshot.attestation_signature)}),
    false
  );

  const boxed={...snapshot.attestation,code:new String(snapshot.attestation.code)};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryAttestationSignature(boxed),
    {name:"TypeError",message:"audit download history attestation signature fields must be canonical"}
  );
  const tampered={
    ...snapshot,
    attestation:boxed,
    attestation_signature:snapshot.attestation_signature
  };
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationValid(tampered),false);

  const embedding=dimensionAuditDownloadHistoryAttestationEmbedding({...snapshot,attestation_signature:new String(snapshot.attestation_signature)});
  assert.equal(embedding.valid,false);
  assert.equal(embedding.signature_valid,false);
});
