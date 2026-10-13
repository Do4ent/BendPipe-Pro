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

test("question 1070: envelope signature binds evidence event binding signature",()=>{
  const {envelope}=fixture();
  const tampered={
    ...envelope,
    evidence_summary_snapshot:{
      ...envelope.evidence_summary_snapshot,
      event_binding_signature:envelope.evidence_summary_snapshot.event_binding_signature+"x"
    }
  };
  assert.notEqual(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(tampered),
    envelope.signature
  );
});

test("question 1071: envelope snapshot rejects tampered evidence event binding signature",()=>{
  const {events,snapshot}=fixture();
  const envelope={
    ...snapshot.envelope,
    evidence_summary_snapshot:{
      ...snapshot.envelope.evidence_summary_snapshot,
      event_binding_signature:snapshot.envelope.evidence_summary_snapshot.event_binding_signature+"x"
    }
  };
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid({...snapshot,envelope},events),
    false
  );
});
