import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryProtocolBinding,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_BINDING_SCHEMA
} from "../../src/domain/measurements/audit-download.mjs";

test("question 623: audit history protocol binding returns explicit diagnostics",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({attempts:[]});
  const good=dimensionAuditDownloadHistoryProtocolBinding(snapshot);
  assert.equal(good.schema,DIMENSION_AUDIT_DOWNLOAD_HISTORY_PROTOCOL_BINDING_SCHEMA);
  assert.equal(good.valid,true);
  assert.equal(good.code,"OK");
  assert.deepEqual(good.errors,[]);

  const missing=dimensionAuditDownloadHistoryProtocolBinding({...snapshot,protocol_state:null});
  assert.equal(missing.valid,false);
  assert.equal(missing.code,"MISSING_PROTOCOL_STATE");

  const badSignature=dimensionAuditDownloadHistoryProtocolBinding({...snapshot,protocol_state_signature:"bad"});
  assert.ok(badSignature.errors.includes("INVALID_PROTOCOL_STATE_SIGNATURE"));
});
