import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1127: evidence summary snapshot rejects reordered events through canonical event-binding validator",()=>{
  const e1=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h1",generated_at:"2026-10-09T00:00:00.000Z"
  });
  const e2=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h2",generated_at:"2026-10-09T00:00:01.000Z"
  });
  const events=[e1,e2];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,events),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,[e2,e1]),false);
});
