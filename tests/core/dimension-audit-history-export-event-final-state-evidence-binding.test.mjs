import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 1028-1029: evidence summary snapshot is bound to exact export-event order",()=>{
  const e1=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h1",
    final_state_signature:"s1",
    final_state_snapshot_signature:"ss1",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const e2=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h2",
    final_state_signature:"s2",
    final_state_snapshot_signature:"ss2",
    generated_at:"2026-10-09T00:00:01.000Z"
  });
  const events=[e1,e2];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  assert.equal(snapshot.event_binding_signature,dimensionAuditDownloadHistoryExportEventFinalStateEvidenceEventBindingSignature(events));
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,events),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,[e2,e1]),false);
});
