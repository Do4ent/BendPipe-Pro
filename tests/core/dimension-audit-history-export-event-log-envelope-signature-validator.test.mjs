import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1128: event-log envelope signature validator accepts canonical envelope and rejects malformed/tampered input",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events,"2026-10-09T00:00:01.000Z");
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  const signature=dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(envelope);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid(signature,envelope),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid("",envelope),false);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid(signature,{...envelope,schema:"tampered"}),false);
});
