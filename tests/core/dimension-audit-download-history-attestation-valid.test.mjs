import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedAttestationValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 657: embedded history attestation is revalidated against current state",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationValid(snapshot),true);

  const tampered={...snapshot,attestation:{...snapshot.attestation,valid:false}};
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationValid(tampered),false);

  const stale={...snapshot,attestation_signature:"stale"};
  assert.equal(dimensionAuditDownloadHistoryEmbeddedAttestationValid(stale),false);
});
