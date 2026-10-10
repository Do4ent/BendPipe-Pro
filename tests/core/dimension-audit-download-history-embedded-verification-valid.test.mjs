import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySnapshot,
  dimensionAuditDownloadHistoryEmbeddedVerificationValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 650: embedded history verification is revalidated against current state",()=>{
  const snapshot=dimensionAuditDownloadHistorySnapshot({
    project_id:"p1",
    project_name:"Project",
    attempts:[]
  });
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(snapshot),true);

  const tampered={...snapshot,verification:{...snapshot.verification,valid:false}};
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(tampered),false);

  const stale={...snapshot,verification_signature:"stale"};
  assert.equal(dimensionAuditDownloadHistoryEmbeddedVerificationValid(stale),false);
});
