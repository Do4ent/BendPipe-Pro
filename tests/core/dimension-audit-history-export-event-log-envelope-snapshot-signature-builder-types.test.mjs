import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1162: event-log envelope snapshot signature builder rejects coercible fields",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot(events,"2026-10-09T00:00:01.000Z");
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  const snapshot=dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshot(envelope,events);
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature(snapshot));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSnapshotSignature({
      ...snapshot,
      envelope_signature:{toString:()=>snapshot.envelope_signature}
    }),
    {name:"TypeError",message:"history export event-log envelope snapshot signature fields must be canonical"}
  );
});
