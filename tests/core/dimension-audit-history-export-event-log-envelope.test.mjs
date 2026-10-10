import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 1034-1035: event-log envelope binds history and evidence snapshots",()=>{
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
  assert.equal(envelope.history_snapshot_valid,true);
  assert.equal(envelope.evidence_summary_snapshot_valid,true);
  assert.equal(envelope.signature,dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(envelope));
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope,events),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeValid({...envelope,signature:envelope.signature+"x"},events),false);
});
