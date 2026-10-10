import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature,
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
  return {events,envelope,snapshot:dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events)};
}

test("question 1072: envelope signature binds ordered history event signatures",()=>{
  const {envelope}=fixture();
  const tampered={
    ...envelope,
    history_snapshot:{
      ...envelope.history_snapshot,
      events:[{...envelope.history_snapshot.events[0],signature:envelope.history_snapshot.events[0].signature+"x"}]
    }
  };
  assert.notEqual(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(tampered),
    envelope.signature
  );
});

test("question 1073: envelope snapshot rejects tampered nested history event signature",()=>{
  const {events,snapshot}=fixture();
  const envelope={
    ...snapshot.envelope,
    history_snapshot:{
      ...snapshot.envelope.history_snapshot,
      events:[{...snapshot.envelope.history_snapshot.events[0],signature:snapshot.envelope.history_snapshot.events[0].signature+"x"}]
    }
  };
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid({...snapshot,envelope},events),
    false
  );
});
