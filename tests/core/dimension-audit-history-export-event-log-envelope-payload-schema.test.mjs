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

test("question 1060: event-log envelope snapshot rejects schema substitution",()=>{
  const {events,snapshot}=fixture();
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid(
      {...snapshot,schema:"TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot.v2"},
      events
    ),
    false
  );
});

test("question 1061: event-log envelope snapshot rejects embedded envelope schema substitution",()=>{
  const {events,snapshot}=fixture();
  const envelope={...snapshot.envelope,schema:"TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelope.v2"};
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid({...snapshot,envelope},events),
    false
  );
});
