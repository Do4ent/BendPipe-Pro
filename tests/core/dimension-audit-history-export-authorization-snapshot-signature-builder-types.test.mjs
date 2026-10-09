import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const canonicalFieldsOnly={
  schema:"TubeBender.DimensionAuditDownloadHistoryExportAuthorizationSnapshot.v1",
  authorization_signature:"authorization",
  authorization_valid:true,
  authorization_signature_valid:true
};

test("question 1200: authorization snapshot signature builder rejects coercible fields",()=>{
  const signature=dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(canonicalFieldsOnly);
  assert.equal(typeof signature,"string");
  assert.equal(
    dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(signature,canonicalFieldsOnly),
    false,
    "detached field-only authorization snapshot cannot satisfy semantic signature validation"
  );
  const malformed={...canonicalFieldsOnly,authorization_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(malformed),
    {name:"TypeError",message:"history export authorization snapshot signature fields must be canonical"}
  );
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid("forged",malformed),false);
});
