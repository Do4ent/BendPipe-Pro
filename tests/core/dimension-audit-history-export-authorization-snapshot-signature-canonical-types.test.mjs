import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1147: authorization snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",authorization_signature:"a",authorization_valid:true,authorization_signature_valid:true};
  const malformed={...snapshot,authorization_valid:1};
  const forged=dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(forged,malformed),false);
});
