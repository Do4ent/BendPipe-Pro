import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadAttempt,
  dimensionAuditDownloadHistoryPermitEvidenceSummary,
  dimensionAuditDownloadHistoryPermitEvidenceSummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 823: permit evidence history summary reports coverage without changing legacy summary",()=>{
  const legacy=buildDimensionAuditDownloadAttempt({
    status:"downloaded",generated_at:"2026-10-08T20:00:00.000Z"
  });
  const evidenced=buildDimensionAuditDownloadAttempt({
    status:"downloaded",
    export_action:"download",
    action_permit_signature:"permit",
    action_permit_snapshot_signature:"snapshot",
    generated_at:"2026-10-08T20:01:00.000Z"
  });
  const summary=dimensionAuditDownloadHistoryPermitEvidenceSummary([legacy,evidenced]);
  assert.equal(summary.total,2);
  assert.equal(summary.present,1);
  assert.equal(summary.absent,1);
  assert.equal(summary.valid,1);
  assert.equal(summary.invalid,0);
  assert.equal(summary.download,1);
  assert.equal(summary.latest_present,true);
  assert.equal(summary.latest_valid,true);
  assert.equal(summary.latest_action,"download");
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid(summary,[legacy,evidenced]),true);
  assert.equal(dimensionAuditDownloadHistoryPermitEvidenceSummaryValid({...summary,present:2},[legacy,evidenced]),false);
});
