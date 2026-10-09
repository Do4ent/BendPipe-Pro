import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionAuditDownloadHistoryExportEvent,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature,
  dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid
} from "../../src/domain/measurements/audit-download.mjs";

test("questions 1020-1021: final-state evidence summary is deterministically signed",()=>{
  const event=buildDimensionAuditDownloadHistoryExportEvent({
    action:"copy",
    outcome:"blocked",
    code:"EMPTY",
    history_snapshot_signature:"h",
    final_state_signature:"s",
    final_state_snapshot_signature:"ss",
    generated_at:"2026-10-09T00:00:00.000Z"
  });
  const events=[event];
  const summary=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummary(events);
  const signature=dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignature(summary);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid(signature,summary,events),true);
  assert.equal(dimensionAuditDownloadHistoryExportEventFinalStateEvidenceSummarySignatureValid({toString:()=>signature},summary,events),false);
});
