import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1137: evidence summary snapshot signature rejects coercible non-canonical fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const malformed={...snapshot,summary_signature:{toString:()=>snapshot.summary_signature}};
  const forged=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignature(malformed);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(forged,malformed),false);
});
