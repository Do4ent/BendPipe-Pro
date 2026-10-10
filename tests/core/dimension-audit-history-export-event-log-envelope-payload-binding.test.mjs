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
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events,"2026-10-09T00:00:01.000Z");
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  return {events,snapshot:dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events)};
}

test("question 1058: envelope snapshot binds the exact embedded envelope signature",()=>{
  const {events,snapshot}=fixture();
  assert.equal(snapshot.envelope_signature,snapshot.envelope.signature);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(snapshot,events),true);
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(
      {...snapshot,envelope_signature:snapshot.envelope_signature+"x"},
      events
    ),
    false
  );
});

test("question 1059: envelope snapshot cannot claim validity with a false envelope-valid flag",()=>{
  const {events,snapshot}=fixture();
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(
      {...snapshot,envelope_valid:false},
      events
    ),
    false
  );
});
