import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistoryExportReadinessState,
  dimensionAuditDownloadHistoryExportReadinessStateValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 707: audit download domain validates readiness state semantics",()=>{
  const state=dimensionAuditDownloadHistoryExportReadinessState({
    attempt_count:1,
    verification_valid:true,
    trusted:true,
    provenance_valid:true,
    history_snapshot_signature:"history",
    provenance_signature:"provenance"
  });
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateValid(state),true);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateValid({...state,code:"UNTRUSTED"}),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateValid({...state,ready:false}),false);
  assert.equal(dimensionAuditDownloadHistoryExportReadinessStateValid({...state,schema:"bad"}),false);
});
