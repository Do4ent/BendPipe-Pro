import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1244: evidence summary snapshot signature validator binds to nested summary",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const impossible={...snapshot,summary_signature:snapshot.summary_signature+"x"};
  const forged=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(forged,impossible),false);
});
