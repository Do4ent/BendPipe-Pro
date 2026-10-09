import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature,
  dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

const canonical={
  schema:"TubeBender.DimensionAuditDownloadHistoryExportAuthorizationSnapshot.v1",
  authorization_signature:"authorization",
  authorization_valid:true,
  authorization_signature_valid:true
};

test("question 1200: authorization snapshot signature builder rejects coercible fields",()=>{
  const signature=dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(canonical);
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid(signature,canonical),true);
  const malformed={...canonical,authorization_valid:1};
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignature(malformed),
    {name:"TypeError",message:"history export authorization snapshot signature fields must be canonical"}
  );
  assert.equal(dimensionAuditDownloadHistoryExportAuthorizationSnapshotSignatureValid("forged",malformed),false);
});
