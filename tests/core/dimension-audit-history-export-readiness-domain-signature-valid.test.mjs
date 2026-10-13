import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessStateSignature,
  dimensionAuditDownloadHistoryExportReadinessStateSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 701: audit download domain validates export readiness signature",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:1,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"history",
    provenance_signature:"provenance"
  });
  const signature=dimensionAuditDownloadHistoryExportReadinessStateSignature(state);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(signature,state),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateSignatureValid(signature+"x",state),false);
});
