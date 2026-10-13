import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature
} from "../../src/domain/measurements/audit-download.mjs";

test("question 1157: event-log envelope signature builder rejects non-canonical nested signature fields",()=>{
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
  assert.doesNotThrow(()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(envelope));
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature({
      ...envelope,
      history_snapshot:{...envelope.history_snapshot,signature:{toString:()=>envelope.history_snapshot.signature}}
    }),
    {name:"TypeError",message:"history export event-log envelope signature fields must be canonical"}
  );
});
