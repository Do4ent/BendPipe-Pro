import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryAttestation,
  dimensionAuditDownloadHistoryAttestationSignature,
  dimensionAuditDownloadHistoryAttestationSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1116: attestation signature validator accepts canonical attestation and rejects malformed/tampered input",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p",
    project_name:"P",
    generated_at:"2026-10-09T00:00:00.000Z",
    attempts:[]
  });
  const attestation=dimensionAuditDownloadHistoryAttestation(snapshot);
  const signature=dimensionAuditDownloadHistoryAttestationSignature(attestation);
  assert.equal(dimensionAuditDownloadHistoryAttestationSignatureValid(signature,attestation),true);
  assert.equal(dimensionAuditDownloadHistoryAttestationSignatureValid("",attestation),false);
  assert.equal(dimensionAuditDownloadHistoryAttestationSignatureValid({toString:()=>signature},attestation),false);
  assert.equal(dimensionAuditDownloadHistoryAttestationSignatureValid(signature,{...attestation,code:"tampered"}),false);
});
