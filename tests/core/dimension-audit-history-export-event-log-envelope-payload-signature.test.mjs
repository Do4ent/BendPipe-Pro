import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid
} from "../../src/domain/measurements/audit-download.mjs";

function makeSnapshot(){
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"download",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    final_state_signature:"fs",
    final_state_snapshot_signature:"fss",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events,"2026-10-09T00:00:01.000Z");
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  return {events,snapshot:dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events)};
}

test("question 1056: exported envelope snapshot carries its own signature state",()=>{
  const {snapshot}=makeSnapshot();
  assert.equal(typeof snapshot.snapshot_signature,"string");
  assert.equal(snapshot.snapshot_signature.length>0,true);
  assert.equal(snapshot.snapshot_signature_valid,true);
});

test("question 1057: exported envelope snapshot fails validation when its signature is changed",()=>{
  const {events,snapshot}=makeSnapshot();
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(
      {...snapshot,snapshot_signature:snapshot.snapshot_signature+"x"},
      events
    ),
    false
  );
});
