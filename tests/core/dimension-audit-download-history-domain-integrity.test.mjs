import test from "node:test";
import assert from "node:assert/strict";
import {
  dimensionAuditDownloadHistorySummarySignature,
  dimensionAuditDownloadHistorySignature,
  dimensionAuditDownloadHistoryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 558: audit download history integrity is validated by pure domain helpers",()=>{
  const summary={
    schema:"TubeBender.DimensionAuditDownloadAttemptHistorySummary.v1",
    total:2,blocked:1,downloaded:1,failed:0,latest_signature:"attempt-2"
  };
  const summarySignature=dimensionAuditDownloadHistorySummarySignature(summary);
  const snapshot={
    schema:"TubeBender.DimensionAuditDownloadHistory.v1",
    project_id:"p1",
    project_name:"Project",
    summary,
    summary_signature:summarySignature,
    attempt_count:2,
    attempts:[{signature:"attempt-1"},{signature:"attempt-2"}]
  };
  assert.equal(dimensionAuditDownloadHistoryValid(snapshot),true);
  assert.equal(
    dimensionAuditDownloadHistorySignature(snapshot),
    dimensionAuditDownloadHistorySignature({...snapshot,generated_at:"2099-01-01T00:00:00Z"})
  );
  assert.equal(dimensionAuditDownloadHistoryValid({...snapshot,attempt_count:1}),false);
  assert.equal(dimensionAuditDownloadHistoryValid({...snapshot,summary_signature:"bad"}),false);
  const signed={...snapshot,snapshot_signature:dimensionAuditDownloadHistorySignature(snapshot)};
  assert.equal(dimensionAuditDownloadHistoryValid(signed),true);
  assert.equal(dimensionAuditDownloadHistoryValid({...signed,snapshot_signature:"bad"}),false);
});
