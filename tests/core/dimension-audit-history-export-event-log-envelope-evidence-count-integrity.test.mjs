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

test("question 1066: envelope signature binds nested evidence event count",()=>{
  const {envelope}=fixture();
  const tampered={
    ...envelope,
    evidence_summary_snapshot:{
      ...envelope.evidence_summary_snapshot,
      summary:{
        ...envelope.evidence_summary_snapshot.summary,
        total:envelope.evidence_summary_snapshot.summary.total+1
      }
    }
  };
  assert.notEqual(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(tampered),
    envelope.signature
  );
});

test("question 1067: envelope snapshot rejects tampered nested evidence event count",()=>{
  const {events,snapshot}=fixture();
  const envelope={
    ...snapshot.envelope,
    evidence_summary_snapshot:{
      ...snapshot.envelope.evidence_summary_snapshot,
      summary:{
        ...snapshot.envelope.evidence_summary_snapshot.summary,
        total:snapshot.envelope.evidence_summary_snapshot.summary.total+1
      }
    }
  };
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotValid({...snapshot,envelope},events),
    false
  );
});
