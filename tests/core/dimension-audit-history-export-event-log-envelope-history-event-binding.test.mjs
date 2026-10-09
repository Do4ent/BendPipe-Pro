import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventHistorySnapshot,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot,
  dimensionAuditDownloadHistoryExportEventLogEnvelope,
  dimensionAuditDownloadHistoryExportEventLogEnvelopeValid
} from "../../src/domain/measurements/audit-download.mjs";

function makeEvent(code,generated_at){
  return buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code,
    history_snapshot_signature:"h-"+code,
    final_state_signature:"fs-"+code,
    final_state_snapshot_signature:"fss-"+code,
    generated_at
  });
}

test("question 1068: envelope history snapshot event count must match current events",()=>{
  const eventA=makeEvent("EMPTY","2026-10-09T00:00:00.000Z");
  const eventB=makeEvent("UNTRUSTED","2026-10-09T00:00:01.000Z");
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot([eventA],"2026-10-09T00:00:02.000Z");
  const events=[eventA,eventB];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope,events),false);
});

test("question 1069: envelope history snapshot event order and signatures must match current events",()=>{
  const eventA=makeEvent("EMPTY","2026-10-09T00:00:00.000Z");
  const eventB=makeEvent("UNTRUSTED","2026-10-09T00:00:01.000Z");
  const history=dimensionAuditDownloadHistoryExportEventHistorySnapshot([eventA,eventB],"2026-10-09T00:00:02.000Z");
  const events=[eventB,eventA];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const evidence=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySnapshot(summary,events);
  const envelope=dimensionAuditDownloadHistoryExportEventLogEnvelope(history,evidence,events);
  assert.equal(dimensionAuditDownloadHistoryExportEventLogEnvelopeValid(envelope,events),false);
});
