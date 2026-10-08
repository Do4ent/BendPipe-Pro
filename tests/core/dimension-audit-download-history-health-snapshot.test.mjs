import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryHealthSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 634: audit history snapshot embeds aggregate health and signature",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(snapshot.health.valid,true);
  assert.equal(snapshot.health_signature,dimensionAuditDownloadHistoryHealthSignature(snapshot.health));
  assert.equal(snapshot.health.envelope_valid,true);
});
