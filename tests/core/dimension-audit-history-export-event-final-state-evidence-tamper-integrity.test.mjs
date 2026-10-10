import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

function fixture(){
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    final_state_signature:"fs",
    final_state_snapshot_signature:"fss",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary);
  const snapshot=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  return {events,summary,signature,snapshot};
}

test("question 1082: evidence summary rejects event content tampered behind stale event signature",()=>{
  const {events,summary}=fixture();
  const tampered=[{...events[0],final_state_signature:"tampered"}];
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummaryValid(summary,tampered),false);
});

test("question 1083: evidence signature and snapshot validation inherit event-signature integrity",()=>{
  const {events,summary,signature,snapshot}=fixture();
  const tampered=[{...events[0],final_state_snapshot_signature:"tampered"}];
  assert.equal(
    dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,summary,tampered),
    false
  );
  assert.equal(
    dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshotValid(snapshot,tampered),
    false
  );
});
