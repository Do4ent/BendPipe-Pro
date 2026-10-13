import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryAttestation,
  dimensionAuditDownloadHistoryAttestationSignature,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 656: history snapshot embeds signed final attestation",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.ok(snapshot.attestation);
  assert.equal(snapshot.attestation.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_ATTESTATION_SCHEMA);
  assert.equal(snapshot.attestation.valid,true);
  assert.equal(
    snapshot.attestation_signature,
    dimensionAuditDownloadHistoryAttestationSignature(snapshot.attestation)
  );
  const current=dimensionAuditDownloadHistoryAttestation(snapshot);
  assert.equal(
    snapshot.attestation_signature,
    dimensionAuditDownloadHistoryAttestationSignature(current)
  );
});
