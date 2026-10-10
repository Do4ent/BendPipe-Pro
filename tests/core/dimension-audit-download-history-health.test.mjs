import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealth,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 629: audit history health aggregates protocol binding integrity and envelope",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const health=dimensionAuditDownloadHistoryHealth(snapshot);
  assert.equal(health.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_SCHEMA);
  assert.equal(health.valid,true);
  assert.equal(health.code,"OK");
  assert.equal(health.protocol_state_valid,true);
  assert.equal(health.protocol_binding_valid,true);
  assert.equal(health.integrity_valid,true);
  assert.equal(health.envelope_valid,true);

  const broken=dimensionAuditDownloadHistoryHealth({...snapshot,envelope_signature:"bad"});
  assert.equal(broken.valid,false);
  assert.ok(broken.errors.includes("INVALID_ENVELOPE"));
});
