import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryTrust,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_TRUST_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 664: final history trust state aggregates attestation chain",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  const trust=dimensionAuditDownloadHistoryTrust(snapshot);
  assert.equal(trust.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_TRUST_SCHEMA);
  assert.equal(trust.trusted,true);
  assert.equal(trust.code,"OK");
  assert.deepEqual(trust.errors,[]);
  assert.equal(trust.attestation_valid,true);
  assert.equal(trust.embedded_attestation_valid,true);
  assert.equal(trust.attestation_embedding_valid,true);
  assert.equal(trust.embedded_attestation_embedding_valid,true);

  const tampered={...snapshot,attestation_signature:"stale"};
  const bad=dimensionAuditDownloadHistoryTrust(tampered);
  assert.equal(bad.trusted,false);
  assert.notEqual(bad.code,"OK");
});
