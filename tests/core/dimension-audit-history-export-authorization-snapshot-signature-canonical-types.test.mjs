import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1147: authorization snapshot signature validation rejects coercible non-canonical fields",()=>{
  const snapshot={schema:"s",authorization_signature:"a",authorization_valid:true,authorization_signature_valid:true};
  const malformed={...snapshot,authorization_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(malformed),
    {name:"TypeError",message:"history export authorization snapshot signature fields must be canonical"}
  );
});

test("question 1201: authorization snapshot signature validator remains fail-closed if malformed input bypasses the strict builder",()=>{
  const malformed={schema:"s",authorization_signature:"a",authorization_valid:1,authorization_signature_valid:true};
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid("forged",malformed),false);
});
