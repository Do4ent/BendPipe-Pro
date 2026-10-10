import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 1024-1025: final-state evidence summary snapshot is signed and validated",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    final_state_signature:"s",
    final_state_snapshot_signature:"ss",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  assert.equal(snapshot.summary_valid,true);
  assert.equal(snapshot.summary_signature_valid,true);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,events),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid({...snapshot,summary_valid:"true"},events),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotSignatureValid(snapshot.snapshot_signature,snapshot),true);
});
