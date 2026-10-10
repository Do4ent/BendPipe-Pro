import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1243: envelope snapshot signature validator binds to nested envelope signature",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",outcome:"blocked",code:"EMPTY",history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events,"2026-10-09T00:00:01.000Z");
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  const snapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);
  const impossible={...snapshot,envelope_signature:snapshot.envelope_signature+"x"};
  const forged=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(impossible);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignatureValid(forged,impossible),false);
});
