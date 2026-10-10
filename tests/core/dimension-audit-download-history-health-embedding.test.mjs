import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealthEmbedding,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_EMBEDDING_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 637: embedded audit history health returns explicit diagnostics",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const good=dimensionAuditDownloadHistoryHealthEmbedding(snapshot);
  assert.equal(good.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_HEALTH_EMBEDDING_SCHEMA);
  assert.equal(good.valid,true);
  assert.equal(good.code,"OK");

  const missing=dimensionAuditDownloadHistoryHealthEmbedding({...snapshot,health:null,health_signature:""});
  assert.equal(missing.valid,false);
  assert.equal(missing.code,"MISSING_HEALTH");

  const badSignature=dimensionAuditDownloadHistoryHealthEmbedding({...snapshot,health_signature:"bad"});
  assert.ok(badSignature.errors.includes("INVALID_HEALTH_SIGNATURE"));

  const stale=dimensionAuditDownloadHistoryHealthEmbedding({
    ...snapshot,
    health:{...snapshot.health,envelope_valid:false},
    health_signature:snapshot.health_signature
  });
  assert.equal(stale.valid,false);
});
