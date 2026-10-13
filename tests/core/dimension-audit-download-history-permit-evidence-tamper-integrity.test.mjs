import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistoryPermitEvidenceSummary,
  dimensionAuditDownloadHistoryPermitEvidenceSummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

function fixture(){
  const attempt=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    export_action:"download",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"snapshot",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const attempts=[attempt];
  const summary=dimensionAuditDownloadHistoryPermitEvidenceSummary(attempts);
  return {attempts,summary};
}

test("question 1084: permit-evidence summary rejects attempt content tampered behind stale attempt signature",()=>{
  const {attempts,summary}=fixture();
  const tampered=[{...attempts[0],action_permit_signature:"tampered"}];
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(summary,tampered),false);
});

test("question 1085: permit-evidence summary rejects tampered snapshot-signature evidence with unchanged coverage counts",()=>{
  const {attempts,summary}=fixture();
  const tampered=[{...attempts[0],action_permit_snapshot_signature:"tampered"}];
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(summary,tampered),false);
});
