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

test("question 1138: event-log envelope signature rejects coercible non-canonical nested fields",()=>{
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
  const malformed={
    ...envelope,
    history_snapshot:{...envelope.history_snapshot,event_count:{valueOf:()=>1}}
  };
  assert.throws(
    ()=>dimensionAuditDownloadHistoryExportEventLogEnvelopeSignature(malformed),
    {name:"TypeError",message:"history export event-log envelope signature fields must be canonical"}
  );
});

test("question 1159: envelope signature validator remains fail-closed if malformed input bypasses the builder",()=>{
  const malformed={
    schema:"TubeBender.DimensionAuditDownloadHistoryExportEventLogEnvelope.v1",
    history_snapshot:{signature:"h",events:[{signature:"e"}],event_count:{valueOf:()=>1}},
    evidence_summary_snapshot:{
      snapshot_signature:"es",
      summary_signature:"s",
      event_binding_signature:'["e"]',
      summary:{total:1}
    }
  };
  assert.equal(
    dimensionAuditDownloadHistoryExportEventLogEnvelopeSignatureValid("forged",malformed),
    false
  );
});
