import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistoryPermitEvidenceSummary,
  dimensionAuditDownloadHistoryPermitEvidenceSummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 924: permit-evidence summary rejects coerced counter and state types",()=>{
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    export_action:"download",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"snapshot",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryPermitEvidenceSummary([attempt]);
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(summary,[attempt]),true);
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid({...summary,total:"1"},[attempt]),false);
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid({...summary,latest_present:1},[attempt]),false);
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid({...summary,latest_action:new String("download")},[attempt]),false);
});
