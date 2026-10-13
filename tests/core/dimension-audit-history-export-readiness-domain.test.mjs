import test from "node:test";
import assert from "node:assert/strict";
import {
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA,
  DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES,
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessStateSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 698: audit download domain owns export readiness state",()=>{
  assert.equal(DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_SCHEMA,"TubeBender.DimensionAuditDownloadHistoryExportReadiness.v1");
  assert.deepEqual(DIMENSION_AUDIT_DOWNLOAD_HISTORY_EXPORT_READINESS_CODES,[
    "READY","EMPTY","VERIFICATION_FAILED","UNTRUSTED","INVALID_PROVENANCE"
  ]);

  const empty=dimensionAuditDownloadHistoryExportReadinessState();
  assert.equal(empty.ready,false);
  assert.equal(empty.code,"EMPTY");

  const verification=dimensionAuditDownloadHistoryExportReadinessState({attempt_count:1});
  assert.equal(verification.code,"VERIFICATION_FAILED");

  const trust=dimensionAuditDownloadHistoryExportReadinessState({attempt_count:1,verification_valid:true});
  assert.equal(trust.code,"UNTRUSTED");

  const provenance=dimensionAuditDownloadHistoryExportReadinessState({attempt_count:1,verification_valid:true,trusted:true});
  assert.equal(provenance.code,"INVALID_PROVENANCE");

  const ready=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:2,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"history",
    provenance_signature:"provenance"
  });
  assert.equal(ready.ready,true);
  assert.equal(ready.code,"READY");
  assert.equal(Object.isFrozen(ready),true);
  assert.match(dimensionAuditDownloadHistoryExportReadinessStateSignature(ready),/"code":"READY"/);
});
