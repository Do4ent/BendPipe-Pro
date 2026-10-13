import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidence,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 1016-1017: final-state evidence diagnostics are canonical",()=>{
  const absent=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const present=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    final_state_signature:"s",
    final_state_snapshot_signature:"ss",
    generated_at:"2026-10-09T00:00:01.000Z"
  });
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidence(absent).present,false);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidence(present).valid,true);
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary([absent,present]);
  assert.deepEqual(
    {total:summary.total,present:summary.present,absent:summary.absent,valid:summary.valid,invalid:summary.invalid},
    {total:2,present:1,absent:1,valid:1,invalid:0}
  );
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(summary,[absent,present]),true);
});
