import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedHealthValid,
  dimensionAuditDownloadHistoryHealthEmbedding
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 941-943: embedded health rejects boxed signature and non-canonical health fields",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  assert.equal(dimensionAuditDownloadHistoryEmbeddedHealthValid(snapshot),true);

  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthValid({...snapshot,health_signature:new String(snapshot.health_signature)}),
    false
  );

  const boxedHealth={...snapshot.health,code:new String(snapshot.health.code)};
  assert.equal(
    dimensionAuditDownloadHistoryEmbeddedHealthValid({...snapshot,health:boxedHealth}),
    false
  );

  const embedding=dimensionAuditDownloadHistoryHealthEmbedding({...snapshot,health_signature:new String(snapshot.health_signature)});
  assert.equal(embedding.valid,false);
  assert.equal(embedding.signature_valid,false);
});
