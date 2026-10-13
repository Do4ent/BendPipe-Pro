import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryVerification,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 644: canonical audit history verification covers all integrity layers",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const verification=dimensionAuditDownloadHistoryVerification(snapshot);
  assert.equal(verification.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_VERIFICATION_SCHEMA);
  assert.equal(verification.valid,true);
  assert.equal(verification.code,"OK");
  assert.equal(verification.protocol_binding_valid,true);
  assert.equal(verification.integrity_valid,true);
  assert.equal(verification.envelope_valid,true);
  assert.equal(verification.health_valid,true);
  assert.equal(verification.embedded_health_valid,true);
  assert.equal(verification.health_embedding_valid,true);

  const tampered=dimensionAuditDownloadHistoryVerification({...snapshot,health_embedding_signature:"bad"});
  assert.equal(tampered.valid,false);
  assert.ok(tampered.errors.includes("INVALID_HEALTH_EMBEDDING"));
});
